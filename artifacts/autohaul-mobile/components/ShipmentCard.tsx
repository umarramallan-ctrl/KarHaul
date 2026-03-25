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

const STATUS_META: Record<string, { bg: string; text: string; label: string; accent: string }> = {
  open:       { bg: "#DBEAFE", text: "#1D4ED8", label: "Open",       accent: "#1A56DB" },
  assigned:   { bg: "#FEF9C3", text: "#A16207", label: "Assigned",   accent: "#F59E0B" },
  in_transit: { bg: "#E0F2FE", text: "#0369A1", label: "In Transit", accent: "#0EA5E9" },
  delivered:  { bg: "#D1FAE5", text: "#065F46", label: "Delivered",  accent: "#10B981" },
  cancelled:  { bg: "#FEE2E2", text: "#991B1B", label: "Cancelled",  accent: "#EF4444" },
};

export default function ShipmentCard({ shipment, onPress }: { shipment: Shipment; onPress: () => void }) {
  const C = Colors.light;
  const vehicleName = `${shipment.vehicleYear} ${shipment.vehicleMake} ${shipment.vehicleModel}`;
  const meta = STATUS_META[shipment.status] || STATUS_META.open;

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
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.93 : 1, borderLeftColor: meta.accent }]}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.vehicleName, { color: C.text }]} numberOfLines={1}>{vehicleName}</Text>
          <View style={styles.typeRow}>
            <View style={[styles.typeChip, { backgroundColor: "#EFF6FF" }]}>
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
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: C.primary }]} />
          <View>
            <Text style={[styles.cityLabel, { color: C.textMuted }]}>PICKUP</Text>
            <Text style={[styles.cityText, { color: C.text }]}>{shipment.originCity}, {shipment.originState}</Text>
          </View>
        </View>
        <View style={styles.routeLineWrap}>
          <View style={[styles.routeLine, { backgroundColor: C.border }]} />
          <View style={[styles.arrowDot, { backgroundColor: meta.accent + "22", borderColor: meta.accent }]}>
            <Feather name="arrow-right" size={10} color={meta.accent} />
          </View>
          <View style={[styles.routeLine, { backgroundColor: C.border }]} />
        </View>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: "#EF4444" }]} />
          <View>
            <Text style={[styles.cityLabel, { color: C.textMuted }]}>DELIVERY</Text>
            <Text style={[styles.cityText, { color: C.text }]}>{shipment.destinationCity}, {shipment.destinationState}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: C.borderLight }]}>
        {budgetText ? (
          <View style={[styles.footerPill, { backgroundColor: "#D1FAE5" }]}>
            <Feather name="dollar-sign" size={13} color="#065F46" />
            <Text style={[styles.footerPillText, { color: "#065F46" }]}>{budgetText}</Text>
          </View>
        ) : (
          <View style={[styles.footerPill, { backgroundColor: "#F1F5F9" }]}>
            <Text style={[styles.footerPillText, { color: C.textMuted }]}>No budget listed</Text>
          </View>
        )}
        {shipment.bidCount !== undefined && (
          <View style={[styles.footerPill, { backgroundColor: "#F1F5F9" }]}>
            <Feather name="tag" size={12} color={C.textSecondary} />
            <Text style={[styles.footerPillText, { color: C.textSecondary }]}>{shipment.bidCount} bid{shipment.bidCount !== 1 ? "s" : ""}</Text>
          </View>
        )}
        {shipment.pickupDateFrom && (
          <View style={[styles.footerPill, { backgroundColor: "#F1F5F9" }]}>
            <Feather name="calendar" size={12} color={C.textSecondary} />
            <Text style={[styles.footerPillText, { color: C.textSecondary }]}>{shipment.pickupDateFrom}</Text>
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
    shadowColor: "#1A56DB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#EFF0F6",
    borderLeftWidth: 4,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  headerLeft: { flex: 1, marginRight: 12 },
  vehicleName: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 6 },
  typeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeChipText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  routeContainer: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  routePoint: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  cityLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, letterSpacing: 0.5, marginBottom: 1 },
  cityText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  routeLineWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  routeLine: { width: 14, height: 1 },
  arrowDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  footer: { flexDirection: "row", gap: 8, flexWrap: "wrap", borderTopWidth: 1, paddingTop: 12 },
  footerPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  footerPillText: { fontFamily: "Inter_500Medium", fontSize: 12 },
});
