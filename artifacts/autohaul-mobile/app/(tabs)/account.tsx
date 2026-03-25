import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMyProfile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";

function MenuItem({ icon, label, subtitle, onPress, danger }: { icon: string; label: string; subtitle?: string; onPress: () => void; danger?: boolean }) {
  const C = Colors.light;
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
  const C = Colors.light;
  const { isAuthenticated, logout } = useAuth();

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
          <Text style={[styles.authTitle, { color: C.text }]}>Welcome to Traxion</Text>
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

      <View style={styles.profileCard}>
        <View style={[styles.avatarLarge, { backgroundColor: C.primary }]}>
          <Text style={styles.avatarLargeText}>{fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.profileName, { color: C.text }]}>{fullName}</Text>
            {profile?.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: "#D1FAE5" }]}>
                <Feather name="check-circle" size={12} color="#065F46" />
                <Text style={[styles.verifiedText, { color: "#065F46" }]}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={[styles.profileRole, { color: C.primary }]}>{roleLabel}</Text>
          {profile?.averageRating && profile.averageRating > 0 ? (
            <View style={styles.ratingRow}>
              <Feather name="star" size={13} color="#F59E0B" />
              <Text style={[styles.ratingText, { color: C.textSecondary }]}>{profile.averageRating.toFixed(1)} ({profile.totalReviews} reviews)</Text>
            </View>
          ) : null}
        </View>
      </View>

      {profile?.role === "driver" || profile?.role === "both" ? (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#fff" }]}>
            <Text style={[styles.statNum, { color: C.primary }]}>{profile?.completedJobs || 0}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>Completed Jobs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#fff" }]}>
            <Text style={[styles.statNum, { color: C.success }]}>{profile?.averageRating?.toFixed(1) || "—"}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>Avg Rating</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#fff" }]}>
            <Text style={[styles.statNum, { color: C.text }]}>{profile?.totalReviews || 0}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>Reviews</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.section, { backgroundColor: "#fff" }]}>
        <Text style={[styles.sectionTitle, { color: C.textMuted }]}>ACCOUNT</Text>
        <MenuItem icon="user" label="Edit Profile" subtitle="Update your info and preferences" onPress={() => router.push("/profile-setup")} />
        {(profile?.role === "driver" || profile?.role === "both") && (
          <MenuItem icon="truck" label="Driver Details" subtitle={profile?.dotNumber ? `DOT #${profile.dotNumber}` : "Add DOT & insurance info"} onPress={() => router.push("/profile-setup")} />
        )}
        {(profile?.role === "driver" || profile?.role === "both") && (
          <MenuItem icon="navigation" label="Post My Route" subtitle="Let shippers find you on backhaul board" onPress={() => {}} />
        )}
        {(profile?.role === "shipper" || profile?.role === "both") && (
          <MenuItem icon="heart" label="Saved Drivers" subtitle="Rebook trusted carriers directly" onPress={() => {}} />
        )}
        <MenuItem icon="file-text" label="Terms of Service" subtitle="Platform rules and liability" onPress={() => {}} />
      </View>

      <View style={[styles.section, { backgroundColor: "#fff", marginTop: 12 }]}>
        <Text style={[styles.sectionTitle, { color: C.textMuted }]}>SUPPORT</Text>
        <MenuItem icon="help-circle" label="Help & FAQ" subtitle="Common questions answered" onPress={() => {}} />
        <MenuItem icon="shield" label="Safety & Liability" subtitle="How we protect you" onPress={() => {}} />
      </View>

      <View style={[styles.section, { backgroundColor: "#fff", marginTop: 12 }]}>
        <MenuItem icon="log-out" label="Sign Out" onPress={handleLogout} danger />
      </View>
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
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 16, marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  avatarLarge: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarLargeText: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#fff" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  profileName: { fontFamily: "Inter_600SemiBold", fontSize: 18 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  verifiedText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  profileRole: { fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2, textAlign: "center" },
  section: { marginHorizontal: 16, borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 11, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, letterSpacing: 0.5 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#F8FAFC" },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontFamily: "Inter_500Medium", fontSize: 15 },
  menuSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
});
