import { useEffect, useCallback, useState } from "react";
import * as Linking from "expo-linking";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export interface SharedContent {
  type: "text" | "url" | "image" | "file";
  text?: string;
  url?: string;
  mimeType?: string;
}

interface UseShareReceiverOptions {
  onContentReceived?: (content: SharedContent) => void;
}

export function useShareReceiver(options?: UseShareReceiverOptions) {
  const [pendingShare, setPendingShare] = useState<SharedContent | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<{ Main: { screen: string; params?: { sharedContent: SharedContent } } }>>();

  const handleUrl = useCallback((event: { url: string }) => {
    try {
      const { queryParams, path } = Linking.parse(event.url);
      
      if (path === "share" || path?.startsWith("share")) {
        const content: SharedContent = {
          type: "text",
        };

        if (queryParams?.text) {
          content.type = "text";
          content.text = String(queryParams.text);
        }

        if (queryParams?.url) {
          content.type = "url";
          content.url = String(queryParams.url);
          if (queryParams.text) {
            content.text = String(queryParams.text);
          }
        }

        if (queryParams?.mimeType) {
          content.mimeType = String(queryParams.mimeType);
          if (content.mimeType.startsWith("image/")) {
            content.type = "image";
          } else {
            content.type = "file";
          }
        }

        if (content.text || content.url) {
          setPendingShare(content);
          options?.onContentReceived?.(content);

          navigation.navigate("Main", {
            screen: "Profile",
            params: { sharedContent: content } as never,
          });
        }
      }
    } catch (error) {
      console.error("Error parsing shared URL:", error);
    }
  }, [navigation, options]);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    const subscription = Linking.addEventListener("url", handleUrl);

    return () => {
      subscription.remove();
    };
  }, [handleUrl]);

  const clearPendingShare = useCallback(() => {
    setPendingShare(null);
  }, []);

  return {
    pendingShare,
    clearPendingShare,
  };
}

export function buildShareUrl(content: { text?: string; url?: string }): string {
  const base = Linking.createURL("share");
  const params = new URLSearchParams();
  
  if (content.text) {
    params.set("text", content.text);
  }
  if (content.url) {
    params.set("url", content.url);
  }
  
  return `${base}?${params.toString()}`;
}
