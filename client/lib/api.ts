import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const AUTH_TOKEN_KEY = "@kinova/auth_token";
const REFRESH_TOKEN_KEY = "@kinova/refresh_token";
const REQUEST_TIMEOUT_MS = 30000;

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  return `https://${host}`;
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function getRefreshToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await clearTokens();
        onSessionExpired?.();
        return false;
      }

      const data = await response.json();
      await setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      await clearTokens();
      onSessionExpired?.();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function logRequest(method: string, url: string, status?: number, error?: string) {
  if (__DEV__) {
    const timestamp = new Date().toISOString();
    if (status !== undefined) {
      console.log(`[API] ${timestamp} ${method} ${url} -> ${status}${error ? ` (${error})` : ""}`);
    } else {
      console.log(`[API] ${timestamp} ${method} ${url} -> START`);
    }
  }
}

export function parseApiError(response: Response, body: unknown): ApiError {
  if (typeof body === "object" && body !== null && "error" in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === "object" && err !== null && "code" in err && "message" in err) {
      return { error: err as ApiError["error"] };
    }
    if (typeof err === "string") {
      return { error: { code: `HTTP_${response.status}`, message: err } };
    }
  }
  return {
    error: {
      code: `HTTP_${response.status}`,
      message: response.statusText || "Unknown error",
    },
  };
}

export class ApiRequestError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(status: number, apiError: ApiError) {
    super(apiError.error.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = apiError.error.code;
    this.details = apiError.error.details;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor() {
    super("Request timed out");
    this.name = "TimeoutError";
  }
}

export async function apiRequest<T = unknown>(
  method: string,
  route: string,
  data?: unknown,
  options: { skipAuth?: boolean; retry401?: boolean } = {}
): Promise<T> {
  const { skipAuth = false, retry401 = true } = options;
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${route.startsWith("/") ? route : `/${route}`}`;

  logRequest(method, url);

  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (!skipAuth) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: createTimeoutSignal(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      logRequest(method, url, 0, "TIMEOUT");
      throw new TimeoutError();
    }
    logRequest(method, url, 0, "NETWORK_ERROR");
    throw new NetworkError(err instanceof Error ? err.message : "Network request failed");
  }

  logRequest(method, url, response.status);

  if (response.status === 401 && retry401 && !skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiRequest(method, route, data, { ...options, retry401: false });
    }
    throw new ApiRequestError(401, { error: { code: "UNAUTHORIZED", message: "Session expired" } });
  }

  let body: unknown;
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    const apiError = parseApiError(response, body);
    throw new ApiRequestError(response.status, apiError);
  }

  return body as T;
}

export const api = {
  get: <T = unknown>(route: string, options?: { skipAuth?: boolean }) =>
    apiRequest<T>("GET", route, undefined, options),

  post: <T = unknown>(route: string, data?: unknown, options?: { skipAuth?: boolean }) =>
    apiRequest<T>("POST", route, data, options),

  put: <T = unknown>(route: string, data?: unknown, options?: { skipAuth?: boolean }) =>
    apiRequest<T>("PUT", route, data, options),

  delete: <T = unknown>(route: string, options?: { skipAuth?: boolean }) =>
    apiRequest<T>("DELETE", route, undefined, options),
};

export { getAuthToken, getRefreshToken, setTokens, clearTokens };
