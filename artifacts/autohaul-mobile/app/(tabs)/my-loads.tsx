import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Platform, ActivityIndicator
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMyShipments } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import ShipmentCard from "@/components/ShipmentCard";
import Colors from "@/constants/colors";

export default function MyLoadsScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-shipments"],
    queryFn: getMyShipments,
    enabled: isAuthenticated,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <Text style={[styles.headerTitle, { color: C.text }]}>My Loads</Text>
        </View>
        <View style={styles.centered}>
          <Feather name="lock" size={48} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>Sign in required</Text>
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>Please sign in to view your shipment listings</Text>
          <Pressable style={[styles.ctaBtn, { backgroundColor: C.primary }]} onPress={() => router.push("/auth")}>
            <Text style={styles.ctaBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const shipments = data?.shipments || [];

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: C.text }]}>My Loads</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>Your posted shipments</Text>
          </View>
          <Pressable
            style={[styles.postBtn, { backgroundColor: C.primary }]}
            onPress={() => router.push("/create-shipment")}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.postBtnText}>Post Load</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
      ) : shipments.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="package" size={48} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No loads posted yet</Text>
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>Post a vehicle shipment and get direct bids from drivers</Text>
          <Pressable style={[styles.ctaBtn, { backgroundColor: C.primary }]} onPress={() => router.push("/create-shipment")}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.ctaBtnText}>Post Your First Load</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={shipments}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 100 }}
          renderItem={({ item }) => (
            <ShipmentCard
              shipment={item}
              onPress={() => router.push({ pathname: "/shipment/[id]", params: { id: item.id } })}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 28 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  postBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  postBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  ctaBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  ctaBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
