import { storage } from "./storage";
import type { NotificationType, NotificationCategory, DbNotificationSettings } from "@shared/schema";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
}

const categoryMap: Record<NotificationType, NotificationCategory> = {
  event_reminder: "calendar",
  event_allday: "calendar",
  event_multiday: "calendar",
  event_modified: "calendar",
  event_cancelled: "calendar",
  task_assigned: "tasks",
  task_due: "tasks",
  task_overdue: "tasks",
  task_completed: "tasks",
  shopping_item_added: "shopping",
  shopping_list_long: "shopping",
  budget_threshold: "budget",
  expense_high: "budget",
  ai_suggestion: "ai",
  ai_alert: "ai",
};

function isCategoryEnabled(settings: DbNotificationSettings, category: NotificationCategory): boolean {
  switch (category) {
    case "calendar":
      return settings.calendarEnabled;
    case "tasks":
      return settings.tasksEnabled;
    case "shopping":
      return settings.shoppingEnabled;
    case "budget":
      return settings.budgetEnabled;
    case "ai":
      return settings.aiEnabled;
    default:
      return true;
  }
}

function isInQuietHours(settings: DbNotificationSettings): boolean {
  if (!settings.quietHoursStart || !settings.quietHoursEnd) return false;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = settings.quietHoursStart.split(":").map(Number);
  const [endH, endM] = settings.quietHoursEnd.split(":").map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  try {
    const message: PushMessage = {
      to: pushToken,
      title,
      body,
      data,
      sound: "default",
    };

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result.data?.status === "ok";
  } catch (error) {
    console.error("Push notification error:", error);
    return false;
  }
}

export interface CreateNotificationParams {
  type: NotificationType;
  titleKey: string;
  titleParams?: Record<string, string>;
  messageKey: string;
  messageParams?: Record<string, string>;
  targetUserId: string;
  familyId: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  scheduledAt?: Date;
  pushTitle?: string;
  pushBody?: string;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const category = categoryMap[params.type];
  
  const settings = await storage.getNotificationSettings(params.targetUserId);
  if (settings) {
    if (!settings.enabled) return;
    if (!isCategoryEnabled(settings, category)) return;
  }
  
  const notification = await storage.createNotification({
    type: params.type,
    category,
    titleKey: params.titleKey,
    titleParams: params.titleParams ? JSON.stringify(params.titleParams) : null,
    messageKey: params.messageKey,
    messageParams: params.messageParams ? JSON.stringify(params.messageParams) : null,
    targetUserId: params.targetUserId,
    familyId: params.familyId,
    relatedEntityType: params.relatedEntityType || null,
    relatedEntityId: params.relatedEntityId || null,
    scheduledAt: params.scheduledAt || null,
  });
  
  if (!params.scheduledAt && params.pushTitle && params.pushBody) {
    if (settings && isInQuietHours(settings)) return;
    
    const pushToken = await storage.getPushToken(params.targetUserId);
    if (pushToken) {
      await sendPushNotification(pushToken.token, params.pushTitle, params.pushBody, {
        notificationId: notification.id,
        type: params.type,
        entityType: params.relatedEntityType,
        entityId: params.relatedEntityId,
      });
      await storage.markNotificationSent(notification.id);
    }
  }
}

export async function createFamilyNotification(
  params: Omit<CreateNotificationParams, "targetUserId"> & { excludeUserId?: string }
): Promise<void> {
  const members = await storage.getFamilyMembers(params.familyId);
  
  for (const member of members) {
    if (params.excludeUserId && member.id === params.excludeUserId) continue;
    
    await createNotification({
      ...params,
      targetUserId: member.id,
    });
  }
}

export async function deleteNotificationsForEntity(
  entityType: string,
  entityId: string,
  familyId: string
): Promise<void> {
  await storage.deleteNotificationsByEntity(entityType, entityId, familyId);
}

export async function processScheduledNotifications(): Promise<void> {
  const now = new Date();
  const pendingNotifications = await storage.getScheduledNotifications(now);
  
  for (const notification of pendingNotifications) {
    const settings = await storage.getNotificationSettings(notification.targetUserId);
    
    if (settings) {
      if (!settings.enabled) {
        await storage.markNotificationSent(notification.id);
        continue;
      }
      if (!isCategoryEnabled(settings, notification.category)) {
        await storage.markNotificationSent(notification.id);
        continue;
      }
      if (isInQuietHours(settings)) {
        continue;
      }
    }
    
    const pushToken = await storage.getPushToken(notification.targetUserId);
    if (pushToken) {
      await sendPushNotification(
        pushToken.token,
        notification.titleKey,
        notification.messageKey,
        {
          notificationId: notification.id,
          type: notification.type,
          entityType: notification.relatedEntityType,
          entityId: notification.relatedEntityId,
        }
      );
    }
    
    await storage.markNotificationSent(notification.id);
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startNotificationScheduler(): void {
  if (schedulerInterval) return;
  
  schedulerInterval = setInterval(async () => {
    try {
      await processScheduledNotifications();
    } catch (error) {
      console.error("Notification scheduler error:", error);
    }
  }, 60000);
  
  console.log("Notification scheduler started");
}

export function stopNotificationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("Notification scheduler stopped");
  }
}
