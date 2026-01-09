import React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import { useNotifications, setBadgeCount } from "@/hooks/useNotifications";

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const handleNotificationReceived = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
  };

  useNotifications(
    isAuthenticated && user?.id ? user.id : undefined,
    handleNotificationReceived
  );

  return <>{children}</>;
}

export { setBadgeCount };
