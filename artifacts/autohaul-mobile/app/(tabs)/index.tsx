import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  ActivityIndicator, RefreshControl, Platform, ScrollView
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listShipments } from "@workspace/api-client-react";
import ShipmentCard from "@/components/ShipmentCard";
import Colors from "@/constants/colors";
import { getApiBaseUrl } from "@/lib/api";

const TRANSPORT_TYPES = ["All", "open", "enclosed"];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

async function fetchDriverRoutes(params: Record<string, string>) {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== "All")));
  const res = await fetch(`${getApiBaseUrl()}/driver-routes?${q}`);
  return res.json();
}

function DriverRoutesPanel() {
  const C = Colors.light;
  const [transportFilter, setTransportFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["driver-routes-mobile", transportFilter],
    queryFn: () => fetchDriverRoutes({ transportType: transportFilter }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const routes = data?.routes || [];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      <View style={[styles.backhaulBanner, { backgroundColor: "#EFF6FF" }]}>
        <Feather name="navigation" size={16} color={C.primary} />
        <Text style={[styles.backhaulBannerText, { color: C.primary }]}>
          Drivers post their routes — shippers match loads to trucks already heading their way.
        </Text>
      </View>

      <FlatList
        horizontal
        data={TRANSPORT_TYPES}
        keyExtractor={(i) => i}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={[styles.filterList, { paddingHorizontal: 16 }]}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setTransportFilter(item)}
            style={[styles.filterChip, { borderColor: transportFilter === item ? C.primary : C.border }, transportFilter === item && { backgroundColor: C.primary }]}
          >
            <Text style={[styles.filterChipText, { color: transportFilter === item ? "#fff" : C.textSecondary }]}>
              {item === "All" ? "All Types" : item === "open" ? "Open" : "Enclosed"}
            </Text>
          </Pressable>
        )}
      />

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : routes.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="map" size={40} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No routes posted yet</Text>
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>Drivers will post their planned routes here.</Text>
        </View>
      ) : (
        routes.map((route: any) => (
          <View key={route.id} style={[styles.routeCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.routeRoute}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: C.primary }]} />
                <Text style={[styles.routeCity, { color: C.text }]}>{route.originCity}, {route.originState}</Text>
              </View>
              <View style={[styles.routeLine, { backgroundColor: C.border }]} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: "#EF4444" }]} />
                <Text style={[styles.routeCity, { color: C.text }]}>{route.destinationCity}, {route.destinationState}</Text>
              </View>
            </View>

            <View style={styles.routeMeta}>
              <View style={[styles.tag, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="calendar" size={12} color={C.primary} />
                <Text style={[styles.tagText, { color: C.primary }]}>{route.departureDateFrom}</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: "#F0FDF4" }]}>
                <Feather name="users" size={12} color="#16A34A" />
                <Text style={[styles.tagText, { color: "#16A34A" }]}>{route.availableSpots} spot{route.availableSpots !== 1 ? "s" : ""} open</Text>
              </View>
              {route.pricePerVehicle && (
                <View style={[styles.tag, { backgroundColor: "#FEFCE8" }]}>
                  <Text style={[styles.tagText, { color: "#A16207", fontFamily: "Inter_600SemiBold" }]}>${route.pricePerVehicle.toLocaleString()}/car</Text>
                </View>
              )}
            </View>

            {route.driver && (
              <View style={styles.driverRow}>
                <View style={[styles.driverAvatar, { backgroundColor: C.primary }]}>
                  <Text style={styles.driverInitial}>{(route.driver.firstName || "D").charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={[styles.driverName, { color: C.text }]}>
                      {[route.driver.firstName, route.driver.lastName].filter(Boolean).join(" ") || "Driver"}
                    </Text>
                    {route.driver.isVerified && <Feather name="shield" size={12} color="#10B981" />}
                  </View>
                  {route.driver.averageRating > 0 && (
                    <Text style={[styles.driverRating, { color: C.textSecondary }]}>
                      ★ {route.driver.averageRating.toFixed(1)} ({route.driver.totalReviews} reviews)
                    </Text>
                  )}
                </View>
                <View style={[styles.contactBadge, { borderColor: C.primary }]}>
                  <Text style={[styles.contactBadgeText, { color: C.primary }]}>Contact</Text>
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

export default function BrowseScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const [activeTab, setActiveTab] = useState<"loads" | "routes">("loads");
  const [search, setSearch] = useState("");
  const [transportFilter, setTransportFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["shipments", "open", transportFilter],
    queryFn: () => listShipments({ status: "open", transportType: transportFilter !== "All" ? transportFilter : undefined }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const shipments = data?.shipments || [];
  const filtered = search
    ? shipments.filter((s) => {
        const q = search.toLowerCase();
        return (
          `${s.vehicleYear} ${s.vehicleMake} ${s.vehicleModel}`.toLowerCase().includes(q) ||
          s.originState.toLowerCase().includes(q) ||
          s.destinationState.toLowerCase().includes(q) ||
          s.originCity.toLowerCase().includes(q) ||
          s.destinationCity.toLowerCase().includes(q)
        );
      })
    : shipments;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Browse</Text>

        <View style={[styles.tabSwitcher, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Pressable
            style={[styles.tabBtn, activeTab === "loads" && { backgroundColor: C.primary }]}
            onPress={() => setActiveTab("loads")}
          >
            <Feather name="package" size={13} color={activeTab === "loads" ? "#fff" : C.textSecondary} />
            <Text style={[styles.tabBtnText, { color: activeTab === "loads" ? "#fff" : C.textSecondary }]}>Open Loads</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === "routes" && { backgroundColor: C.primary }]}
            onPress={() => setActiveTab("routes")}
          >
            <Feather name="navigation" size={13} color={activeTab === "routes" ? "#fff" : C.textSecondary} />
            <Text style={[styles.tabBtnText, { color: activeTab === "routes" ? "#fff" : C.textSecondary }]}>Backhaul Finder</Text>
          </Pressable>
        </View>

        {activeTab === "loads" && (
          <>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>{filtered.length} available shipments</Text>
            <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="search" size={16} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.text, fontFamily: "Inter_400Regular" }]}
                placeholder="Search by vehicle, city, state..."
                placeholderTextColor={C.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search ? <Pressable onPress={() => setSearch("")}><Feather name="x-circle" size={16} color={C.textMuted} /></Pressable> : null}
            </View>
            <FlatList
              horizontal
              data={TRANSPORT_TYPES}
              keyExtractor={(i) => i}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setTransportFilter(item)}
                  style={[styles.filterChip, { borderColor: transportFilter === item ? C.primary : C.border }, transportFilter === item && { backgroundColor: C.primary }]}
                >
                  <Text style={[styles.filterChipText, { color: transportFilter === item ? "#fff" : C.textSecondary }]}>
                    {item === "All" ? "All Types" : item === "open" ? "Open" : "Enclosed"}
                  </Text>
                </Pressable>
              )}
            />
          </>
        )}
      </View>

      {activeTab === "loads" ? (
        isLoading ? (
          <View style={styles.centered}><ActivityIndicator color={C.primary} size="large" /></View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Feather name="inbox" size={48} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>No loads found</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>Try adjusting your filters or check back later</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 100 }}
            renderItem={({ item }) => (
              <ShipmentCard shipment={item} onPress={() => router.push({ pathname: "/shipment/[id]", params: { id: item.id } })} />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          />
        )
      ) : (
        <DriverRoutesPanel />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 6 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 12 },
  tabSwitcher: {
    flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 12, gap: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 8, borderRadius: 9,
  },
  tabBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterList: { paddingVertical: 4, gap: 8, paddingRight: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  backhaulBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    margin: 16, padding: 14, borderRadius: 12,
  },
  backhaulBannerText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 18 },
  routeCard: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1,
    padding: 16, gap: 10,
  },
  routeRoute: { gap: 2 },
  routePoint: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, height: 14, marginLeft: 4 },
  routeCity: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  routeMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  driverAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  driverInitial: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  driverName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  driverRating: { fontFamily: "Inter_400Regular", fontSize: 12 },
  contactBadge: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  contactBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
