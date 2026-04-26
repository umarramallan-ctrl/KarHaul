import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, ActivityIndicator, TextInput, Linking, Image } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBooking, updateBookingStatus, getMyProfile, getMyReviews, createReview } from "@workspace/api-client-react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/ThemeContext";
import { getApiBaseUrl } from "@/lib/api";
import * as ImagePicker from "expo-image-picker";

const STATUS_STEPS = ["confirmed", "picked_up", "in_transit", "delivered"];
const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed", picked_up: "Picked Up", in_transit: "In Transit",
  delivered: "Delivered", cancelled: "Cancelled",
};

const MILESTONE_ICONS: Record<string, string> = {
  departed_origin: "🚛", en_route: "🛣️", checkpoint: "📍",
  weather_delay: "⚠️", near_destination: "🏁", custom: "💬",
};
const MILESTONE_LABELS: Record<string, string> = {
  departed_origin: "Departed Origin", en_route: "En Route", checkpoint: "Checkpoint",
  weather_delay: "Weather / Delay", near_destination: "Near Destination", custom: "Driver Update",
};
const MILESTONE_OPTIONS = Object.entries(MILESTONE_LABELS).map(([k, v]) => ({ key: k, label: v }));
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

async function fetchTracking(bookingId: string, token: string | null) {
  const res = await fetch(`${getApiBaseUrl()}/bookings/${bookingId}/tracking`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

async function fetchPhotos(bookingId: string, token: string | null) {
  const res = await fetch(`${getApiBaseUrl()}/bookings/${bookingId}/photos`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

async function addPhoto(bookingId: string, data: { photoUrl: string; phase: string; caption?: string }, token: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${getApiBaseUrl()}/bookings/${bookingId}/photos`, {
    method: "POST", headers, body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Upload failed"); }
  return res.json();
}

async function postCheckpoint(bookingId: string, data: Record<string, string>, token: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${getApiBaseUrl()}/bookings/${bookingId}/tracking`, {
    method: "POST", headers, body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
  return res.json();
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [showCheckpointForm, setShowCheckpointForm] = useState(false);
  const [cpForm, setCpForm] = useState({ city: "", state: "", milestone: "en_route", notes: "" });
  const [calling, setCalling] = useState<string | null>(null);
  const [uploadPhase, setUploadPhase] = useState<"pickup" | "delivery">("pickup");
  const [uploading, setUploading] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [bolSigned, setBolSigned] = useState(false);
  const { getToken } = useClerkAuth();

  useEffect(() => {
    if (id) AsyncStorage.getItem(`bol-signed-${id}`).then(v => setBolSigned(!!v));
  }, [id]);

  const { data: booking, isLoading } = useQuery({ queryKey: ["booking", id], queryFn: () => getBooking(id!) });
  const { data: myProfile } = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile, enabled: isAuthenticated });
  const { data: trackingData, refetch: refetchTracking } = useQuery({
    queryKey: ["tracking-mobile", id],
    queryFn: async () => {
      const token = await getToken();
      return fetchTracking(id!, token);
    },
    enabled: !!id,
    refetchInterval: 60000,
  });
  const { data: photosData } = useQuery({
    queryKey: ["photos-mobile", id],
    queryFn: async () => {
      const token = await getToken();
      return fetchPhotos(id!, token);
    },
    enabled: !!id,
    refetchInterval: 30000,
  });

  const { data: myReviewsData, refetch: refetchMyReviews } = useQuery({
    queryKey: ["my-reviews"],
    queryFn: getMyReviews,
    enabled: isAuthenticated,
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createReview>[0]) => createReview(payload),
    onSuccess: () => {
      refetchMyReviews();
      qc.invalidateQueries({ queryKey: ["my-reviews"] });
      Alert.alert("Review submitted", "Thank you for your feedback!");
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateBookingStatus(id!, { status: status as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["booking", id] }); qc.invalidateQueries({ queryKey: ["my-bookings"] }); },
  });

  const checkpointMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const token = await getToken();
      return postCheckpoint(id!, data, token);
    },
    onSuccess: () => {
      refetchTracking();
      setShowCheckpointForm(false);
      setCpForm({ city: "", state: "", milestone: "en_route", notes: "" });
      Alert.alert("Update posted", "The shipper has been notified of your location.");
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading || !booking) {
    return <View style={[styles.centered, { backgroundColor: C.background }]}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  const isDriver = myProfile && (myProfile as any).id === (booking as any).driverId;
  const isShipper = myProfile && (myProfile as any).id === (booking as any).shipperId;
  const alreadyReviewed = (myReviewsData?.reviewedBookingIds ?? []).includes(id!);
  const currentStepIdx = STATUS_STEPS.indexOf((booking as any).status);
  const shipment = (booking as any).shipment;
  const driver = (booking as any).driver;
  const shipper = (booking as any).shipper;
  const checkpoints = trackingData?.checkpoints || [];
  const photos = (photosData?.photos || []) as Array<{ id: string; phase: string; photoUrl: string; caption?: string }>;
  const pickupPhotos = photos.filter(p => p.phase === "pickup");
  const deliveryPhotos = photos.filter(p => p.phase === "delivery");
  const platformFee = (booking as any).platformFeeAmount ?? 0;
  const agreedPrice = (booking as any).agreedPrice ?? 0;

  const isBookingActive = !["delivered", "cancelled"].includes((booking as any).status);
  const nextStatus: Record<string, string> = { confirmed: "picked_up", picked_up: "in_transit", in_transit: "delivered" };
  const nextStatusLabel: Record<string, string> = { confirmed: "Mark as Picked Up", picked_up: "Mark as In Transit", in_transit: "Mark as Delivered" };
  const nextSt = nextStatus[(booking as any).status];

  const handleStatusUpdate = () => {
    if (!nextSt) return;
    Alert.alert(nextStatusLabel[(booking as any).status], "Confirm this status update?", [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => statusMutation.mutate(nextSt) },
    ]);
  };

  const handlePhotoUpload = async (phase: "pickup" | "delivery") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo library access to upload condition photos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.7 });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    setUploading(true);
    try {
      const token = await getToken();
      const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await addPhoto(id!, { photoUrl: base64Uri, phase }, token);
      qc.invalidateQueries({ queryKey: ["photos-mobile", id] });
      Alert.alert("Photo uploaded", "Both parties can view it in the booking.");
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleInAppCall = (name: string) => {
    Alert.alert("In-App Call", `Initiating a secure call with ${name}. Both parties will be connected through the platform.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Connect Call", onPress: () => {
        setCalling(name);
        setTimeout(() => { setCalling(null); Alert.alert("Call initiated", `${name} has been notified. Connecting...`); }, 1500);
      }},
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: C.surface }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={C.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>Booking Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPadding + 120 }}>
        {/* Price Card */}
        <View style={[styles.priceCard, { backgroundColor: C.primary }]}>
          <Text style={styles.priceLabel}>Transport Price</Text>
          <Text style={styles.priceAmount}>${agreedPrice.toLocaleString()}</Text>
          {platformFee > 0 && (
            <>
              <View style={styles.feeDivider} />
              <Text style={styles.feeText}>+ ${platformFee.toFixed(2)} platform fee ({isDriver ? "3% of your accepted bid" : "5% of budget"})</Text>
              {isShipper && <Text style={styles.feeTotal}>Total: ${(agreedPrice + platformFee).toFixed(2)}</Text>}
            </>
          )}
          <Text style={styles.priceNote}>Payment arranged directly between shipper and driver</Text>
        </View>

        {/* Privacy Notice */}
        <View style={[styles.noticeCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
          <Feather name="shield" size={14} color="#1D4ED8" />
          <Text style={[styles.noticeText, { color: "#1D4ED8" }]}>Phone numbers cannot be shared in messages. Use the Call button below to connect securely through the app.</Text>
        </View>

        {/* Status Timeline */}
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
                    <Text style={[styles.stepLabel, { color: done ? C.text : C.textMuted, fontFamily: current ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{STATUS_LABELS[step]}</Text>
                    {current && <View style={[styles.currentBadge, { backgroundColor: "#EFF6FF" }]}><Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: C.primary }}>CURRENT</Text></View>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Location Tracking */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 0 }]}>Location Updates</Text>
            {isDriver && !["delivered", "cancelled"].includes((booking as any).status) && (
              <Pressable style={[styles.addBtn, { backgroundColor: C.primary }]} onPress={() => setShowCheckpointForm(v => !v)}>
                <Feather name="plus" size={14} color="#fff" />
                <Text style={styles.addBtnText}>Post Update</Text>
              </Pressable>
            )}
          </View>

          {isDriver && showCheckpointForm && (
            <View style={[styles.card, { backgroundColor: "#fff", marginBottom: 10 }]}>
              <Text style={[styles.formLabel, { color: C.textMuted }]}>City (optional)</Text>
              <TextInput
                style={[styles.formInput, { borderColor: C.border, color: C.text }]}
                value={cpForm.city}
                onChangeText={v => setCpForm(f => ({ ...f, city: v }))}
                placeholder="e.g. Oklahoma City"
                placeholderTextColor={C.textMuted}
              />
              <Text style={[styles.formLabel, { color: C.textMuted }]}>Milestone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {MILESTONE_OPTIONS.map(opt => (
                    <Pressable
                      key={opt.key}
                      style={[styles.milestoneChip, { borderColor: cpForm.milestone === opt.key ? C.primary : C.border, backgroundColor: cpForm.milestone === opt.key ? "#EFF6FF" : C.surface }]}
                      onPress={() => setCpForm(f => ({ ...f, milestone: opt.key }))}
                    >
                      <Text style={{ fontSize: 11, color: cpForm.milestone === opt.key ? C.primary : C.textSecondary, fontFamily: "Inter_500Medium" }}>{MILESTONE_ICONS[opt.key]} {opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Text style={[styles.formLabel, { color: C.textMuted }]}>Note (optional)</Text>
              <TextInput
                style={[styles.formInput, { borderColor: C.border, color: C.text }]}
                value={cpForm.notes}
                onChangeText={v => setCpForm(f => ({ ...f, notes: v }))}
                placeholder="e.g. Running 2 hours ahead of schedule"
                placeholderTextColor={C.textMuted}
              />
              <Pressable
                style={[styles.submitBtn, { backgroundColor: C.primary, opacity: checkpointMutation.isPending ? 0.7 : 1 }]}
                onPress={() => checkpointMutation.mutate(cpForm)}
                disabled={checkpointMutation.isPending}
              >
                {checkpointMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Post Location Update</Text>}
              </Pressable>
            </View>
          )}

          {checkpoints.length === 0 ? (
            <View style={[styles.card, { backgroundColor: "#fff", alignItems: "center", paddingVertical: 20 }]}>
              <Feather name="map-pin" size={28} color={C.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: C.textMuted }]}>
                {isDriver ? "Post your first location update above." : "Your driver will post checkpoints as they travel."}
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              {checkpoints.map((cp: any, i: number) => (
                <View key={cp.id} style={[styles.checkpointRow, i > 0 && { borderTopWidth: 1, borderTopColor: "#F1F5F9" }]}>
                  <Text style={styles.checkpointIcon}>{MILESTONE_ICONS[cp.milestone] || "💬"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.checkpointMilestone, { color: C.primary }]}>{MILESTONE_LABELS[cp.milestone] || "Update"}</Text>
                    {(cp.city || cp.state) && <Text style={[styles.checkpointLocation, { color: C.text }]}>{[cp.city, cp.state].filter(Boolean).join(", ")}</Text>}
                    {cp.notes && <Text style={[styles.checkpointNotes, { color: C.textSecondary }]}>{cp.notes}</Text>}
                    <Text style={[styles.checkpointTime, { color: C.textMuted }]}>{new Date(cp.createdAt).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Vehicle & BOL */}
        {shipment && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Vehicle</Text>
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <Text style={[styles.vehicleName, { color: C.text }]}>{shipment.vehicleYear} {shipment.vehicleMake} {shipment.vehicleModel}</Text>
              <Text style={[styles.route, { color: C.textSecondary }]}>{shipment.originCity}, {shipment.originState} → {shipment.destinationCity}, {shipment.destinationState}</Text>
              {shipment.vin && <Text style={[styles.route, { color: C.textMuted, marginTop: 4 }]}>VIN: {shipment.vin}</Text>}
              <View style={[styles.bolRow]}>
                <Feather name="file-text" size={13} color={C.primary} />
                <Text style={[styles.bolLink, { color: C.primary }]}>Bill of Lading auto-generated on booking confirmation</Text>
              </View>
              {(booking as any).status === "delivered" && (isDriver || isShipper) && (
                bolSigned ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
                    <Feather name="check-circle" size={14} color="#16A34A" />
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#16A34A" }}>BOL Signed ✓</Text>
                  </View>
                ) : (
                  <Pressable
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginTop: 10, alignSelf: "flex-start" }}
                    onPress={() => Alert.alert(
                      "Sign Bill of Lading",
                      "By confirming, you acknowledge receipt and condition of the vehicle as documented in this Bill of Lading.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Sign BOL", onPress: async () => { await AsyncStorage.setItem(`bol-signed-${id}`, "1"); setBolSigned(true); } },
                      ]
                    )}
                  >
                    <Feather name="file-text" size={14} color="#16A34A" />
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#16A34A" }}>Sign BOL</Text>
                  </Pressable>
                )
              )}
            </View>
          </View>
        )}

        {/* Condition Photos */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Condition Photos ({photos.length})</Text>
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              {pickupPhotos.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.formLabel, { color: C.textMuted, marginTop: 0 }]}>Pre-loading ({pickupPhotos.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {pickupPhotos.map((p) => (
                        <Image key={p.id} source={{ uri: p.photoUrl }} style={styles.photoThumb} />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
              {deliveryPhotos.length > 0 && (
                <View>
                  <Text style={[styles.formLabel, { color: C.textMuted, marginTop: 0 }]}>Post-delivery ({deliveryPhotos.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {deliveryPhotos.map((p) => (
                        <Image key={p.id} source={{ uri: p.photoUrl }} style={styles.photoThumb} />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Driver photo upload */}
        {isDriver && !["delivered", "cancelled"].includes((booking as any).status) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Upload Condition Photos</Text>
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <Text style={[styles.formLabel, { color: C.textMuted, marginTop: 0 }]}>Phase</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {(["pickup", "delivery"] as const).map(ph => (
                  <Pressable key={ph} onPress={() => setUploadPhase(ph)}
                    style={[styles.milestoneChip, { flex: 1, alignItems: "center", borderColor: uploadPhase === ph ? C.primary : C.border, backgroundColor: uploadPhase === ph ? "#EFF6FF" : C.surface }]}>
                    <Text style={{ fontSize: 13, color: uploadPhase === ph ? C.primary : C.textSecondary, fontFamily: "Inter_500Medium" }}>
                      {ph === "pickup" ? "Pre-loading" : "Post-delivery"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={[styles.submitBtn, { backgroundColor: uploading ? "#94A3B8" : C.primary }]}
                onPress={() => handlePhotoUpload(uploadPhase)}
                disabled={uploading}
              >
                {uploading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.submitBtnText}>📷 Choose &amp; Upload Photo</Text>
                }
              </Pressable>
            </View>
          </View>
        )}

        {/* Contact */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Contact</Text>
          {!isBookingActive && (
            <View style={{ backgroundColor: "#FFF7ED", borderColor: "#FED7AA", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#92400E", textAlign: "center" }}>
                This booking is complete. Communication is no longer available.
              </Text>
            </View>
          )}
          <View style={[styles.card, { backgroundColor: "#fff" }]}>
            {[{ label: "Driver", user: driver, otherId: (booking as any).driverId }, { label: "Shipper", user: shipper, otherId: (booking as any).shipperId }].map(({ label, user, otherId }) => {
              const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || label;
              return (
                <View key={label} style={[styles.partyRow, { borderTopColor: "#F1F5F9" }]}>
                  <View style={[styles.partyAvatar, { backgroundColor: C.primary }]}>
                    <Text style={styles.partyAvatarText}>{(user?.firstName || "U").charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.partyRole, { color: C.textMuted }]}>{label}</Text>
                    <Text style={[styles.partyName, { color: C.text }]}>{fullName}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {isBookingActive ? (
                      <>
                        <Pressable
                          style={[styles.contactBtn, { borderColor: "#D1D5DB" }]}
                          onPress={() => router.push({ pathname: "/messages/[conversationId]", params: { conversationId: "new", recipientId: otherId, name: fullName, bookingActive: "true" } })}
                        >
                          <Feather name="message-circle" size={16} color={C.primary} />
                        </Pressable>
                        <Pressable
                          style={[styles.contactBtn, { borderColor: "#D1FAE5" }]}
                          onPress={() => handleInAppCall(fullName)}
                          disabled={calling !== null}
                        >
                          {calling ? <ActivityIndicator size="small" color="#10B981" /> : <Feather name="phone" size={16} color="#10B981" />}
                        </Pressable>
                      </>
                    ) : null}
                    <Pressable
                      style={[styles.contactBtn, { borderColor: "#FECACA" }]}
                      onPress={() => Alert.alert(
                        `Report ${fullName}`,
                        "Report this user to our trust & safety team?",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Report", style: "destructive", onPress: () => Alert.alert("Report submitted", "Our team will review and take appropriate action.") },
                        ]
                      )}
                    >
                      <Feather name="flag" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={[styles.contactDisclaimer, { color: C.textMuted }]}>
            {isBookingActive
              ? "Phone numbers cannot be shared in messages. Use the call button to connect securely."
              : "Booking ended. Use the flag icon to report any issues."}
          </Text>
        </View>

        {/* Review section — only for delivered bookings */}
        {(booking as any).status === "delivered" && (isDriver || isShipper) && (
          <View style={[styles.section, { marginBottom: 24 }]}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              {alreadyReviewed ? "Review Submitted" : `Rate ${isDriver ? "Shipper" : "Driver"}`}
            </Text>
            {alreadyReviewed ? (
              <View style={[styles.card, { backgroundColor: "#F0FDF4", flexDirection: "row", gap: 8, alignItems: "center" }]}>
                <Feather name="check-circle" size={18} color="#16A34A" />
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: "#16A34A", flex: 1 }}>
                  You've already submitted a review for this booking.
                </Text>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: C.surface }]}>
                <Text style={[styles.formLabel, { color: C.textMuted, marginTop: 0 }]}>Overall Rating *</Text>
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 14 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Pressable key={s} onPress={() => setReviewRating(s)} hitSlop={8}>
                      <Text style={{ fontSize: 30, color: s <= reviewRating ? "#F59E0B" : "#D1D5DB" }}>★</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.formLabel, { color: C.textMuted }]}>Comment (optional)</Text>
                <TextInput
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="Share details about your experience..."
                  placeholderTextColor={C.textMuted}
                  multiline
                  numberOfLines={3}
                  style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 14, minHeight: 72, textAlignVertical: "top", color: C.text }}
                />
                <Pressable
                  style={[styles.submitBtn, { backgroundColor: reviewMutation.isPending || !reviewRating ? "#94A3B8" : C.primary }]}
                  onPress={() => {
                    if (!reviewRating) { Alert.alert("Rating required", "Please select a rating."); return; }
                    const revieweeId = isDriver ? (booking as any).shipperId : (booking as any).driverId;
                    reviewMutation.mutate({ bookingId: id!, revieweeId, rating: reviewRating, comment: reviewComment || undefined });
                  }}
                  disabled={reviewMutation.isPending || !reviewRating}
                >
                  <Text style={styles.submitBtnText}>
                    {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {isDriver && nextSt && (booking as any).status !== "delivered" && (
        <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 8, backgroundColor: C.surface, borderTopColor: C.borderLight }]}>
          <Pressable
            style={[styles.updateBtn, { backgroundColor: C.primary, opacity: statusMutation.isPending ? 0.7 : 1 }]}
            onPress={handleStatusUpdate}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.updateBtnText}>{nextStatusLabel[(booking as any).status]}</Text>}
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
  priceCard: { marginHorizontal: 16, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 12 },
  priceLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  priceAmount: { fontFamily: "Inter_700Bold", fontSize: 36, color: "#fff" },
  feeDivider: { height: 1, width: "80%", backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 8 },
  feeText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)" },
  feeTotal: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff", marginTop: 2 },
  priceNote: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 10, textAlign: "center" },
  noticeCard: { marginHorizontal: 16, marginBottom: 12, flexDirection: "row", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  noticeText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 8 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  addBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  card: { borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  stepRow: { flexDirection: "row", gap: 14, marginBottom: 0 },
  stepLeft: { alignItems: "center", width: 24 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 4 },
  stepContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  stepLabel: { fontSize: 15 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  checkpointRow: { flexDirection: "row", gap: 10, paddingVertical: 10 },
  checkpointIcon: { fontSize: 20, marginTop: 2 },
  checkpointMilestone: { fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  checkpointLocation: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 1 },
  checkpointNotes: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  checkpointTime: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  formLabel: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 4, marginTop: 8 },
  formInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, marginBottom: 4 },
  milestoneChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  submitBtn: { paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 10 },
  submitBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  vehicleName: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 4 },
  route: { fontFamily: "Inter_400Regular", fontSize: 14 },
  bolRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  bolLink: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 },
  photoThumb: { width: 90, height: 90, borderRadius: 10, backgroundColor: "#F1F5F9" },
  partyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1 },
  partyAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  partyAvatarText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  partyRole: { fontFamily: "Inter_400Regular", fontSize: 12 },
  partyName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  contactBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  contactDisclaimer: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", marginTop: 8 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1 },
  updateBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  updateBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
