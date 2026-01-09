export function useNotifications(_userId: string | undefined, _onNotificationReceived?: () => void) {
  return {
    expoPushToken: null,
    permission: null,
    requestPermission: async () => false,
  };
}

export async function scheduleLocalNotification(
  _title: string,
  _body: string,
  _triggerSeconds: number,
  _data?: Record<string, unknown>
): Promise<string | null> {
  return null;
}

export async function cancelScheduledNotification(_notificationId: string): Promise<void> {
  return;
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  return;
}

export async function setBadgeCount(_count: number): Promise<void> {
  return;
}
