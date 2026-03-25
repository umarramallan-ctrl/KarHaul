import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBooking, updateBookingStatus, getMyProfile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";

const STATUS_STEPS = ["confirmed", "picked_up", "in_transit", "delivered"];
const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => getBooking({ bookingId: id! }),
  });
  const { data: myProfile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateBookingStatus({ bookingId: id! }, { status: status as any }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading || !booking) {
    return <View style={[styles.centered, { backgroundColor: C.background }]}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  const isDriver = myProfile && (myProfile as any).id === (booking as any).driverId;
  const currentStepIdx = STATUS_STEPS.indexOf((booking as any).status);
  const shipment = (booking as any).shipment;
  const driver = (booking as any).driver;
  const shipper = (booking as any).shipper;

  const nextStatus: Record<string, string> = { confirmed: "picked_up", picked_up: "in_transit", in_transit: "delivered" };
  const nextStatusLabel: Record<string, string> = { confirmed: "Mark as Picked Up", picked_up: "Mark as In Transit", in_transit: "Mark as Delivered" };
  const nextSt = nextStatus[(booking as any).status];

  const handleStatusUpdate = () => {
    if (!nextSt) return;
    Alert.alert(
      nextStatusLabel[(booking as any).status],
      "Are you sure you want to update the status?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => statusMutation.mutate(nextSt) },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: "#fff" }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={C.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>Booking Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPadding + 100 }}>
        <View style={[styles.priceCard, { backgroundColor: C.primary }]}>
          <Text style={styles.priceLabel}>Agreed Price</Text>
          <Text style={styles.priceAmount}>${(booking as any).agreedPrice?.toLocaleString()}</Text>
          <Text style={styles.priceNote}>Payment arranged directly between shipper and driver</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Status Timeline</Text>
          <View style={[styles.card, { backgroundColor: "#fff" }]}>
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStepIdx;
              const current = i === currentStepIdx;
              return (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View style={[styles.stepDot, { backgroundColor: done ? C.primary : C.border }]}>
                      {done && <Feather name="check" size={12} color="#fff" />}
                    </View>
                    {i < STATUS_STEPS.length - 1 && <View style={[styles.stepLine, { backgroundColor: i < currentStepIdx ? C.primary : C.border }]} />}
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepLabel, { color: done ? C.text : C.textMuted, fontFamily: current ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                      {STATUS_LABELS[step]}
                    </Text>
                    {current && <View style={[styles.currentBadge, { backgroundColor: "#EFF6FF" }]}><Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: C.primary }}>CURRENT</Text></View>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {shipment && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Vehicle</Text>
            <View style={[styles.card, { backgroundColor: "#fff" }]}>
              <Text style={[styles.vehicleName, { color: C.text }]}>{shipment.vehicleYear} {shipment.vehicleMake} {shipment.vehicleModel}</Text>
              <Text style={[styles.route, { color: C.textSecondary }]}>
                {shipment.originCity}, {shipment.originState} → {shipment.destinationCity}, {shipment.destinationState}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Parties</Text>
          <View style={[styles.card, { backgroundColor: "#fff" }]}>
            {[{ label: "Driver", user: driver }, { label: "Shipper", user: shipper }].map(({ label, user }) => (
              <View key={label} style={styles.partyRow}>
                <View style={[styles.partyAvatar, { backgroundColor: C.primary }]}>
                  <Text style={styles.partyAvatarText}>{((user?.firstName || "U").charAt(0))}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.partyRole, { color: C.textMuted }]}>{label}</Text>
                  <Text style={[styles.partyName, { color: C.text }]}>{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || label}</Text>
                </View>
                <Pressable
                  onPress={() => router.push({ pathname: "/messages/[conversationId]", params: { conversationId: "new", recipientId: (booking as any)[`${label.toLowerCase()}Id`], name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") } })}
                >
                  <Feather name="message-circle" size={22} color={C.primary} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {isDriver && nextSt && (booking as any).status !== "delivered" && (
        <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 8 }]}>
          <Pressable
            style={[styles.updateBtn, { backgroundColor: C.primary, opacity: statusMutation.isPending ? 0.7 : 1 }]}
            onPress={handleStatusUpdate}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text style={styles.updateBtnText}>{nextStatusLabel[(booking as any).status]}</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  title: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 17, textAlign: "center" },
  priceCard: { marginHorizontal: 16, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 16 },
  priceLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  priceAmount: { fontFamily: "Inter_700Bold", fontSize: 40, color: "#fff" },
  priceNote: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 6, textAlign: "center" },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 8 },
  card: { borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  stepRow: { flexDirection: "row", gap: 14, marginBottom: 0 },
  stepLeft: { alignItems: "center", width: 24 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 4 },
  stepContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  stepLabel: { fontSize: 15 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  vehicleName: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 4 },
  route: { fontFamily: "Inter_400Regular", fontSize: 14 },
  partyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  partyAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  partyAvatarText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  partyRole: { fontFamily: "Inter_400Regular", fontSize: 12 },
  partyName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  updateBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  updateBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
