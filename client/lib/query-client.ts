import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { api, ApiRequestError, NetworkError, TimeoutError, getApiUrl } from "./api";

export { getApiUrl };
export { apiRequest, api, ApiRequestError, NetworkError, TimeoutError } from "./api";
export { getAuthToken, getRefreshToken, setTokens, clearTokens, setSessionExpiredHandler } from "./api";

export const queryKeys = {
  auth: {
    me: ["/api/auth/me"] as const,
  },
  family: {
    all: ["/api/family"] as const,
    members: ["/api/family/members"] as const,
    invites: ["/api/family/invites"] as const,
  },
  events: {
    all: ["/api/events"] as const,
    list: (from?: string, to?: string) => ["/api/events", { from, to }] as const,
  },
  tasks: {
    all: ["/api/tasks"] as const,
    list: (filters?: { completed?: boolean; assignedTo?: string }) =>
      ["/api/tasks", filters] as const,
  },
  shopping: {
    all: ["/api/shopping"] as const,
    list: (filters?: { purchased?: boolean; category?: string }) =>
      ["/api/shopping", filters] as const,
  },
  expenses: {
    all: ["/api/expenses"] as const,
    list: (filters?: { from?: string; to?: string; category?: string; paidBy?: string }) =>
      ["/api/expenses", filters] as const,
  },
};

type UnauthorizedBehavior = "returnNull" | "throw";

export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  const { on401: unauthorizedBehavior } = options;
  
  return async ({ queryKey }) => {
    try {
      const [path, params] = queryKey as [string, Record<string, unknown>?];
      
      let url = path;
      if (params && typeof params === "object") {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        }
        const queryString = searchParams.toString();
        if (queryString) {
          url = `${path}?${queryString}`;
        }
      }
      
      return await api.get<T>(url);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        if (unauthorizedBehavior === "returnNull") {
          return null as T;
        }
      }
      throw error;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof ApiRequestError) {
          if (error.status === 401 || error.status === 403 || error.status === 404) {
            return false;
          }
        }
        if (error instanceof NetworkError || error instanceof TimeoutError) {
          return failureCount < 2;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});

export function invalidateAllQueries() {
  queryClient.invalidateQueries();
}

export function clearQueryCache() {
  queryClient.clear();
}
