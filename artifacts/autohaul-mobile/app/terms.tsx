import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
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

function Para({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  return <Text style={[styles.para, { color: C.textSecondary }]}>{children}</Text>;
}

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Terms of Service</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.lastUpdated, { color: C.textMuted }]}>Last updated: April 2025</Text>

        <Section title="1. Acceptance of Terms">
          <Para>
            By accessing or using the KarHaul platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you may not use the Platform. KarHaul is operated by EvoPoint LLC ("Company", "we", "us", or "our").
          </Para>
        </Section>

        <Section title="2. Marketplace Only">
          <Para>
            KarHaul is a technology marketplace that connects vehicle shippers with licensed carriers. We are not a freight broker, carrier, or transportation provider. All transport arrangements are made directly between shippers and carriers.
          </Para>
        </Section>

        <Section title="3. Eligibility">
          <Para>
            You must be at least 18 years old to use the Platform. Carriers must hold all required DOT registrations, operating authorities, and insurance as required by applicable law. You represent that all information you provide is accurate and current.
          </Para>
        </Section>

        <Section title="4. User Accounts">
          <Para>
            You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access to your account. We reserve the right to suspend or terminate accounts that violate these Terms.
          </Para>
        </Section>

        <Section title="5. Prohibited Conduct">
          <Para>
            You may not: (a) use the Platform for any unlawful purpose; (b) post false or misleading information; (c) manipulate ratings or reviews; (d) circumvent the Platform to conduct transactions outside of it; (e) harass or harm other users; or (f) attempt to access systems you are not authorized to access.
          </Para>
        </Section>

        <Section title="6. Fees and Payments">
          <Para>
            KarHaul charges a platform fee on completed transactions. Fees are disclosed prior to confirmation. Escrow funds are held and released upon delivery confirmation in accordance with our payment policies. We are not responsible for disputes between shippers and carriers regarding payment.
          </Para>
        </Section>

        <Section title="7. Ratings and Reviews">
          <Para>
            After each completed transport, both parties may leave a rating and review. Ratings must be honest and based on actual experience. We reserve the right to remove reviews that violate our community guidelines.
          </Para>
        </Section>

        <Section title="8. Limitation of Liability">
          <Para>
            To the maximum extent permitted by law, EvoPoint LLC is not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability shall not exceed the fees paid by you in the 12 months preceding the claim.
          </Para>
        </Section>

        <Section title="9. Indemnification">
          <Para>
            You agree to indemnify and hold harmless EvoPoint LLC and its officers, directors, employees, and agents from any claims, damages, or expenses arising out of your use of the Platform or violation of these Terms.
          </Para>
        </Section>

        <Section title="10. Changes to Terms">
          <Para>
            We may update these Terms from time to time. Continued use of the Platform after changes constitutes your acceptance of the updated Terms. We will notify you of material changes via the Platform or email.
          </Para>
        </Section>

        <Section title="11. Contact">
          <Para>
            Questions about these Terms? Contact us at admin@karhaul.com or at 185 Stockwood Dr Ste 13045, Woodstock, GA 30188.
          </Para>
        </Section>
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
  lastUpdated: { fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 8 },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 20 },
  section: { gap: 8 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  para: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
});
