import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest } from "@/lib/query-client";

type PermissionStatus = "granted" | "denied" | "undetermined";

interface NotificationData {
  type?: string;
  notificationId?: string;
  targetType?: string;
  targetId?: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications(userId: string | undefined, onNotificationReceived?: () => void) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionStatus | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      console.log("Push notifications require a physical device");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    setPermission(finalStatus as PermissionStatus);

    if (finalStatus !== "granted") {
      return null;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });
      return tokenData.data;
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  }, []);

  const savePushToken = useCallback(async (token: string) => {
    if (!userId || !token) return;

    try {
      const storedToken = await AsyncStorage.getItem("@push_token");
      if (storedToken === token) return;

      await apiRequest("POST", "/api/push-token", {
        token,
        platform: Platform.OS,
      });

      await AsyncStorage.setItem("@push_token", token);
    } catch (error) {
      console.error("Error saving push token:", error);
    }
  }, [userId]);

  const requestPermission = useCallback(async () => {
    const token = await registerForPushNotifications();
    if (token) {
      setExpoPushToken(token);
      await savePushToken(token);
    }
    return token !== null;
  }, [registerForPushNotifications, savePushToken]);

  useEffect(() => {
    if (!userId) return;

    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        savePushToken(token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      () => {
        if (onNotificationReceived) {
          onNotificationReceived();
        }
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as NotificationData;
        handleNotificationResponse(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId, registerForPushNotifications, savePushToken, onNotificationReceived]);

  const handleNotificationResponse = (data: NotificationData) => {
    if (data.notificationId) {
      apiRequest("PUT", `/api/notifications/${data.notificationId}/read`).catch(console.error);
    }
  };

  return {
    expoPushToken,
    permission,
    requestPermission,
  };
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  triggerSeconds: number,
  data?: Record<string, unknown>
): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: { seconds: triggerSeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });
    return id;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
}

export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error("Error canceling notification:", error);
  }
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error canceling all notifications:", error);
  }
}

export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error("Error setting badge count:", error);
  }
}
