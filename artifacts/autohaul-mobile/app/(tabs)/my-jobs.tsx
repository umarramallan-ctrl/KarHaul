import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Platform, ActivityIndicator
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listBookings, getMyBids } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";

function BookingCard({ booking, onPress }: { booking: any; onPress: () => void }) {
  const C = Colors.light;
  const statusColors: Record<string, { bg: string; text: string }> = {
    confirmed: { bg: "#DBEAFE", text: "#1D4ED8" },
    picked_up: { bg: "#FEF9C3", text: "#A16207" },
    in_transit: { bg: "#E0E7FF", text: "#4338CA" },
    delivered: { bg: "#D1FAE5", text: "#065F46" },
    cancelled: { bg: "#FEE2E2", text: "#991B1B" },
    disputed: { bg: "#FEE2E2", text: "#991B1B" },
  };
  const sc = statusColors[booking.status] || statusColors.confirmed;
  const shipment = booking.shipment;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.vehicleName, { color: C.text }]} numberOfLines={1}>
          {shipment ? `${shipment.vehicleYear} ${shipment.vehicleMake} ${shipment.vehicleModel}` : "Shipment"}
        </Text>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.badgeText, { color: sc.text }]}>{booking.status.replace("_", " ")}</Text>
        </View>
      </View>
      {shipment && (
        <Text style={[styles.routeText, { color: C.textSecondary }]}>
          {shipment.originCity}, {shipment.originState} → {shipment.destinationCity}, {shipment.destinationState}
        </Text>
      )}
      <View style={styles.priceRow}>
        <Feather name="dollar-sign" size={14} color={C.success} />
        <Text style={[styles.price, { color: C.success }]}>${booking.agreedPrice?.toLocaleString()}</Text>
        <Text style={[styles.priceLabel, { color: C.textMuted }]}>agreed price</Text>
      </View>
    </Pressable>
  );
}

export default function MyJobsScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"bookings" | "bids">("bookings");

  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: listBookings,
    enabled: isAuthenticated,
  });
  const { data: bidsData, isLoading: bidsLoading, refetch: refetchBids } = useQuery({
    queryKey: ["my-bids"],
    queryFn: getMyBids,
    enabled: isAuthenticated,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchBookings(), refetchBids()]);
    setRefreshing(false);
  }, []);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const isLoading = tab === "bookings" ? bookingsLoading : bidsLoading;
  const bookings = (bookingsData?.bookings || []).filter(b => (b as any).driverId);
  const bids = bidsData?.bids || [];

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <Text style={[styles.headerTitle, { color: C.text }]}>My Jobs</Text>
        </View>
        <View style={styles.centered}>
          <Feather name="lock" size={48} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>Sign in to see your jobs</Text>
          <Pressable style={[styles.ctaBtn, { backgroundColor: C.primary }]} onPress={() => router.push("/auth")}>
            <Text style={styles.ctaBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>My Jobs</Text>
        <View style={[styles.tabs, { backgroundColor: C.border }]}>
          {(["bookings", "bids"] as const).map((t) => (
            <Pressable
              key={t}
              style={[styles.tabBtn, tab === t && { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabBtnText, { color: tab === t ? C.text : C.textSecondary }]}>
                {t === "bookings" ? "Active Jobs" : "My Bids"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : tab === "bookings" ? (
        bookings.length === 0 ? (
          <View style={styles.centered}>
            <Feather name="briefcase" size={48} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>No active jobs</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>Browse loads and place bids to get your first job</Text>
            <Pressable style={[styles.ctaBtn, { backgroundColor: C.primary }]} onPress={() => router.push("/(tabs)")}>
              <Text style={styles.ctaBtnText}>Browse Loads</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(b) => b.id}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 100 }}
            renderItem={({ item }) => (
              <BookingCard booking={item} onPress={() => router.push({ pathname: "/booking/[id]", params: { id: item.id } })} />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          />
        )
      ) : (
        bids.length === 0 ? (
          <View style={styles.centered}>
            <Feather name="tag" size={48} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>No bids placed yet</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>Find loads and submit competitive bids</Text>
          </View>
        ) : (
          <FlatList
            data={bids}
            keyExtractor={(b) => b.id}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 100 }}
            renderItem={({ item }) => {
              const statusColors: Record<string, { bg: string; text: string }> = {
                pending: { bg: "#DBEAFE", text: "#1D4ED8" },
                accepted: { bg: "#D1FAE5", text: "#065F46" },
                rejected: { bg: "#FEE2E2", text: "#991B1B" },
                withdrawn: { bg: "#F1F5F9", text: "#64748B" },
              };
              const sc = statusColors[(item as any).status] || statusColors.pending;
              const shipment = (item as any).shipment;
              return (
                <Pressable
                  style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
                  onPress={() => shipment && router.push({ pathname: "/shipment/[id]", params: { id: shipment.id } })}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.vehicleName, { color: Colors.light.text }]} numberOfLines={1}>
                      {shipment ? `${shipment.vehicleYear} ${shipment.vehicleMake} ${shipment.vehicleModel}` : "Shipment"}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.badgeText, { color: sc.text }]}>{(item as any).status}</Text>
                    </View>
                  </View>
                  {shipment && (
                    <Text style={[styles.routeText, { color: Colors.light.textSecondary }]}>
                      {shipment.originCity}, {shipment.originState} → {shipment.destinationCity}, {shipment.destinationState}
                    </Text>
                  )}
                  <View style={styles.priceRow}>
                    <Feather name="dollar-sign" size={14} color={Colors.light.success} />
                    <Text style={[styles.price, { color: Colors.light.success }]}>${(item as any).amount?.toLocaleString()}</Text>
                    <Text style={[styles.priceLabel, { color: Colors.light.textMuted }]}>your bid</Text>
                  </View>
                </Pressable>
              );
            }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 12 },
  tabs: { flexDirection: "row", borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  tabBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, marginHorizontal: 16, marginBottom: 12,
    padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#F1F5F9",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  vehicleName: { fontFamily: "Inter_600SemiBold", fontSize: 16, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  routeText: { fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 8 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  price: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  priceLabel: { fontFamily: "Inter_400Regular", fontSize: 13 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  ctaBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  ctaBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
