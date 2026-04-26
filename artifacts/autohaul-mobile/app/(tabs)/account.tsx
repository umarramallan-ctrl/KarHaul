import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert, TextInput, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMyProfile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import Colors from "@/constants/colors";
import { useTheme, ThemeMode } from "@/lib/ThemeContext";
import { API_URL } from "@/lib/api";

function ThemeToggle() {
  const { theme, setTheme, colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const options: { value: ThemeMode; icon: string; label: string }[] = [
    { value: "light", icon: "sun", label: "Light" },
    { value: "dark", icon: "moon", label: "Dark" },
    { value: "system", icon: "smartphone", label: "System" },
  ];
  return (
    <View style={styles.menuItem}>
      <View style={[styles.menuIcon, { backgroundColor: "#EFF6FF" }]}>
        <Feather name="sun" size={18} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: C.text }]}>Appearance</Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setTheme(opt.value)}
              style={[
                styles.themeBtn,
                theme === opt.value && { backgroundColor: C.primary, borderColor: C.primary },
              ]}
            >
              <Feather
                name={opt.icon as any}
                size={12}
                color={theme === opt.value ? "#fff" : C.textSecondary}
              />
              <Text
                style={[
                  styles.themeBtnText,
                  { color: theme === opt.value ? "#fff" : C.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function MenuItem({ icon, label, subtitle, onPress, danger }: { icon: string; label: string; subtitle?: string; onPress: () => void; danger?: boolean }) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: danger ? "#FEE2E2" : "#EFF6FF" }]}>
        <Feather name={icon as any} size={18} color={danger ? C.danger : C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: danger ? C.danger : C.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.menuSub, { color: C.textSecondary }]}>{subtitle}</Text>}
      </View>
      {!danger && <Feather name="chevron-right" size={16} color={C.textMuted} />}
    </Pressable>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const { isAuthenticated, logout } = useAuth();
  const { getToken } = useClerkAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") return;
    setDeleteLoading(true);
    try {
      const clerkToken = await getToken();
      const res = await fetch(`${API_URL}/users/account/delete-request`, {
        method: "POST",
        headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Cannot delete account", data.error || "Something went wrong.");
        return;
      }
      setDeleteModalOpen(false);
      Alert.alert(
        "Account deactivated",
        "Your personal data will be purged in 30 days. Transaction and BOL records are retained. You will be signed out.",
        [{ text: "OK", onPress: logout }]
      );
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Account</Text>
        </View>
        <View style={styles.authSection}>
          <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
            <Feather name="user" size={40} color={C.primary} />
          </View>
          <Text style={[styles.authTitle, { color: C.text }]}>Welcome to KarHaul</Text>
          <Text style={[styles.authSub, { color: C.textSecondary }]}>Direct connections between shippers and drivers — no brokers, no middlemen.</Text>
          <Pressable style={[styles.signInBtn, { backgroundColor: C.primary }]} onPress={() => router.push("/auth")}>
            <Text style={styles.signInBtnText}>Get Started</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Driver";
  const roleLabel = profile?.role === "both" ? "Shipper & Driver" : profile?.role === "driver" ? "Driver" : "Shipper";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingBottom: bottomPadding + 100 }}
    >
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Account</Text>
      </View>

      <LinearGradient
        colors={["#1A56DB", "#1E40AF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileCard}
      >
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{fullName}</Text>
            {profile?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Feather name="check-circle" size={12} color="#fff" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.profileRole}>{roleLabel}</Text>
          {profile?.averageRating && profile.averageRating > 0 ? (
            <View style={styles.ratingRow}>
              <Feather name="star" size={13} color="#FCD34D" />
              <Text style={styles.ratingText}>{profile.averageRating.toFixed(1)} ({profile.totalReviews} reviews)</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      {profile?.role === "driver" || profile?.role === "both" ? (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <Text style={[styles.statNum, { color: C.primary }]}>{profile?.completedJobs || 0}</Text>
            <Text style={[styles.statLabel, { color: C.primary }]}>Jobs Done</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <Text style={[styles.statNum, { color: "#065F46" }]}>{profile?.averageRating?.toFixed(1) || "—"}</Text>
            <Text style={[styles.statLabel, { color: "#065F46" }]}>Avg Rating</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FEFCE8", borderColor: "#FDE68A" }]}>
            <Text style={[styles.statNum, { color: "#92400E" }]}>{profile?.totalReviews || 0}</Text>
            <Text style={[styles.statLabel, { color: "#92400E" }]}>Reviews</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.section, { backgroundColor: C.surface }]}>
        <Text style={[styles.sectionTitle, { color: C.textMuted }]}>ACCOUNT</Text>
        <MenuItem icon="user" label="Edit Profile" subtitle="Update your info and preferences" onPress={() => router.push("/profile-setup")} />
        {(profile?.role === "driver" || profile?.role === "both") && (
          <MenuItem icon="truck" label="Driver Details" subtitle={profile?.dotNumber ? `DOT #${profile.dotNumber}` : "Add DOT & insurance info"} onPress={() => router.push("/profile-setup")} />
        )}
        {(profile?.role === "driver" || profile?.role === "both") && (
          <MenuItem icon="navigation" label="Post My Route" subtitle="Let shippers find you on backhaul board" onPress={() => {}} />
        )}
        {(profile?.role === "shipper" || profile?.role === "both") && (
          <MenuItem icon="heart" label="Saved Drivers" subtitle="Rebook trusted carriers directly" onPress={() => router.push("/saved-drivers")} />
        )}
        <MenuItem icon="file-text" label="Terms of Service" subtitle="Platform rules and liability" onPress={() => {}} />
      </View>

      <View style={[styles.section, { backgroundColor: C.surface, marginTop: 12 }]}>
        <Text style={[styles.sectionTitle, { color: C.textMuted }]}>SUPPORT</Text>
        <MenuItem icon="help-circle" label="Help & FAQ" subtitle="Common questions answered" onPress={() => {}} />
        <MenuItem icon="shield" label="Safety & Liability" subtitle="How we protect you" onPress={() => {}} />
        <MenuItem icon="info" label="About KarHaul" subtitle="Our story and how it works" onPress={() => router.push("/about")} />
        <MenuItem icon="mail" label="Contact Us" subtitle="Get in touch with our team" onPress={() => router.push("/contact")} />
      </View>

      <View style={[styles.section, { backgroundColor: C.surface, marginTop: 12 }]}>
        <Text style={[styles.sectionTitle, { color: C.textMuted }]}>DISPLAY</Text>
        <ThemeToggle />
      </View>

      <View style={[styles.section, { backgroundColor: C.surface, marginTop: 12 }]}>
        <MenuItem icon="log-out" label="Sign Out" onPress={handleLogout} danger />
      </View>

      <View style={[styles.section, { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", marginTop: 12 }]}>
        <Text style={[styles.sectionTitle, { color: "#991B1B" }]}>DANGER ZONE</Text>
        <MenuItem
          icon="trash-2"
          label="Delete Account"
          subtitle="30-day grace period · Data purged after 30 days"
          onPress={() => setDeleteModalOpen(true)}
          danger
        />
      </View>

      {/* Delete Account Modal */}
      <Modal visible={deleteModalOpen} transparent animationType="fade">
        <View style={deleteStyles.overlay}>
          <View style={deleteStyles.modal}>
            <View style={deleteStyles.iconRow}>
              <View style={deleteStyles.iconBg}>
                <Feather name="alert-triangle" size={22} color="#DC2626" />
              </View>
              <Text style={deleteStyles.title}>Delete Account</Text>
            </View>
            <Text style={deleteStyles.body}>
              Your account will be deactivated immediately. Personal data is purged after 30 days. Transaction and BOL records are retained for compliance.
            </Text>
            <View style={deleteStyles.warningBox}>
              <Text style={deleteStyles.warningText}>• Cannot be undone after 30 days</Text>
              <Text style={deleteStyles.warningText}>• Blocked if you have active bookings</Text>
              <Text style={deleteStyles.warningText}>• You'll be signed out immediately</Text>
            </View>
            <Text style={deleteStyles.confirmLabel}>Type DELETE to confirm:</Text>
            <TextInput
              style={deleteStyles.confirmInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              autoCapitalize="characters"
            />
            <View style={deleteStyles.btnRow}>
              <Pressable
                style={[deleteStyles.btn, { backgroundColor: C.borderLight }]}
                onPress={() => { setDeleteModalOpen(false); setDeleteConfirmText(""); }}
              >
                <Text style={[deleteStyles.btnText, { color: "#334155" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[deleteStyles.btn, { backgroundColor: deleteConfirmText === "DELETE" && !deleteLoading ? "#DC2626" : "#FCA5A5" }]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleteLoading}
              >
                <Text style={[deleteStyles.btnText, { color: "#fff" }]}>{deleteLoading ? "Processing…" : "Delete Account"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 28 },
  authSection: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 16 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  authTitle: { fontFamily: "Inter_700Bold", fontSize: 22, textAlign: "center" },
  authSub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
  signInBtn: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  signInBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 20, marginHorizontal: 16, borderRadius: 20, marginBottom: 12, shadowColor: "#1A56DB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  avatarLarge: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.25)" },
  avatarLargeText: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#fff" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.25)" },
  verifiedText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  profileRole: { fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 4, color: "rgba(255,255,255,0.75)" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.85)" },
  statsRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2, textAlign: "center" },
  section: { marginHorizontal: 16, borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 11, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, letterSpacing: 0.5 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#F8FAFC" },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontFamily: "Inter_500Medium", fontSize: 15 },
  menuSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  themeBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0" },
  themeBtnText: { fontFamily: "Inter_500Medium", fontSize: 11 },
});

const deleteStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  modal: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, gap: 14 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#1E293B" },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#475569", lineHeight: 21 },
  warningBox: { backgroundColor: "#FEF2F2", borderRadius: 10, borderWidth: 1, borderColor: "#FECACA", padding: 12, gap: 4 },
  warningText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#991B1B" },
  confirmLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#475569" },
  confirmInput: { fontFamily: "Inter_700Bold", fontSize: 15, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#F8FAFC", color: "#1E293B", letterSpacing: 2 },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
