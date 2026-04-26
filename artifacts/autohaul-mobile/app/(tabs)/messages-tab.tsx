import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Platform, ActivityIndicator
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listConversations } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/ThemeContext";

export default function MessagesTabScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
    enabled: isAuthenticated,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const conversations = data?.conversations || [];

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Messages</Text>
        </View>
        <View style={styles.centered}>
          <Feather name="message-circle" size={48} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>Sign in to view messages</Text>
          <Pressable style={[styles.ctaBtn, { backgroundColor: C.primary }]} onPress={() => router.push("/auth")}>
            <Text style={styles.ctaBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString();
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Messages</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : conversations.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="message-circle" size={48} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No messages yet</Text>
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>When you bid on loads or get bids, messages will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: C.borderLight }]} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.convRow, { opacity: pressed ? 0.88 : 1, backgroundColor: C.surface }]}
              onPress={() => router.push({ pathname: "/messages/[conversationId]", params: { conversationId: item.id, name: item.otherUserName } })}
            >
              <View style={[styles.avatar, { backgroundColor: C.primary }]}>
                <Text style={styles.avatarText}>{(item.otherUserName || "U").charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.convContent}>
                <View style={styles.convTop}>
                  <Text style={[styles.convName, { color: C.text }]} numberOfLines={1}>{item.otherUserName}</Text>
                  <Text style={[styles.convTime, { color: C.textMuted }]}>{formatTime(item.lastMessageAt)}</Text>
                </View>
                <View style={styles.convBottom}>
                  <Text style={[styles.convPreview, { color: C.textSecondary }]} numberOfLines={1}>
                    {item.lastMessage || "Start a conversation"}
                  </Text>
                  {(item.unreadCount || 0) > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: C.primary }]}>
                      <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 28 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  ctaBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  ctaBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  sep: { height: 1 },
  convRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_600SemiBold", fontSize: 20, color: "#fff" },
  convContent: { flex: 1 },
  convTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  convName: { fontFamily: "Inter_600SemiBold", fontSize: 15, flex: 1, marginRight: 8 },
  convTime: { fontFamily: "Inter_400Regular", fontSize: 12 },
  convBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  convPreview: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1, marginRight: 8 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  unreadText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
});
