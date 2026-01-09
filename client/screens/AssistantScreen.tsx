import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Colors, Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useI18n } from "@/lib/i18n";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/useTheme";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: string | null;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

const AUTH_TOKEN_KEY = "@kinova/token";

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollButtonOpacity = useSharedValue(0);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/assistant/conversations"],
    enabled: !!user,
  });

  const { data: activeConversation, refetch: refetchConversation } = useQuery<Conversation>({
    queryKey: ["/api/assistant/conversations", activeConversationId],
    enabled: !!activeConversationId,
  });

  const messages = activeConversation?.messages || [];

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/assistant/conversations", {});
      return (res as Response).json();
    },
    onSuccess: (data: Conversation) => {
      setActiveConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/conversations"] });
    },
  });

  const handleNewChat = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await createConversationMutation.mutateAsync();
  }, [createConversationMutation]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    if (!activeConversationId) {
      const conv = await createConversationMutation.mutateAsync();
      sendMessage(conv.id, inputText);
    } else {
      sendMessage(activeConversationId, inputText);
    }
  }, [inputText, activeConversationId]);

  const sendMessage = async (conversationId: string, content: string) => {
    const messageContent = content.trim();
    setInputText("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      abortControllerRef.current = new AbortController();
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      const response = await fetch(new URL("/api/assistant/chat", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          content: messageContent,
          language,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setStreamingContent((prev) => prev + data.content);
              }
              if (data.done) {
                setIsStreaming(false);
                refetchConversation();
                queryClient.invalidateQueries({ queryKey: ["/api/assistant/conversations"] });
              }
            } catch {}
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        setStreamingContent((prev) => prev + "\n\n[Interrotto]");
      } else {
        Alert.alert(t.common.error, t.errors.networkError);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      refetchConversation();
    }
  };

  const handleStop = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleScroll = useCallback(
    (event: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = 50;
      const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
      setIsAtBottom(isBottom);
      setShowScrollButton(!isBottom && contentSize.height > layoutMeasurement.height);
      scrollButtonOpacity.value = withTiming(isBottom ? 0 : 1, { duration: 200 });
    },
    [scrollButtonOpacity]
  );

  useEffect(() => {
    if (isAtBottom && (messages.length > 0 || streamingContent)) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages, streamingContent, isAtBottom]);

  const animatedScrollButtonStyle = useAnimatedStyle(() => ({
    opacity: scrollButtonOpacity.value,
    transform: [{ scale: scrollButtonOpacity.value }],
  }));

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        <View
          style={[
            styles.messageBubble,
            isUser ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface },
          ]}
        >
          <Text style={[styles.messageText, isUser ? { color: "#FFFFFF" } : { color: theme.text }]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const renderStreamingMessage = () => {
    if (!streamingContent && !isStreaming) return null;
    return (
      <View style={styles.messageRow}>
        <View style={[styles.messageBubble, { backgroundColor: theme.surface }]}>
          <Text style={[styles.messageText, { color: theme.text }]}>
            {streamingContent || t.assistant.thinking}
          </Text>
          {isStreaming ? <ActivityIndicator size="small" color={theme.primary} style={styles.streamingIndicator} /> : null}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="message-circle" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{t.assistant.title}</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{t.assistant.startChat}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="cpu" size={20} color={theme.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t.assistant.title}</Text>
        </View>
        <Pressable
          style={styles.newChatButton}
          onPress={handleNewChat}
          disabled={createConversationMutation.isPending}
        >
          <Feather name="plus" size={22} color={theme.primary} />
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[styles.messagesList, { paddingBottom: tabBarHeight + 70 }]}
        ListEmptyComponent={!isStreaming && !streamingContent ? renderEmptyState : null}
        ListFooterComponent={renderStreamingMessage}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {showScrollButton ? (
        <Animated.View style={[styles.scrollButton, { bottom: tabBarHeight + 70 }, animatedScrollButtonStyle]}>
          <Pressable
            style={[styles.scrollButtonInner, { backgroundColor: theme.surface }]}
            onPress={scrollToBottom}
          >
            <Feather name="chevron-down" size={20} color={theme.text} />
          </Pressable>
        </Animated.View>
      ) : null}

      <View style={[styles.inputContainer, { backgroundColor: theme.surface, bottom: tabBarHeight }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundRoot, color: theme.text }]}
          placeholder={t.assistant.placeholder}
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
          editable={!isStreaming}
        />

        {isStreaming ? (
          <Pressable style={[styles.sendButton, { backgroundColor: "#EF4444" }]} onPress={handleStop}>
            <Feather name="square" size={18} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? theme.primary : theme.border },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Feather name="send" size={18} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...Typography.subtitle,
    fontWeight: "600",
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    marginBottom: Spacing.sm,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  messageText: {
    ...Typography.body,
    lineHeight: 22,
  },
  streamingIndicator: {
    marginTop: Spacing.xs,
    alignSelf: "flex-start",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    ...Typography.title,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    ...Typography.body,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  scrollButton: {
    position: "absolute",
    alignSelf: "center",
  },
  scrollButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
