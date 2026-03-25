import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  ActivityIndicator, RefreshControl, Platform
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listShipments } from "@workspace/api-client-react";
import ShipmentCard from "@/components/ShipmentCard";
import Colors from "@/constants/colors";

const TRANSPORT_TYPES = ["All", "open", "enclosed"];
const VEHICLE_TYPES = ["All", "sedan", "suv", "truck", "van", "motorcycle", "rv", "exotic", "other"];

export default function BrowseScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const [search, setSearch] = useState("");
  const [transportFilter, setTransportFilter] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["shipments", "open", transportFilter, vehicleFilter],
    queryFn: () =>
      listShipments({
        status: "open",
        transportType: transportFilter !== "All" ? transportFilter : undefined,
        vehicleType: vehicleFilter !== "All" ? vehicleFilter : undefined,
      }),
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
        <Text style={[styles.headerTitle, { color: C.text }]}>Browse Loads</Text>
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
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x-circle" size={16} color={C.textMuted} />
            </Pressable>
          ) : null}
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
              style={[
                styles.filterChip,
                { borderColor: transportFilter === item ? C.primary : C.border },
                transportFilter === item && { backgroundColor: C.primary },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: transportFilter === item ? "#fff" : C.textSecondary },
                ]}
              >
                {item === "All" ? "All Types" : item === "open" ? "Open" : "Enclosed"}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} size="large" />
        </View>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 2 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 12 },
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
});
