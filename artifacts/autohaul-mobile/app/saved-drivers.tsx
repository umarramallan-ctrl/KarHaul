import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  Pressable, Platform, ActivityIndicator, Alert,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { getApiBaseUrl } from "@/lib/api";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/ThemeContext";

type SavedDriver = {
  id: string;
  driverId: string;
  note: string | null;
  createdAt: string;
  driver: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    averageRating: number;
    totalReviews: number;
    completedJobs: number;
    isVerified: boolean;
  } | null;
};

async function fetchSavedDrivers(token: string | null): Promise<{ savedDrivers: SavedDriver[] }> {
  const res = await fetch(`${getApiBaseUrl()}/saved-drivers`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load saved drivers");
  return res.json();
}

async function removeSavedDriver(savedId: string, token: string | null): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/saved-drivers/${savedId}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to remove driver");
}

function DriverCard({ item, onRemove }: { item: SavedDriver; onRemove: () => void }) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const driver = item.driver;
  const fullName = driver
    ? [driver.firstName, driver.lastName].filter(Boolean).join(" ") || "Driver"
    : "Unknown Driver";

  function confirmRemove() {
    Alert.alert(
      "Remove Driver",
      `Remove ${fullName} from your saved drivers?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: onRemove },
      ],
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: C.surface }]}>
      <View style={styles.cardMain}>
        <View style={[styles.avatar, { backgroundColor: "#EFF6FF" }]}>
          <Text style={[styles.avatarText, { color: C.primary }]}>
            {fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.driverName, { color: C.text }]}>{fullName}</Text>
            {driver?.isVerified && (
              <Feather name="check-circle" size={14} color={C.primary} />
            )}
          </View>
          <View style={styles.statsRow}>
            {driver && driver.averageRating > 0 ? (
              <View style={styles.stat}>
                <Feather name="star" size={12} color="#F59E0B" />
                <Text style={[styles.statText, { color: C.textSecondary }]}>
                  {driver.averageRating.toFixed(1)} ({driver.totalReviews})
                </Text>
              </View>
            ) : null}
            {driver && driver.completedJobs > 0 ? (
              <View style={styles.stat}>
                <Feather name="truck" size={12} color={C.textMuted} />
                <Text style={[styles.statText, { color: C.textSecondary }]}>
                  {driver.completedJobs} jobs
                </Text>
              </View>
            ) : null}
          </View>
          {item.note ? (
            <Text style={[styles.note, { color: C.textMuted }]} numberOfLines={2}>
              "{item.note}"
            </Text>
          ) : null}
        </View>
        <Pressable
          style={styles.removeBtn}
          onPress={confirmRemove}
          hitSlop={8}
        >
          <Feather name="trash-2" size={16} color="#EF4444" />
        </Pressable>
      </View>
      <Text style={[styles.savedDate, { color: C.textMuted }]}>
        Saved {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );
}

export default function SavedDriversScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const { isAuthenticated } = useAuth();
  const { getToken } = useClerkAuth();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["saved-drivers"],
    queryFn: async () => {
      const token = await getToken();
      return fetchSavedDrivers(token);
    },
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: async (savedId: string) => {
      const token = await getToken();
      return removeSavedDriver(savedId, token);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-drivers"] }),
    onError: () => Alert.alert("Error", "Failed to remove driver. Try again."),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const savedDrivers = data?.savedDrivers ?? [];

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Saved Drivers</Text>
        <View style={{ width: 38 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : savedDrivers.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: "#EFF6FF" }]}>
            <Feather name="heart" size={36} color={C.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>No saved drivers yet</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>
            Save drivers you trust from a shipment or booking to rebook them quickly.
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedDrivers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DriverCard
              item={item}
              onRemove={() => removeMutation.mutate(item.id)}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding + 80, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListHeaderComponent={
            <Text style={[styles.countLabel, { color: C.textMuted }]}>
              {savedDrivers.length} saved driver{savedDrivers.length !== 1 ? "s" : ""}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center" },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  countLabel: { fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 4 },
  card: {
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    borderWidth: 1, borderColor: "#F1F5F9",
  },
  cardMain: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 20 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  driverName: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 4 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  note: { fontFamily: "Inter_400Regular", fontSize: 12, fontStyle: "italic", marginTop: 4 },
  removeBtn: { padding: 4 },
  savedDate: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 10 },
});
