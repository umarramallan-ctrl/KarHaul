import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/ThemeContext";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: C.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function StepCard({ num, icon, title, body }: { num: string; icon: string; title: string; body: string }) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  return (
    <View style={[styles.stepCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.stepIcon}>
        <Feather name={icon as any} size={20} color={C.primary} />
      </View>
      <Text style={[styles.stepNum, { color: C.textMuted }]}>Step {num}</Text>
      <Text style={[styles.stepTitle, { color: C.text }]}>{title}</Text>
      <Text style={[styles.stepBody, { color: C.textSecondary }]}>{body}</Text>
    </View>
  );
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>About KarHaul</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={[styles.heroTagline, { color: C.primary }]}>DIRECT AUTO TRANSPORT</Text>
        <Text style={styles.heroTitle}>Zero brokers.{"\n"}Zero middlemen.</Text>
        <Text style={styles.heroBody}>
          KarHaul is a technology marketplace connecting vehicle shippers directly with licensed carriers — putting money back in the pockets of both drivers and customers.
        </Text>
      </View>

      <View style={styles.content}>

        {/* Problem */}
        <Section title="The problem we solve">
          <View style={styles.callout}>
            <Text style={styles.calloutText}>
              Traditional auto transport brokers take 20–40% of shipping costs while adding little value. Shippers overpay, carriers are underpaid, and communication is opaque.
            </Text>
            <Text style={[styles.calloutText, { marginTop: 10 }]}>
              KarHaul eliminates this by letting shippers post loads directly and receive bids from verified carriers. Our platform handles escrow, messaging, BOL documents, and ratings — no broker needed.
            </Text>
          </View>
        </Section>

        {/* For Shippers */}
        <Section title="For shippers">
          <StepCard num="1" icon="dollar-sign" title="Post your load" body="Describe your vehicle, enter addresses, set your budget, and go live in minutes." />
          <StepCard num="2" icon="users" title="Receive bids" body="Verified carriers bid directly. Compare ratings, completed jobs, and pricing — then accept the best offer." />
          <StepCard num="3" icon="shield" title="Ship with confidence" body="Funds held in escrow until delivery. Download your Bill of Lading. Rate your carrier." />
        </Section>

        {/* For Drivers */}
        <Section title="For drivers">
          <StepCard num="1" icon="truck" title="Browse open loads" body="Filter by route, vehicle type, and transport style. Find backhaul opportunities on your existing routes." />
          <StepCard num="2" icon="dollar-sign" title="Bid your price" body="Submit your own pricing — no broker telling you what you'll earn. Keep 95% of every job." />
          <StepCard num="3" icon="check-circle" title="Get paid fast" body="Escrow releases on delivery confirmation. Build your rating to win more business." />
        </Section>

        {/* Company */}
        <Section title="About EvoPoint LLC">
          <View style={[styles.companyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.companyBody, { color: C.textSecondary }]}>
              KarHaul is a product of <Text style={{ fontFamily: "Inter_600SemiBold", color: C.text }}>EvoPoint LLC</Text>, a technology company focused on removing friction from industries that have historically relied on inefficient intermediaries.
            </Text>
            <Text style={[styles.companyBody, { color: C.textSecondary, marginTop: 10 }]}>
              Our team has first-hand experience with the pain points on both sides of the auto transport equation — and we built KarHaul to fix them.
            </Text>
          </View>
        </Section>

        {/* CTA */}
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: C.primary }]}
          onPress={() => router.push("/")}
        >
          <Text style={styles.ctaBtnText}>Get Started</Text>
          <Feather name="arrow-right" size={16} color="#fff" />
        </Pressable>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  hero: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingVertical: 32,
    marginBottom: 8,
  },
  heroTagline: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 10,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: "#fff",
    lineHeight: 36,
    marginBottom: 12,
  },
  heroBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#94A3B8",
    lineHeight: 22,
  },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 24 },
  section: { gap: 12 },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  callout: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 16,
  },
  calloutText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#92400E",
    lineHeight: 21,
  },
  stepCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  stepTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  stepBody: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  companyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  companyBody: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  ctaBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
