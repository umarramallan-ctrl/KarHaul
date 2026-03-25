import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type Shipment = {
  id: string;
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  vehicleType: string;
  vehicleCondition: string;
  transportType: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  budgetMin?: number;
  budgetMax?: number;
  status: string;
  bidCount?: number;
  pickupDateFrom?: string;
  shipper?: { firstName?: string; lastName?: string; averageRating?: number; isVerified?: boolean };
};

function StatusBadge({ status }: { status: string }) {
  const C = Colors.light;
  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: C.statusOpen, text: C.statusOpenText, label: "Open" },
    assigned: { bg: C.statusAssigned, text: C.statusAssignedText, label: "Assigned" },
    in_transit: { bg: C.statusInTransit, text: C.statusInTransitText, label: "In Transit" },
    delivered: { bg: C.statusDelivered, text: C.statusDeliveredText, label: "Delivered" },
    cancelled: { bg: C.statusCancelled, text: C.statusCancelledText, label: "Cancelled" },
  };
  const s = statusMap[status] || statusMap.open;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

export default function ShipmentCard({ shipment, onPress }: { shipment: Shipment; onPress: () => void }) {
  const C = Colors.light;
  const vehicleName = `${shipment.vehicleYear} ${shipment.vehicleMake} ${shipment.vehicleModel}`;
  const route = `${shipment.originCity}, ${shipment.originState} → ${shipment.destinationCity}, ${shipment.destinationState}`;

  let budgetText = "";
  if (shipment.budgetMin && shipment.budgetMax) {
    budgetText = `$${shipment.budgetMin.toLocaleString()} – $${shipment.budgetMax.toLocaleString()}`;
  } else if (shipment.budgetMax) {
    budgetText = `Up to $${shipment.budgetMax.toLocaleString()}`;
  } else if (shipment.budgetMin) {
    budgetText = `From $${shipment.budgetMin.toLocaleString()}`;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.vehicleName, { color: C.text }]} numberOfLines={1}>{vehicleName}</Text>
          <View style={styles.typeRow}>
            <View style={styles.typeChip}>
              <Feather name="truck" size={11} color={C.primary} />
              <Text style={[styles.typeChipText, { color: C.primary }]}>{shipment.transportType === "enclosed" ? "Enclosed" : "Open"}</Text>
            </View>
            <View style={[styles.typeChip, { backgroundColor: "#F3F4F6" }]}>
              <Text style={[styles.typeChipText, { color: C.textSecondary }]}>{shipment.vehicleType}</Text>
            </View>
            {shipment.vehicleCondition === "non_running" && (
              <View style={[styles.typeChip, { backgroundColor: "#FEF9C3" }]}>
                <Text style={[styles.typeChipText, { color: "#A16207" }]}>Non-Running</Text>
              </View>
            )}
          </View>
        </View>
        <StatusBadge status={shipment.status} />
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: C.primary }]} />
          <Text style={[styles.cityText, { color: C.text }]}>{shipment.originCity}, {shipment.originState}</Text>
        </View>
        <View style={[styles.routeLine, { backgroundColor: C.border }]} />
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: C.danger }]} />
          <Text style={[styles.cityText, { color: C.text }]}>{shipment.destinationCity}, {shipment.destinationState}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Feather name="dollar-sign" size={14} color={C.success} />
          <Text style={[styles.footerText, { color: budgetText ? C.success : C.textMuted, fontFamily: "Inter_600SemiBold" }]}>
            {budgetText || "No budget listed"}
          </Text>
        </View>
        {(shipment.bidCount !== undefined) && (
          <View style={styles.footerItem}>
            <Feather name="tag" size={13} color={C.textSecondary} />
            <Text style={[styles.footerText, { color: C.textSecondary }]}>{shipment.bidCount} bid{shipment.bidCount !== 1 ? "s" : ""}</Text>
          </View>
        )}
        {shipment.pickupDateFrom && (
          <View style={styles.footerItem}>
            <Feather name="calendar" size={13} color={C.textSecondary} />
            <Text style={[styles.footerText, { color: C.textSecondary }]}>{shipment.pickupDateFrom}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  headerLeft: { flex: 1, marginRight: 12 },
  vehicleName: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 6 },
  typeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeChipText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  routeRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  routePoint: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 1, height: 20 },
  cityText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  footer: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 13 },
});
