import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl, clearQueryCache, setSessionExpiredHandler } from "./query-client";

const AUTH_TOKEN_KEY = "@kinova/auth_token";
const REFRESH_TOKEN_KEY = "@kinova/refresh_token";
const USER_ID_KEY = "@kinova/user_id";
const FAMILY_ID_KEY = "@kinova/family_id";
const TOKEN_EXPIRY_KEY = "@kinova/token_expiry";

export type UserRole = "admin" | "member" | "child";

export interface UserPermissions {
  canViewCalendar: boolean;
  canViewTasks: boolean;
  canViewShopping: boolean;
  canViewBudget: boolean;
  canViewPlaces: boolean;
  canModifyItems: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  canViewCalendar: true,
  canViewTasks: true,
  canViewShopping: true,
  canViewBudget: false,
  canViewPlaces: true,
  canModifyItems: true,
};

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  familyId: string;
  role: UserRole;
  avatarUrl?: string | null;
  emailVerified: boolean;
  permissions: UserPermissions;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string, acceptTerms?: boolean, familyName?: string) => Promise<void>;
  joinFamily: (code: string, email: string, password: string, displayName?: string, acceptTerms?: boolean) => Promise<void>;
  acceptInvite: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshing = useRef(false);

  const clearAllStorage = async () => {
    await AsyncStorage.multiRemove([
      AUTH_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_ID_KEY,
      FAMILY_ID_KEY,
      TOKEN_EXPIRY_KEY,
    ]);
  };

  const saveAuthData = async (accessToken: string, refreshToken: string, userData: User, expiresIn: number) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    await AsyncStorage.multiSet([
      [AUTH_TOKEN_KEY, accessToken],
      [REFRESH_TOKEN_KEY, refreshToken],
      [USER_ID_KEY, userData.id],
      [FAMILY_ID_KEY, userData.familyId],
      [TOKEN_EXPIRY_KEY, String(expiresAt)],
    ]);
    setToken(accessToken);
    setUser(userData);
    scheduleRefresh(expiresIn * 1000);
  };

  const scheduleRefresh = (expiresInMs: number) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    const refreshTime = Math.max(expiresInMs - 60000, 10000);
    refreshTimeoutRef.current = setTimeout(() => {
      performRefresh();
    }, refreshTime);
  };

  const performRefresh = async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        await handleLogout();
        return;
      }

      const baseUrl = getApiUrl();
      const res = await fetch(new URL("/api/auth/refresh", baseUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        await handleLogout();
        return;
      }

      const data = await res.json();
      await saveAuthData(data.accessToken, data.refreshToken, data.user, data.expiresIn);
    } catch (error) {
      console.error("Token refresh failed:", error);
      await handleLogout();
    } finally {
      isRefreshing.current = false;
    }
  };

  const handleLogout = async () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    await clearAllStorage();
    clearQueryCache();
    setToken(null);
    setUser(null);
  };

  const fetchUser = useCallback(async (authToken: string): Promise<User | null> => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL("/api/auth/me", baseUrl).href, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const userData = await fetchUser(token);
    if (userData) {
      setUser(userData);
    }
  }, [token, fetchUser]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      handleLogout();
    });

    const loadStoredAuth = async () => {
      try {
        const [[, storedToken], [, storedRefreshToken], [, expiryStr]] = await AsyncStorage.multiGet([
          AUTH_TOKEN_KEY,
          REFRESH_TOKEN_KEY,
          TOKEN_EXPIRY_KEY,
        ]);

        if (!storedToken || !storedRefreshToken) {
          await clearAllStorage();
          return;
        }

        const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
        const now = Date.now();

        if (expiry > now) {
          const userData = await fetchUser(storedToken);
          if (userData) {
            setToken(storedToken);
            setUser(userData);
            scheduleRefresh(expiry - now);
          } else {
            await performRefresh();
          }
        } else {
          await performRefresh();
        }
      } catch (error) {
        console.error("Failed to load auth:", error);
        await clearAllStorage();
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredAuth();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const baseUrl = getApiUrl();
    const res = await fetch(new URL("/api/auth/login", baseUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      const error = data.error;
      if (typeof error === "object" && error.code) {
        const err = new Error(error.message || "Login failed") as any;
        err.code = error.code;
        err.retryAfterMinutes = error.retryAfterMinutes;
        throw err;
      }
      throw new Error(error || "Login failed");
    }

    const data = await res.json();
    await saveAuthData(data.accessToken, data.refreshToken, data.user, data.expiresIn);
  };

  const register = async (email: string, password: string, displayName?: string, acceptTerms: boolean = false, familyName?: string) => {
    const baseUrl = getApiUrl();
    const url = new URL("/api/auth/register", baseUrl).href;
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName, familyName, acceptTerms }),
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.error("Registration returned non-JSON response:", contentType, "from URL:", url);
      throw new Error("Server error. Please try again.");
    }

    if (!res.ok) {
      const data = await res.json();
      const error = data.error;
      if (typeof error === "object" && error.code) {
        const err = new Error(error.message || "Registration failed") as any;
        err.code = error.code;
        err.details = error.details;
        throw err;
      }
      throw new Error(error || "Registration failed");
    }

    const data = await res.json();
    await saveAuthData(data.accessToken, data.refreshToken, data.user, data.expiresIn);
  };

  const joinFamily = async (code: string, email: string, password: string, displayName?: string, acceptTerms: boolean = false) => {
    const baseUrl = getApiUrl();
    const res = await fetch(new URL("/api/family/join", baseUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, email, password, displayName, acceptTerms }),
    });

    if (!res.ok) {
      const data = await res.json();
      const error = data.error;
      if (typeof error === "object" && error.code) {
        const err = new Error(error.message || "Failed to join family") as any;
        err.code = error.code;
        throw err;
      }
      throw new Error(error || "Failed to join family");
    }

    const data = await res.json();
    await saveAuthData(data.accessToken, data.refreshToken, data.user, data.expiresIn);
  };

  const logoutAll = async () => {
    const currentToken = token;
    if (currentToken) {
      try {
        const baseUrl = getApiUrl();
        await fetch(new URL("/api/auth/logout-all", baseUrl).href, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        });
      } catch {
        // ignore logout errors
      }
    }
    await handleLogout();
  };

  const acceptInvite = async (code: string) => {
    const currentToken = token;
    if (!currentToken) {
      throw new Error("Not authenticated");
    }

    const baseUrl = getApiUrl();
    const res = await fetch(new URL("/api/family/invite/accept", baseUrl).href, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to accept invite");
    }

    const data = await res.json();
    await saveAuthData(data.accessToken, data.refreshToken, data.user, data.expiresIn);
  };

  const logout = async () => {
    const currentToken = token;
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

    if (currentToken) {
      try {
        const baseUrl = getApiUrl();
        await fetch(new URL("/api/auth/logout", baseUrl).href, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // ignore logout errors
      }
    }

    await handleLogout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        joinFamily,
        acceptInvite,
        logout,
        logoutAll,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}
