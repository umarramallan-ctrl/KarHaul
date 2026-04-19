import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Alert, TextInput, ActivityIndicator, Modal
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getShipment, getShipmentBids, placeBid, acceptBid, getMyProfile, counterBid, acceptCounterBid, declineCounterBid } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";

function InfoRow({ label, value }: { label: string; value: string }) {
  const C = Colors.light;
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: C.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: C.text }]}>{value}</Text>
    </View>
  );
}

export default function ShipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterBidId, setCounterBidId] = useState<string | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState("");

  const { data: shipment, isLoading } = useQuery({ queryKey: ["shipment", id], queryFn: () => getShipment(id!) });
  const { data: bidsData } = useQuery({ queryKey: ["shipment-bids", id], queryFn: () => getShipmentBids(id!) });
  const { data: myProfile } = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile, enabled: isAuthenticated });

  const bidMutation = useMutation({
    mutationFn: (data: { amount: number; note?: string }) =>
      placeBid(id!, { amount: data.amount, note: data.note }),
    onSuccess: () => {
      setShowBidModal(false);
      setBidAmount("");
      setBidNote("");
      qc.invalidateQueries({ queryKey: ["shipment-bids", id] });
      Alert.alert("Bid Placed!", "Your bid has been submitted to the shipper.");
    },
    onError: () => Alert.alert("Error", "Could not place bid. Please try again."),
  });

  const acceptMutation = useMutation({
    mutationFn: (bidId: string) => acceptBid(bidId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipment", id] });
      qc.invalidateQueries({ queryKey: ["shipment-bids", id] });
      Alert.alert("Bid Accepted!", "A booking has been created. Check 'My Jobs' for details.");
    },
  });

  const counterMutation = useMutation({
    mutationFn: ({ bidId, price }: { bidId: string; price: number }) =>
      counterBid(bidId, { counterPrice: price }),
    onSuccess: () => {
      setShowCounterModal(false);
      setCounterPriceInput("");
      qc.invalidateQueries({ queryKey: ["shipment-bids", id] });
      Alert.alert("Counter-Offer Sent", "The driver has been notified of your counter-offer.");
    },
    onError: () => Alert.alert("Error", "Could not send counter-offer. Please try again."),
  });

  const acceptCounterMutation = useMutation({
    mutationFn: (bidId: string) => acceptCounterBid(bidId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipment", id] });
      qc.invalidateQueries({ queryKey: ["shipment-bids", id] });
      Alert.alert("Counter-Offer Accepted!", "A booking has been created at the counter price. Check 'My Jobs'.");
    },
    onError: () => Alert.alert("Error", "Could not accept counter-offer."),
  });

  const declineCounterMutation = useMutation({
    mutationFn: (bidId: string) => declineCounterBid(bidId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipment-bids", id] });
      Alert.alert("Counter-Offer Declined", "The shipper has been notified.");
    },
    onError: () => Alert.alert("Error", "Could not decline counter-offer."),
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading || !shipment) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const isMyShipment = myProfile && (myProfile as any).id === (shipment as any).shipperId;
  const isDriver = myProfile && ((myProfile as any).role === "driver" || (myProfile as any).role === "both");
  const bids = bidsData?.bids || [];
  const canBid = isAuthenticated && isDriver && !isMyShipment && (shipment as any).status === "open";

  const vehicleTitle = `${shipment.vehicleYear} ${shipment.vehicleMake} ${shipment.vehicleModel}`;
  const shipper = (shipment as any).shipper;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.topBar, { paddingTop: topPadding + 8 }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: "#fff" }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={C.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: C.text }]} numberOfLines={1}>{vehicleTitle}</Text>
        <Pressable
          style={[styles.backBtn, { backgroundColor: "#fff" }]}
          onPress={() => shipper && router.push({ pathname: "/messages/[conversationId]", params: { conversationId: "new", recipientId: (shipment as any).shipperId, shipmentId: id } })}
        >
          <Feather name="message-circle" size={20} color={C.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPadding + 120 }}>
        <View style={[styles.section, { marginTop: 16 }]}>
          <View style={styles.routeCard}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: C.primary }]} />
              <View>
                <Text style={[styles.routeCity, { color: C.text }]}>{shipment.originCity}, {shipment.originState} {shipment.originZip}</Text>
                <Text style={[styles.routeLabel, { color: C.textMuted }]}>Pickup</Text>
              </View>
            </View>
            <View style={[styles.routeConnector, { backgroundColor: C.border }]} />
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: C.danger }]} />
              <View>
                <Text style={[styles.routeCity, { color: C.text }]}>{shipment.destinationCity}, {shipment.destinationState} {shipment.destinationZip}</Text>
                <Text style={[styles.routeLabel, { color: C.textMuted }]}>Delivery</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.section]}>
          <Text style={[styles.sectionHeader, { color: C.text }]}>Vehicle Details</Text>
          <InfoRow label="Vehicle" value={vehicleTitle} />
          <InfoRow label="Type" value={shipment.vehicleType} />
          <InfoRow label="Condition" value={shipment.vehicleCondition === "non_running" ? "Non-Running" : "Running"} />
          <InfoRow label="Transport" value={shipment.transportType === "enclosed" ? "Enclosed Carrier" : "Open Carrier"} />
          {(shipment as any).vin && <InfoRow label="VIN" value={(shipment as any).vin} />}
        </View>

        <View style={[styles.card, styles.section]}>
          <Text style={[styles.sectionHeader, { color: C.text }]}>Shipment Info</Text>
          {(shipment as any).pickupDateFrom && <InfoRow label="Earliest Pickup" value={(shipment as any).pickupDateFrom} />}
          {(shipment as any).pickupDateTo && <InfoRow label="Latest Pickup" value={(shipment as any).pickupDateTo} />}
          {(shipment as any).budgetMin && <InfoRow label="Min Budget" value={`$${(shipment as any).budgetMin?.toLocaleString()}`} />}
          {(shipment as any).budgetMax && <InfoRow label="Max Budget" value={`$${(shipment as any).budgetMax?.toLocaleString()}`} />}
          {(shipment as any).notes && <InfoRow label="Notes" value={(shipment as any).notes} />}
        </View>

        {shipper && (
          <View style={[styles.card, styles.section]}>
            <Text style={[styles.sectionHeader, { color: C.text }]}>Shipper</Text>
            <View style={styles.shipperRow}>
              <View style={[styles.shipperAvatar, { backgroundColor: C.primary }]}>
                <Text style={styles.shipperAvatarText}>{`${shipper.firstName || "S"}`.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.shipperName, { color: C.text }]}>{[shipper.firstName, shipper.lastName].filter(Boolean).join(" ") || "Shipper"}</Text>
                {shipper.averageRating > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="star" size={13} color="#F59E0B" />
                    <Text style={[styles.shipperRating, { color: C.textSecondary }]}>{shipper.averageRating?.toFixed(1)} rating</Text>
                  </View>
                )}
              </View>
              {shipper.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: "#D1FAE5" }]}>
                  <Feather name="check-circle" size={12} color="#065F46" />
                  <Text style={[styles.verifiedText, { color: "#065F46" }]}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {isMyShipment && bids.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: C.text, paddingHorizontal: 16 }]}>Bids ({bids.length})</Text>
            {bids.map((bid: any) => (
              <View key={bid.id} style={[styles.bidCard, { backgroundColor: "#fff" }]}>
                <View style={styles.bidHeader}>
                  <View>
                    <Text style={[styles.bidAmount, { color: C.success }]}>${bid.amount?.toLocaleString()}</Text>
                    <Text style={[styles.bidDriver, { color: C.textSecondary }]}>
                      {bid.driver ? [bid.driver.firstName, bid.driver.lastName].filter(Boolean).join(" ") : "Driver"}
                    </Text>
                  </View>
                  {bid.status === "pending" && (shipment as any).status === "open" && (
                    <View style={{ gap: 6 }}>
                      <Pressable
                        style={[styles.acceptBtn, { backgroundColor: C.primary }]}
                        onPress={() => acceptMutation.mutate(bid.id)}
                        disabled={acceptMutation.isPending}
                      >
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.acceptBtn, { backgroundColor: bid.counterStatus === "pending" ? "#94A3B8" : "#6366F1" }]}
                        onPress={() => { setCounterBidId(bid.id); setCounterPriceInput(""); setShowCounterModal(true); }}
                        disabled={bid.counterStatus === "pending"}
                      >
                        <Text style={styles.acceptBtnText}>{bid.counterStatus === "pending" ? "Sent" : "Counter"}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
                {bid.note && <Text style={[styles.bidNote, { color: C.textSecondary }]}>{bid.note}</Text>}
              </View>
            ))}
          </View>
        )}

        {!isMyShipment && bids.filter((b: any) => b.driverId === (myProfile as any)?.id && b.counterStatus === "pending").map((bid: any) => (
          <View key={`counter-${bid.id}`} style={[styles.card, styles.section, { borderWidth: 1, borderColor: "#F59E0B" }]}>
            <Text style={[styles.sectionHeader, { color: C.text }]}>Counter-Offer Received</Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary, marginBottom: 8 }}>
              The shipper sent a counter-offer for your ${bid.amount?.toLocaleString()} bid:
            </Text>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 28, color: "#F59E0B", marginBottom: 16 }}>
              ${bid.counterPrice?.toLocaleString()}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                style={[styles.acceptBtn, { flex: 1, backgroundColor: C.primary, alignItems: "center" }]}
                onPress={() => acceptCounterMutation.mutate(bid.id)}
                disabled={acceptCounterMutation.isPending}
              >
                <Text style={styles.acceptBtnText}>Accept</Text>
              </Pressable>
              <Pressable
                style={[styles.acceptBtn, { flex: 1, backgroundColor: "#EF4444", alignItems: "center" }]}
                onPress={() => declineCounterMutation.mutate(bid.id)}
                disabled={declineCounterMutation.isPending}
              >
                <Text style={styles.acceptBtnText}>Decline</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      {canBid && (
        <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 8 }]}>
          <View>
            {(shipment as any).budgetMax && (
              <Text style={[styles.budgetHint, { color: C.textSecondary }]}>Budget: up to ${(shipment as any).budgetMax?.toLocaleString()}</Text>
            )}
            <Text style={[styles.bidsCount, { color: C.textMuted }]}>{bids.length} bid{bids.length !== 1 ? "s" : ""} so far</Text>
          </View>
          <Pressable style={[styles.bidBtn, { backgroundColor: C.primary }]} onPress={() => setShowBidModal(true)}>
            <Feather name="tag" size={16} color="#fff" />
            <Text style={styles.bidBtnText}>Place Bid</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={showCounterModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCounterModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Send Counter-Offer</Text>
            <Pressable onPress={() => setShowCounterModal(false)}>
              <Feather name="x" size={22} color={C.textSecondary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: C.textSecondary }}>
              Enter your counter price. The driver will be notified and can accept or decline.
            </Text>
            <View>
              <Text style={[styles.fieldLabel, { color: C.text }]}>Counter Price ($) *</Text>
              <TextInput
                style={[styles.input, { borderColor: C.border, color: C.text, backgroundColor: "#fff" }]}
                value={counterPriceInput}
                onChangeText={setCounterPriceInput}
                placeholder="e.g. 750"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
              />
            </View>
            <Pressable
              style={[styles.submitBtn, { backgroundColor: C.primary, opacity: counterMutation.isPending ? 0.7 : 1 }]}
              onPress={() => {
                const price = parseFloat(counterPriceInput);
                if (!price || isNaN(price) || price <= 0) { Alert.alert("Invalid Amount", "Please enter a valid counter price."); return; }
                if (!counterBidId) return;
                counterMutation.mutate({ bidId: counterBidId, price });
              }}
              disabled={counterMutation.isPending}
            >
              {counterMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={styles.submitBtnText}>Send Counter-Offer – ${counterPriceInput || "0"}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showBidModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBidModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Place Your Bid</Text>
            <Pressable onPress={() => setShowBidModal(false)}>
              <Feather name="x" size={22} color={C.textSecondary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View>
              <Text style={[styles.fieldLabel, { color: C.text }]}>Your Bid Amount ($) *</Text>
              <TextInput
                style={[styles.input, { borderColor: C.border, color: C.text, backgroundColor: "#fff" }]}
                value={bidAmount}
                onChangeText={setBidAmount}
                placeholder="e.g. 850"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: C.text }]}>Message to Shipper (optional)</Text>
              <TextInput
                style={[styles.input, styles.textarea, { borderColor: C.border, color: C.text, backgroundColor: "#fff" }]}
                value={bidNote}
                onChangeText={setBidNote}
                placeholder="Describe your experience, availability, or ask questions..."
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={[styles.disclaimerBox, { backgroundColor: "#FEF9C3", borderColor: "#FDE68A" }]}>
              <Feather name="alert-circle" size={14} color="#A16207" />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#A16207", flex: 1, lineHeight: 18 }}>
                By bidding, you agree to transport this vehicle if accepted. Payment is arranged directly with the shipper. KarHaul is not responsible for disputes.
              </Text>
            </View>
            <Pressable
              style={[styles.submitBtn, { backgroundColor: C.primary, opacity: bidMutation.isPending ? 0.7 : 1 }]}
              onPress={() => {
                const amount = parseFloat(bidAmount);
                if (!amount || isNaN(amount)) { Alert.alert("Invalid Amount", "Please enter a valid bid amount."); return; }
                bidMutation.mutate({ amount, note: bidNote || undefined });
              }}
              disabled={bidMutation.isPending}
            >
              {bidMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={styles.submitBtnText}>Submit Bid – ${bidAmount || "0"}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  topTitle: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 17, textAlign: "center" },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionHeader: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 },
  routeCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  routePoint: { flexDirection: "row", alignItems: "center", gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6 },
  routeCity: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  routeLabel: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  routeConnector: { width: 2, height: 20, marginLeft: 5 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 14 },
  infoValue: { fontFamily: "Inter_500Medium", fontSize: 14 },
  shipperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  shipperAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  shipperAvatarText: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: "#fff" },
  shipperName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  shipperRating: { fontFamily: "Inter_400Regular", fontSize: 13 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  verifiedText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  bidCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  bidHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bidAmount: { fontFamily: "Inter_700Bold", fontSize: 20 },
  bidDriver: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  acceptBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  acceptBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  bidNote: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 8, lineHeight: 20 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  budgetHint: { fontFamily: "Inter_500Medium", fontSize: 14 },
  bidsCount: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  bidBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  bidBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15 },
  textarea: { height: 100, textAlignVertical: "top" },
  disclaimerBox: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  submitBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
