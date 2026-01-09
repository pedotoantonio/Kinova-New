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
  Image,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
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
  proposedAction?: ProposedAction | null;
  createdAt: string;
}

interface ProposedAction {
  type: string;
  data: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
}

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  uri?: string;
  status: "uploading" | "analyzing" | "ready" | "error";
  error?: string;
}

const AUTH_TOKEN_KEY = "@kinova/auth_token";

const SUGGESTION_CHIPS = {
  it: [
    { icon: "calendar", text: "Cosa ho in programma oggi?" },
    { icon: "check-square", text: "Quali task devo completare?" },
    { icon: "shopping-cart", text: "Cosa devo comprare?" },
    { icon: "dollar-sign", text: "Quanto ho speso questo mese?" },
  ],
  en: [
    { icon: "calendar", text: "What do I have planned today?" },
    { icon: "check-square", text: "What tasks do I need to complete?" },
    { icon: "shopping-cart", text: "What do I need to buy?" },
    { icon: "dollar-sign", text: "How much did I spend this month?" },
  ],
};

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ messageId: string; action: ProposedAction } | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const scrollButtonOpacity = useSharedValue(0);

  const { data: activeConversation, refetch: refetchConversation } = useQuery<Conversation>({
    queryKey: ["/api/assistant/conversations", activeConversationId],
    enabled: !!activeConversationId,
  });

  const messages = activeConversation?.messages || [];
  const suggestions = SUGGESTION_CHIPS[language as keyof typeof SUGGESTION_CHIPS] || SUGGESTION_CHIPS.it;

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<Conversation>("POST", "/api/assistant/conversations", {});
    },
    onSuccess: (data: Conversation) => {
      setActiveConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/conversations"] });
    },
  });

  const handleNewChat = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveConversationId(null);
    setStreamingContent("");
    setPendingAction(null);
    setSelectedMessage(null);
    await createConversationMutation.mutateAsync();
  }, [createConversationMutation]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() && attachments.length === 0) return;
    if (!activeConversationId) {
      const conv = await createConversationMutation.mutateAsync();
      sendMessage(conv.id, inputText, attachments);
    } else {
      sendMessage(activeConversationId, inputText, attachments);
    }
  }, [inputText, activeConversationId, attachments]);

  const handleSuggestionPress = useCallback(async (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!activeConversationId) {
      const conv = await createConversationMutation.mutateAsync();
      sendMessage(conv.id, text, []);
    } else {
      sendMessage(activeConversationId, text, []);
    }
  }, [activeConversationId]);

  const sendMessage = async (conversationId: string, content: string, files: Attachment[]) => {
    const messageContent = content.trim();
    const attachmentIds = files.filter(f => f.status === "ready" && f.id).map(f => f.id);
    setLastUserMessage(messageContent);
    setInputText("");
    setAttachments([]);
    setIsStreaming(true);
    setStreamingContent("");
    setSelectedMessage(null);

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
          attachments: attachmentIds.length > 0 ? attachmentIds : undefined,
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
      let fullContent = "";

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
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
              if (data.proposedAction) {
                setPendingAction({
                  messageId: data.messageId || "",
                  action: data.proposedAction,
                });
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
        setStreamingContent((prev) => prev + "\n\n[" + t.assistant.stopped + "]");
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

  const handleRegenerate = useCallback(async () => {
    if (!lastUserMessage || !activeConversationId || isStreaming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendMessage(activeConversationId, lastUserMessage, []);
  }, [lastUserMessage, activeConversationId, isStreaming]);

  const handleCopyMessage = useCallback(async (content: string) => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowCopiedToast(true);
    setSelectedMessage(null);
    setTimeout(() => setShowCopiedToast(false), 2000);
  }, []);

  const handleRetryMessage = useCallback(async (msg: Message) => {
    if (msg.role === "user" && activeConversationId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedMessage(null);
      sendMessage(activeConversationId, msg.content, []);
    }
  }, [activeConversationId]);

  const handleActionResponse = async (approved: boolean) => {
    if (!pendingAction) return;
    Haptics.impactAsync(approved ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    
    if (!approved) {
      setPendingAction(null);
      setStreamingContent(language === "it" ? "Azione annullata." : "Action cancelled.");
      setTimeout(() => {
        setStreamingContent("");
        refetchConversation();
      }, 1500);
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const response = await fetch(new URL("/api/assistant/confirm", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          actionType: pendingAction.action.type,
          actionData: pendingAction.action.data,
          conversationId: activeConversationId,
          language,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStreamingContent(`✅ ${result.message}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setStreamingContent(`❌ ${result.message || (language === "it" ? "Errore durante l'operazione" : "Operation failed")}`);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shopping"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      
      setTimeout(() => {
        setStreamingContent("");
        refetchConversation();
      }, 1500);
    } catch {
      Alert.alert(t.common.error, t.errors.networkError);
    } finally {
      setPendingAction(null);
    }
  };

  const handleAttachPhoto = useCallback(async () => {
    setShowAttachMenu(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.common.error, t.assistant.permissionRequired);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      await uploadFile(result.assets[0].uri, result.assets[0].fileName || `photo-${Date.now()}.jpg`, "image/jpeg");
    }
  }, [t]);

  const handleAttachGallery = useCallback(async () => {
    setShowAttachMenu(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.common.error, t.assistant.permissionRequired);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      await uploadFile(result.assets[0].uri, result.assets[0].fileName || `image-${Date.now()}.jpg`, "image/jpeg");
    }
  }, [t]);

  const handleAttachDocument = useCallback(async () => {
    setShowAttachMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain", "text/csv", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      });

      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        await uploadFile(file.uri, file.name, file.mimeType || "application/octet-stream");
      }
    } catch {
      Alert.alert(t.common.error, t.errors.networkError);
    }
  }, [t]);

  const uploadFile = async (uri: string, filename: string, mimeType: string) => {
    const tempId = `temp-${Date.now()}`;
    setAttachments(prev => [...prev, { id: tempId, filename, mimeType, uri, status: "uploading" }]);

    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);

      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      
      setAttachments(prev => prev.map(a => a.id === tempId ? { ...a, status: "analyzing" as const } : a));
      
      const response = await fetch(new URL("/api/assistant/uploads", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(prev => prev.map(a => a.id === tempId ? { ...a, id: data.id, status: "ready" as const } : a));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setAttachments(prev => prev.map(a => a.id === tempId ? { ...a, status: "error" as const, error: t.errors.serverError } : a));
      }
    } catch {
      setAttachments(prev => prev.map(a => a.id === tempId ? { ...a, status: "error" as const, error: t.errors.networkError } : a));
    }
  };

  const retryUpload = async (att: Attachment) => {
    if (!att.uri) return;
    setAttachments(prev => prev.filter(a => a.id !== att.id));
    await uploadFile(att.uri, att.filename, att.mimeType);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

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

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === "user";
    const isSelected = selectedMessage?.id === item.id;
    const isLastAssistant = !isUser && index === messages.length - 1;
    
    return (
      <View>
        <Pressable
          style={[styles.messageRow, isUser && styles.messageRowUser]}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectedMessage(item);
          }}
        >
          <View
            style={[
              styles.messageBubble,
              isUser ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface },
              isSelected && styles.messageBubbleSelected,
            ]}
          >
            <Text style={[styles.messageText, isUser ? { color: "#FFFFFF" } : { color: theme.text }]}>
              {item.content}
            </Text>
          </View>
        </Pressable>
        
        {isSelected ? (
          <Animated.View entering={FadeIn.duration(150)} style={[styles.messageMenu, isUser && styles.messageMenuUser]}>
            <Pressable style={styles.messageMenuItem} onPress={() => handleCopyMessage(item.content)}>
              <Feather name="copy" size={16} color={theme.text} />
              <Text style={[styles.messageMenuText, { color: theme.text }]}>{t.assistant.copy}</Text>
            </Pressable>
            {isUser ? (
              <Pressable style={styles.messageMenuItem} onPress={() => handleRetryMessage(item)}>
                <Feather name="refresh-cw" size={16} color={theme.text} />
                <Text style={[styles.messageMenuText, { color: theme.text }]}>{t.assistant.retry}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.messageMenuItem} onPress={() => setSelectedMessage(null)}>
              <Feather name="x" size={16} color={theme.textSecondary} />
            </Pressable>
          </Animated.View>
        ) : null}
        
        {isLastAssistant && !isStreaming && messages.length > 1 ? (
          <Pressable style={[styles.regenerateButton, { borderColor: theme.border }]} onPress={handleRegenerate}>
            <Feather name="refresh-cw" size={14} color={theme.textSecondary} />
            <Text style={[styles.regenerateText, { color: theme.textSecondary }]}>{t.assistant.regenerate}</Text>
          </Pressable>
        ) : null}
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

  const renderActionConfirmation = () => {
    if (!pendingAction) return null;
    const actionLabels: Record<string, string> = {
      create_event: t.assistant.confirmCreateEvent,
      update_event: t.assistant.confirmUpdateEvent,
      delete_event: t.assistant.confirmDeleteEvent,
      create_task: t.assistant.confirmCreateTask,
      complete_task: t.assistant.confirmCompleteTask,
      delete_task: t.assistant.confirmDeleteTask,
      add_shopping: t.assistant.confirmAddShopping,
      add_shopping_item: t.assistant.confirmAddShopping,
      remove_shopping: t.assistant.confirmRemoveShopping,
      add_expense: t.assistant.confirmAddExpense,
      create_expense: t.assistant.confirmAddExpense,
    };

    const actionData = pendingAction.action.data;
    const summaryLines: string[] = [];
    
    if (actionData.title) summaryLines.push(`${language === "it" ? "Titolo" : "Title"}: ${actionData.title}`);
    if (actionData.name) summaryLines.push(`${language === "it" ? "Nome" : "Name"}: ${actionData.name}`);
    if (actionData.amount) summaryLines.push(`${language === "it" ? "Importo" : "Amount"}: €${actionData.amount}`);
    if (actionData.description) summaryLines.push(`${language === "it" ? "Descrizione" : "Description"}: ${actionData.description}`);
    if (actionData.startDate) summaryLines.push(`${language === "it" ? "Data" : "Date"}: ${new Date(actionData.startDate as string).toLocaleDateString(language === "it" ? "it-IT" : "en-US")}`);
    if (actionData.dueDate) summaryLines.push(`${language === "it" ? "Scadenza" : "Due"}: ${new Date(actionData.dueDate as string).toLocaleDateString(language === "it" ? "it-IT" : "en-US")}`);
    if (actionData.category) summaryLines.push(`${language === "it" ? "Categoria" : "Category"}: ${actionData.category}`);

    return (
      <Animated.View entering={FadeIn} style={[styles.actionConfirmation, { backgroundColor: theme.surface, bottom: tabBarHeight + 70 }]}>
        <Text style={[styles.actionTitle, { color: theme.text }]}>
          {actionLabels[pendingAction.action.type] || t.assistant.confirmAction}
        </Text>
        {summaryLines.length > 0 ? (
          <View style={styles.actionSummary}>
            {summaryLines.map((line, idx) => (
              <Text key={idx} style={[styles.actionSummaryText, { color: theme.textSecondary }]}>{line}</Text>
            ))}
          </View>
        ) : null}
        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleActionResponse(false)}
          >
            <Feather name="x" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{t.common.cancel}</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleActionResponse(true)}
          >
            <Feather name="check" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{t.common.confirm}</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  const renderSuggestionChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll} contentContainerStyle={styles.suggestionsContainer}>
      {suggestions.map((chip, idx) => (
        <Pressable
          key={idx}
          style={[styles.suggestionChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => handleSuggestionPress(chip.text)}
        >
          <Feather name={chip.icon as keyof typeof Feather.glyphMap} size={14} color={theme.primary} />
          <Text style={[styles.suggestionText, { color: theme.text }]} numberOfLines={1}>{chip.text}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "20" }]}>
        <Feather name="message-circle" size={48} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{t.assistant.title}</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{t.assistant.startChat}</Text>
      {renderSuggestionChips()}
    </View>
  );

  const getAttachmentStatusIcon = (status: Attachment["status"]) => {
    switch (status) {
      case "uploading": return "upload-cloud";
      case "analyzing": return "cpu";
      case "ready": return "check-circle";
      case "error": return "alert-circle";
      default: return "file";
    }
  };

  const getAttachmentStatusColor = (status: Attachment["status"]) => {
    switch (status) {
      case "uploading": return theme.primary;
      case "analyzing": return "#F59E0B";
      case "ready": return "#22C55E";
      case "error": return "#EF4444";
      default: return theme.textSecondary;
    }
  };

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
        contentContainerStyle={[styles.messagesList, { paddingBottom: tabBarHeight + 80 }]}
        ListEmptyComponent={!isStreaming && !streamingContent ? renderEmptyState : null}
        ListFooterComponent={renderStreamingMessage}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {showScrollButton ? (
        <Animated.View style={[styles.scrollButton, { bottom: tabBarHeight + 80 }, animatedScrollButtonStyle]}>
          <Pressable
            style={[styles.scrollButtonInner, { backgroundColor: theme.surface }]}
            onPress={scrollToBottom}
          >
            <Feather name="chevron-down" size={20} color={theme.text} />
          </Pressable>
        </Animated.View>
      ) : null}

      {showCopiedToast ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.toast, { backgroundColor: theme.surface }]}>
          <Feather name="check" size={16} color="#22C55E" />
          <Text style={[styles.toastText, { color: theme.text }]}>{t.assistant.copied}</Text>
        </Animated.View>
      ) : null}

      {pendingAction ? renderActionConfirmation() : null}

      {attachments.length > 0 ? (
        <View style={[styles.attachmentsRow, { backgroundColor: theme.surface, bottom: tabBarHeight + 56 }]}>
          {attachments.map((att) => (
            <View key={att.id} style={[styles.attachmentChip, { backgroundColor: theme.backgroundRoot, borderColor: getAttachmentStatusColor(att.status) }]}>
              {att.status === "uploading" || att.status === "analyzing" ? (
                <ActivityIndicator size="small" color={getAttachmentStatusColor(att.status)} />
              ) : att.mimeType.startsWith("image/") && att.uri ? (
                <Image source={{ uri: att.uri }} style={styles.attachmentImage} />
              ) : (
                <Feather name={getAttachmentStatusIcon(att.status)} size={14} color={getAttachmentStatusColor(att.status)} />
              )}
              <View style={styles.attachmentInfo}>
                <Text style={[styles.attachmentName, { color: theme.text }]} numberOfLines={1}>
                  {att.filename}
                </Text>
                {att.status !== "ready" ? (
                  <Text style={[styles.attachmentStatus, { color: getAttachmentStatusColor(att.status) }]}>
                    {att.status === "uploading" ? t.assistant.uploadingFile : 
                     att.status === "analyzing" ? t.assistant.analyzing :
                     att.error || t.errors.serverError}
                  </Text>
                ) : null}
              </View>
              {att.status === "error" ? (
                <Pressable onPress={() => retryUpload(att)} hitSlop={8}>
                  <Feather name="refresh-cw" size={14} color={theme.primary} />
                </Pressable>
              ) : null}
              <Pressable onPress={() => removeAttachment(att.id)} hitSlop={8}>
                <Feather name="x" size={16} color={theme.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {showAttachMenu ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[styles.attachMenu, { backgroundColor: theme.surface, bottom: tabBarHeight + 60 }]}
        >
          <Pressable style={styles.attachMenuItem} onPress={handleAttachPhoto}>
            <Feather name="camera" size={20} color={theme.text} />
            <Text style={[styles.attachMenuText, { color: theme.text }]}>{t.assistant.attachPhoto}</Text>
          </Pressable>
          <Pressable style={styles.attachMenuItem} onPress={handleAttachGallery}>
            <Feather name="image" size={20} color={theme.text} />
            <Text style={[styles.attachMenuText, { color: theme.text }]}>{t.assistant.attachGallery}</Text>
          </Pressable>
          <Pressable style={styles.attachMenuItem} onPress={handleAttachDocument}>
            <Feather name="file-text" size={20} color={theme.text} />
            <Text style={[styles.attachMenuText, { color: theme.text }]}>{t.assistant.attachFile}</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      <View style={[styles.inputContainer, { backgroundColor: theme.surface, bottom: tabBarHeight }]}>
        <Pressable
          style={styles.attachButton}
          onPress={() => setShowAttachMenu(!showAttachMenu)}
          disabled={isStreaming}
        >
          <Feather name="plus" size={22} color={showAttachMenu ? theme.primary : theme.textSecondary} />
        </Pressable>

        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundRoot, color: theme.text }]}
          placeholder={t.assistant.placeholder}
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
          editable={!isStreaming}
          onFocus={() => setShowAttachMenu(false)}
        />

        {isStreaming ? (
          <Pressable style={[styles.sendButton, { backgroundColor: "#EF4444" }]} onPress={handleStop}>
            <Feather name="square" size={18} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.sendButton,
              { backgroundColor: (inputText.trim() || attachments.filter(a => a.status === "ready").length > 0) ? theme.primary : theme.border },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() && attachments.filter(a => a.status === "ready").length === 0}
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
  messageBubbleSelected: {
    borderWidth: 2,
    borderColor: "#2F7F6D",
  },
  messageText: {
    ...Typography.body,
    lineHeight: 22,
  },
  messageMenu: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  messageMenuUser: {
    justifyContent: "flex-end",
  },
  messageMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.xs,
  },
  messageMenuText: {
    ...Typography.small,
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  regenerateText: {
    ...Typography.small,
  },
  streamingIndicator: {
    marginTop: Spacing.xs,
    alignSelf: "flex-start",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.title,
  },
  emptySubtitle: {
    ...Typography.body,
    marginTop: Spacing.xs,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  suggestionsScroll: {
    maxHeight: 100,
  },
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  suggestionText: {
    ...Typography.small,
    maxWidth: 200,
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
  toast: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  toastText: {
    ...Typography.body,
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
  attachButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
  attachMenu: {
    position: "absolute",
    left: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  attachMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  attachMenuText: {
    ...Typography.body,
  },
  attachmentsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    maxWidth: 200,
    borderWidth: 1,
  },
  attachmentInfo: {
    flex: 1,
    minWidth: 0,
  },
  attachmentName: {
    ...Typography.small,
  },
  attachmentStatus: {
    ...Typography.caption,
    marginTop: 2,
  },
  attachmentImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  actionConfirmation: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  actionTitle: {
    ...Typography.body,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  actionSummary: {
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  actionSummaryText: {
    ...Typography.small,
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  approveButton: {
    backgroundColor: "#22C55E",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
