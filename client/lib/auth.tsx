import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./query-client";

const AUTH_TOKEN_KEY = "@kinova/auth_token";

interface User {
  id: string;
  username: string;
  displayName: string | null;
  familyId: string | null;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string, familyName?: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveToken = async (newToken: string) => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const clearToken = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
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
    setUser(userData);
  }, [token, fetchUser]);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (storedToken) {
          const userData = await fetchUser(storedToken);
          if (userData) {
            setToken(storedToken);
            setUser(userData);
          } else {
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          }
        }
      } catch (error) {
        console.error("Failed to load auth:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredAuth();
  }, [fetchUser]);

  const login = async (username: string, password: string) => {
    const baseUrl = getApiUrl();
    const res = await fetch(new URL("/api/auth/login", baseUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }

    const data = await res.json();
    await saveToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (username: string, password: string, displayName?: string, familyName?: string) => {
    const baseUrl = getApiUrl();
    const res = await fetch(new URL("/api/auth/register", baseUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, displayName, familyName }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Registration failed");
    }

    const data = await res.json();
    await saveToken(data.accessToken);
    setUser(data.user);
  };

  const guestLogin = async () => {
    const baseUrl = getApiUrl();
    const res = await fetch(new URL("/api/auth/guest", baseUrl).href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Guest login failed");
    }

    const data = await res.json();
    await saveToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    if (token) {
      try {
        const baseUrl = getApiUrl();
        await fetch(new URL("/api/auth/logout", baseUrl).href, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore logout errors
      }
    }
    await clearToken();
    setUser(null);
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
        guestLogin,
        logout,
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
