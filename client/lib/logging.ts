import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { getApiUrl } from "./query-client";
import { getLocales } from "expo-localization";

const SESSION_ID_KEY = "kinova_session_id";

export type LogSeverity = "info" | "warning" | "error" | "critical";
export type LogCategory = 
  | "auth"
  | "network"
  | "payment"
  | "assistant"
  | "calendar"
  | "tasks"
  | "shopping"
  | "budget"
  | "family"
  | "general";

export const ERROR_CODES = {
  AUTH: {
    INVALID_CREDENTIALS: "KINOVA::AUTH::INVALID_CREDENTIALS",
    TOKEN_EXPIRED: "KINOVA::AUTH::TOKEN_EXPIRED",
    TOKEN_INVALID: "KINOVA::AUTH::TOKEN_INVALID",
    SESSION_EXPIRED: "KINOVA::AUTH::SESSION_EXPIRED",
    PERMISSION_DENIED: "KINOVA::AUTH::PERMISSION_DENIED",
    ACCOUNT_LOCKED: "KINOVA::AUTH::ACCOUNT_LOCKED",
  },
  NETWORK: {
    CONNECTION_FAILED: "KINOVA::NETWORK::CONNECTION_FAILED",
    TIMEOUT: "KINOVA::NETWORK::TIMEOUT",
    SERVER_UNREACHABLE: "KINOVA::NETWORK::SERVER_UNREACHABLE",
  },
  PAYMENT: {
    CARD_DECLINED: "KINOVA::PAYMENT::CARD_DECLINED",
    PAYMENT_FAILED: "KINOVA::PAYMENT::PAYMENT_FAILED",
    STRIPE_ERROR: "KINOVA::PAYMENT::STRIPE_ERROR",
  },
  ASSISTANT: {
    AI_UNAVAILABLE: "KINOVA::ASSISTANT::AI_UNAVAILABLE",
    QUOTA_EXCEEDED: "KINOVA::ASSISTANT::QUOTA_EXCEEDED",
    PROCESSING_ERROR: "KINOVA::ASSISTANT::PROCESSING_ERROR",
  },
  GENERAL: {
    UNKNOWN_ERROR: "KINOVA::GENERAL::UNKNOWN_ERROR",
    VALIDATION_ERROR: "KINOVA::GENERAL::VALIDATION_ERROR",
    NOT_FOUND: "KINOVA::GENERAL::NOT_FOUND",
    SERVER_ERROR: "KINOVA::GENERAL::SERVER_ERROR",
  },
} as const;

const ERROR_MESSAGES = {
  it: {
    [ERROR_CODES.AUTH.INVALID_CREDENTIALS]: "Credenziali non valide",
    [ERROR_CODES.AUTH.TOKEN_EXPIRED]: "Sessione scaduta",
    [ERROR_CODES.AUTH.TOKEN_INVALID]: "Token non valido",
    [ERROR_CODES.AUTH.SESSION_EXPIRED]: "Sessione scaduta",
    [ERROR_CODES.AUTH.PERMISSION_DENIED]: "Non hai i permessi per questa azione",
    [ERROR_CODES.AUTH.ACCOUNT_LOCKED]: "Account bloccato",
    [ERROR_CODES.NETWORK.CONNECTION_FAILED]: "Connessione al server fallita",
    [ERROR_CODES.NETWORK.TIMEOUT]: "La richiesta ha impiegato troppo tempo",
    [ERROR_CODES.NETWORK.SERVER_UNREACHABLE]: "Server non raggiungibile",
    [ERROR_CODES.PAYMENT.CARD_DECLINED]: "Carta rifiutata",
    [ERROR_CODES.PAYMENT.PAYMENT_FAILED]: "Pagamento non riuscito",
    [ERROR_CODES.PAYMENT.STRIPE_ERROR]: "Errore del sistema di pagamento",
    [ERROR_CODES.ASSISTANT.AI_UNAVAILABLE]: "Assistente non disponibile",
    [ERROR_CODES.ASSISTANT.QUOTA_EXCEEDED]: "Limite richieste raggiunto",
    [ERROR_CODES.ASSISTANT.PROCESSING_ERROR]: "Errore durante l'elaborazione",
    [ERROR_CODES.GENERAL.UNKNOWN_ERROR]: "Si è verificato un errore",
    [ERROR_CODES.GENERAL.VALIDATION_ERROR]: "Dati non validi",
    [ERROR_CODES.GENERAL.NOT_FOUND]: "Risorsa non trovata",
    [ERROR_CODES.GENERAL.SERVER_ERROR]: "Errore del server",
  },
  en: {
    [ERROR_CODES.AUTH.INVALID_CREDENTIALS]: "Invalid credentials",
    [ERROR_CODES.AUTH.TOKEN_EXPIRED]: "Session expired",
    [ERROR_CODES.AUTH.TOKEN_INVALID]: "Invalid token",
    [ERROR_CODES.AUTH.SESSION_EXPIRED]: "Session expired",
    [ERROR_CODES.AUTH.PERMISSION_DENIED]: "You don't have permission",
    [ERROR_CODES.AUTH.ACCOUNT_LOCKED]: "Account locked",
    [ERROR_CODES.NETWORK.CONNECTION_FAILED]: "Failed to connect to server",
    [ERROR_CODES.NETWORK.TIMEOUT]: "Request timed out",
    [ERROR_CODES.NETWORK.SERVER_UNREACHABLE]: "Server unreachable",
    [ERROR_CODES.PAYMENT.CARD_DECLINED]: "Card declined",
    [ERROR_CODES.PAYMENT.PAYMENT_FAILED]: "Payment failed",
    [ERROR_CODES.PAYMENT.STRIPE_ERROR]: "Payment system error",
    [ERROR_CODES.ASSISTANT.AI_UNAVAILABLE]: "Assistant unavailable",
    [ERROR_CODES.ASSISTANT.QUOTA_EXCEEDED]: "Request limit reached",
    [ERROR_CODES.ASSISTANT.PROCESSING_ERROR]: "Processing error",
    [ERROR_CODES.GENERAL.UNKNOWN_ERROR]: "An error occurred",
    [ERROR_CODES.GENERAL.VALIDATION_ERROR]: "Invalid data",
    [ERROR_CODES.GENERAL.NOT_FOUND]: "Resource not found",
    [ERROR_CODES.GENERAL.SERVER_ERROR]: "Server error",
  },
} as const;

let currentSessionId: string | null = null;

function generateDeviceId(): string {
  return `${Platform.OS}-${Device.modelName || "unknown"}-${Date.now().toString(36)}`;
}

async function getStoredDeviceId(): Promise<string> {
  const DEVICE_ID_KEY = "kinova_device_id";
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function getLocale(): string {
  const locales = getLocales();
  return locales[0]?.languageCode || "en";
}

function getDeviceInfo() {
  return {
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version || "1.0.0",
    osVersion: Platform.Version?.toString() || "unknown",
    locale: getLocale(),
  };
}

async function makeLogRequest(endpoint: string, data: object): Promise<any> {
  const token = await AsyncStorage.getItem("authToken");
  if (!token) return null;

  const baseUrl = getApiUrl();
  const url = new URL(endpoint, baseUrl);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.warn("[Logging] Request failed:", response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.warn("[Logging] Network error:", error);
    return null;
  }
}

export async function startSession(): Promise<string | null> {
  const deviceId = await getStoredDeviceId();
  const deviceInfo = getDeviceInfo();

  const result = await makeLogRequest("/api/logs/session/start", {
    deviceId,
    ...deviceInfo,
    metadata: {
      deviceModel: Device.modelName,
      deviceBrand: Device.brand,
    },
  });

  if (result?.sessionId) {
    currentSessionId = result.sessionId as string;
    await AsyncStorage.setItem(SESSION_ID_KEY, currentSessionId);
    return currentSessionId;
  }
  return null;
}

export async function endSession(terminationReason?: string): Promise<void> {
  const sessionId = currentSessionId || (await AsyncStorage.getItem(SESSION_ID_KEY));
  if (!sessionId) return;

  await makeLogRequest("/api/logs/session/end", {
    sessionId,
    terminationReason,
  });

  currentSessionId = null;
  await AsyncStorage.removeItem(SESSION_ID_KEY);
}

export async function logSessionCrash(errorDetails: string): Promise<void> {
  const sessionId = currentSessionId || (await AsyncStorage.getItem(SESSION_ID_KEY));

  await makeLogRequest("/api/logs/session/crash", {
    sessionId,
    errorDetails,
  });
}

interface LogErrorParams {
  code: string;
  message: string;
  category?: LogCategory;
  severity?: LogSeverity;
  component?: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
  requestId?: string;
}

export async function logError(params: LogErrorParams): Promise<string | null> {
  const sessionId = currentSessionId || (await AsyncStorage.getItem(SESSION_ID_KEY));
  const localeCode = getLocale();
  const locale = localeCode.startsWith("it") ? "it" : "en";
  const userMessage = ERROR_MESSAGES[locale][params.code as keyof typeof ERROR_MESSAGES["it"]] || params.message;

  const result = await makeLogRequest("/api/logs/error", {
    sessionId,
    code: params.code,
    message: params.message,
    userMessage,
    category: params.category || "general",
    severity: params.severity || "error",
    component: params.component,
    stackTrace: params.stackTrace,
    context: params.context,
    requestId: params.requestId,
  });

  return result?.errorId || null;
}

export function getErrorMessage(code: string, locale: "it" | "en" = "it"): string {
  const messages = ERROR_MESSAGES[locale];
  return messages[code as keyof typeof messages] || messages[ERROR_CODES.GENERAL.UNKNOWN_ERROR];
}

export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

export async function restoreSessionId(): Promise<string | null> {
  if (currentSessionId) return currentSessionId;
  currentSessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
  return currentSessionId;
}
