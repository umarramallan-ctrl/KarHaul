import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  ActivityIndicator, RefreshControl, Platform, ScrollView
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listShipments } from "@workspace/api-client-react";
import ShipmentCard from "@/components/ShipmentCard";
import Colors from "@/constants/colors";
import { getApiBaseUrl } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";

const TRANSPORT_TYPES = ["All", "open", "enclosed"];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

async function fetchDriverRoutes(params: Record<string, string>) {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== "All")));
  const res = await fetch(`${getApiBaseUrl()}/driver-routes?${q}`);
  return res.json();
}

function DriverRoutesPanel() {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
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

const THEME_CYCLE = { light: "dark", dark: "system", system: "light" } as const;
const THEME_ICON  = { light: "sun",  dark: "moon",  system: "smartphone" } as const;

export default function BrowseScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme, theme, setTheme } = useTheme();
  const C = Colors[colorScheme];
  const [activeTab, setActiveTab] = useState<"loads" | "routes">("loads");
  const [search, setSearch] = useState("");
  const [transportFilter, setTransportFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["shipments", "open", transportFilter],
    queryFn: () => listShipments({ status: "open", transportType: transportFilter !== "All" ? (transportFilter as any) : undefined }),
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
      <LinearGradient
        colors={["#1A56DB", "#1E40AF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPadding + 16 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerBrand}>KarHaul</Text>
            <Text style={styles.headerTitle}>Load Board</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {activeTab === "loads" && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filtered.length} open</Text>
              </View>
            )}
            <Pressable
              onPress={() => setTheme(THEME_CYCLE[theme])}
              style={styles.themeToggleBtn}
              hitSlop={8}
            >
              <Feather name={THEME_ICON[theme] as any} size={18} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>
        </View>

        <View style={styles.tabSwitcher}>
          <Pressable
            style={[styles.tabBtn, activeTab === "loads" && styles.tabBtnActive]}
            onPress={() => setActiveTab("loads")}
          >
            <Feather name="package" size={13} color={activeTab === "loads" ? "#1A56DB" : "rgba(255,255,255,0.75)"} />
            <Text style={[styles.tabBtnText, { color: activeTab === "loads" ? "#1A56DB" : "rgba(255,255,255,0.75)" }]}>Open Loads</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === "routes" && styles.tabBtnActive]}
            onPress={() => setActiveTab("routes")}
          >
            <Feather name="navigation" size={13} color={activeTab === "routes" ? "#1A56DB" : "rgba(255,255,255,0.75)"} />
            <Text style={[styles.tabBtnText, { color: activeTab === "routes" ? "#1A56DB" : "rgba(255,255,255,0.75)" }]}>Backhaul Finder</Text>
          </Pressable>
        </View>

        {activeTab === "loads" && (
          <>
            <View style={styles.searchBar}>
              <Feather name="search" size={16} color="rgba(255,255,255,0.6)" />
              <TextInput
                style={[styles.searchInput, { fontFamily: "Inter_400Regular" }]}
                placeholder="Search vehicle, city, or state..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={search}
                onChangeText={setSearch}
              />
              {search ? <Pressable onPress={() => setSearch("")}><Feather name="x-circle" size={16} color="rgba(255,255,255,0.6)" /></Pressable> : null}
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
                  style={[styles.filterChip, transportFilter === item ? styles.filterChipActive : styles.filterChipInactive]}
                >
                  <Text style={[styles.filterChipText, { color: transportFilter === item ? "#1A56DB" : "rgba(255,255,255,0.8)" }]}>
                    {item === "All" ? "All Types" : item === "open" ? "Open Carrier" : "Enclosed"}
                  </Text>
                </Pressable>
              )}
            />
          </>
        )}
      </LinearGradient>

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
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 },
  headerBrand: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.65)", letterSpacing: 1, textTransform: "uppercase" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  countBadge: { backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  countBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  themeToggleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  tabSwitcher: {
    flexDirection: "row", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", padding: 4, marginBottom: 14, gap: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, borderRadius: 9,
  },
  tabBtnActive: { backgroundColor: "rgba(255,255,255,0.95)" },
  tabBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#fff" },
  filterList: { paddingVertical: 4, gap: 8, paddingRight: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterChipActive: { backgroundColor: "rgba(255,255,255,0.95)" },
  filterChipInactive: { backgroundColor: "rgba(255,255,255,0.15)" },
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
