import { useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import Colors from "@/constants/colors";

// This screen is the backing route for the "Post Load" tab.
// In ClassicTabLayout the tabBarButton intercepts the press and opens the modal
// directly, so this screen is rarely seen. In NativeTabLayout (iOS 16+) the tab
// trigger navigates here first, and we open the modal immediately.
export default function PostLoadTab() {
  const C = Colors.light;
  const opened = useRef(false);

  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      // Small delay so the navigation stack is settled before pushing the modal
      const t = setTimeout(() => router.push("/create-shipment"), 50);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.background, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={C.primary} size="large" />
    </View>
  );
}
