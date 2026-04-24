import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/ThemeContext";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  return (
    <View style={[styles.section, { backgroundColor: C.surface }]}>
      <Text style={[styles.sectionTitle, { color: C.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ icon, title, body }: { icon: string; title: string; body: string }) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  return (
    <View style={[styles.infoRow, { borderTopColor: C.borderLight }]}>
      <View style={[styles.infoIcon, { backgroundColor: "#EFF6FF" }]}>
        <Feather name={icon as any} size={18} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.infoBody, { color: C.textSecondary }]}>{body}</Text>
      </View>
    </View>
  );
}

export default function SafetyInsuranceScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingBottom: bottomPadding + 40 }}
    >
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Safety & Insurance</Text>
      </View>

      <View style={[styles.heroBanner, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
        <Feather name="shield" size={32} color={C.primary} />
        <Text style={[styles.heroTitle, { color: C.text }]}>Built with safety first</Text>
        <Text style={[styles.heroSub, { color: C.textSecondary }]}>
          KarHaul connects verified carriers and shippers directly — every load is protected by our
          platform guidelines and carrier compliance requirements.
        </Text>
      </View>

      <View style={{ gap: 12, marginTop: 12 }}>
        <Section title="CARRIER VERIFICATION">
          <InfoRow
            icon="check-circle"
            title="DOT Number Required"
            body="All drivers must provide a valid USDOT number before accepting loads. We verify active operating authority through FMCSA records."
          />
          <InfoRow
            icon="file-text"
            title="Insurance on File"
            body="Carriers are required to maintain minimum liability coverage of $750,000 for general freight. Proof of insurance must be current and on file."
          />
          <InfoRow
            icon="truck"
            title="MC Authority Check"
            body="Drivers with interstate loads are verified for active Motor Carrier authority before accessing the platform's bidding features."
          />
        </Section>

        <Section title="SHIPPER PROTECTIONS">
          <InfoRow
            icon="lock"
            title="Carrier-Confirmed Pickup"
            body="Digital confirmation is required at pickup. Both parties sign off on the Bill of Lading within the app before freight is released."
          />
          <InfoRow
            icon="star"
            title="Rating & Review System"
            body="Every completed haul generates a rating. Carriers and shippers with consistent low scores are flagged and reviewed by our team."
          />
          <InfoRow
            icon="alert-circle"
            title="Dispute Resolution"
            body="If a load is damaged or delivery goes wrong, contact our support team. We facilitate communication and provide load documentation."
          />
        </Section>

        <Section title="DRIVER SAFETY">
          <InfoRow
            icon="map-pin"
            title="Route & Load Transparency"
            body="All load details — weight, dimensions, hazmat classification — are disclosed upfront. Drivers are never surprised at the dock."
          />
          <InfoRow
            icon="clock"
            title="Fair Payment Terms"
            body="Payment terms are set before acceptance. KarHaul does not hold funds — drivers are paid directly by shippers per the agreed rate."
          />
          <InfoRow
            icon="phone"
            title="24/7 Support Access"
            body="Our support team is reachable in-app at any time. For emergencies on the road, call 911 first, then contact us for load documentation."
          />
        </Section>

        <Section title="INCIDENT REPORTING">
          <InfoRow
            icon="alert-triangle"
            title="How to Report an Issue"
            body="Use the in-app Chat with Support feature to report incidents, accidents, or disputes. Attach photos directly from the app."
          />
          <InfoRow
            icon="shield-off"
            title="Platform Liability"
            body="KarHaul is a marketplace connecting carriers and shippers. We are not a freight broker and do not assume liability for load damage or loss."
          />
        </Section>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24 },
  heroBanner: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 21 },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 2 },
  infoTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 3 },
  infoBody: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
});
