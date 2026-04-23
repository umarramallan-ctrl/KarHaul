import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, Text, Pressable, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";

// ─── Role helpers ──────────────────────────────────────────────────────────────

type RoleProps = {
  isAuthenticated: boolean;
  isShipper: boolean;      // role === "shipper" || role === "both"
  isDriver: boolean;       // role === "driver" || role === "both"
  isBoth: boolean;         // role === "both"
  noRole: boolean;         // signed-in but profile has no role set yet
};

// ─── NativeTabs layout (iOS 16+ Liquid Glass) ─────────────────────────────────

function NativeTabLayout({ isAuthenticated, isShipper, isDriver, noRole }: RoleProps) {
  // Tab visibility mirrors ClassicTabLayout below.
  const showBrowse = (isDriver || !isAuthenticated) && !noRole;
  const showMyLoads = isShipper && !noRole;
  const showPostLoad = isShipper && !noRole && !isDriver; // pure shipper only
  const showMyJobs = isDriver && !noRole;
  const showMessages = (isShipper || isDriver) && !noRole;

  return (
    <NativeTabs>
      {showBrowse && (
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass.circle.fill" }} />
          <Label>Browse</Label>
        </NativeTabs.Trigger>
      )}
      {showMyLoads && (
        <NativeTabs.Trigger name="my-loads">
          <Icon sf={{ default: "shippingbox", selected: "shippingbox.fill" }} />
          <Label>My Loads</Label>
        </NativeTabs.Trigger>
      )}
      {showPostLoad && (
        <NativeTabs.Trigger name="post-load">
          <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
          <Label>Post Load</Label>
        </NativeTabs.Trigger>
      )}
      {showMyJobs && (
        <NativeTabs.Trigger name="my-jobs">
          <Icon sf={{ default: "truck.box", selected: "truck.box.badge.clock.fill" }} />
          <Label>My Jobs</Label>
        </NativeTabs.Trigger>
      )}
      {showMessages && (
        <NativeTabs.Trigger name="messages-tab">
          <Icon sf={{ default: "message", selected: "message.fill" }} />
          <Label>Messages</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="more">
        <Icon sf={{ default: "ellipsis.circle", selected: "ellipsis.circle.fill" }} />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── Classic tabs layout (Android + older iOS) ────────────────────────────────

function ClassicTabLayout({ isAuthenticated, isShipper, isDriver, noRole }: RoleProps) {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();
  const C = Colors.light;

  // Visibility: `undefined` = shown, `null` = hidden
  const showBrowse = (isDriver || !isAuthenticated) && !noRole ? undefined : null;
  // Pure-shipper gets Post Load tab; "both" keeps it out (My Loads has a Post Load button)
  const showMyLoads = isShipper && !noRole ? undefined : null;
  const showPostLoad = isShipper && !isDriver && !noRole ? undefined : null;
  const showMyJobs = isDriver && !noRole ? undefined : null;
  const showMessages = (isShipper || isDriver) && !noRole ? undefined : null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.tabIconDefault,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 10 },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#fff",
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: C.border,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#fff" }]} />
          ) : null,
      }}
    >
      {/* Browse — drivers + unauthenticated guests */}
      <Tabs.Screen
        name="index"
        options={{
          href: showBrowse,
          title: "Browse",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="magnifyingglass" tintColor={color} size={24} />
            ) : (
              <Feather name="search" size={22} color={color} />
            ),
        }}
      />

      {/* My Loads — shippers */}
      <Tabs.Screen
        name="my-loads"
        options={{
          href: showMyLoads,
          title: "My Loads",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="shippingbox" tintColor={color} size={24} />
            ) : (
              <Feather name="package" size={22} color={color} />
            ),
        }}
      />

      {/* Post Load — shippers only (not "both"); intercepts press to open modal */}
      <Tabs.Screen
        name="post-load"
        options={{
          href: showPostLoad,
          title: "Post Load",
          tabBarButton:
            showPostLoad === undefined
              ? ({ style }) => (
                  <Pressable
                    style={style}
                    onPress={() => router.push("/create-shipment")}
                    accessibilityRole="button"
                    accessibilityLabel="Post Load"
                  >
                    <View style={tabBtnInner}>
                      {isIOS ? (
                        <SymbolView name="plus.circle" tintColor={C.primary} size={24} />
                      ) : (
                        <Feather name="plus-circle" size={22} color={C.primary} />
                      )}
                      <Text style={[tabBtnLabel, { color: C.primary }]}>Post Load</Text>
                    </View>
                  </Pressable>
                )
              : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="plus.circle" tintColor={color} size={24} />
            ) : (
              <Feather name="plus-circle" size={22} color={color} />
            ),
        }}
      />

      {/* My Jobs — drivers */}
      <Tabs.Screen
        name="my-jobs"
        options={{
          href: showMyJobs,
          title: "My Jobs",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="truck.box" tintColor={color} size={24} />
            ) : (
              <Feather name="truck" size={22} color={color} />
            ),
        }}
      />

      {/* Messages — authenticated users with a role */}
      <Tabs.Screen
        name="messages-tab"
        options={{
          href: showMessages,
          title: "Messages",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="message" tintColor={color} size={24} />
            ) : (
              <Feather name="message-circle" size={22} color={color} />
            ),
        }}
      />

      {/* More — always visible */}
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="ellipsis.circle" tintColor={color} size={24} />
            ) : (
              <Feather name="more-horizontal" size={22} color={color} />
            ),
        }}
      />

      {/* Hidden screens — accessible via router.push but no tab bar button */}
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Tab-button inner layout (used by the "Post Load" custom button) ──────────

const tabBtnInner: import("react-native").ViewStyle = {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
};
const tabBtnLabel: import("react-native").TextStyle = {
  fontFamily: "Inter_500Medium",
  fontSize: 10,
  marginTop: 2,
};

// ─── Root export ───────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const role = profile?.role ?? null;
  const isShipper = role === "shipper" || role === "both";
  const isDriver = role === "driver" || role === "both";
  const isBoth = role === "both";
  // noRole: signed in, profile loaded, but no role assigned yet
  const noRole = isAuthenticated && profile !== undefined && profile !== null && !role;

  const roleProps: RoleProps = { isAuthenticated, isShipper, isDriver, isBoth, noRole };

  if (isLiquidGlassAvailable()) return <NativeTabLayout {...roleProps} />;
  return <ClassicTabLayout {...roleProps} />;
}
