import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { UserRole, LogCategory, LogSeverity } from "@shared/schema";

interface AuthRequest extends Request {
  auth?: {
    userId: string;
    familyId: string;
    role: UserRole;
    tokenId: string;
  };
}

export const ERROR_CODES = {
  AUTH: {
    INVALID_CREDENTIALS: "KINOVA::AUTH::INVALID_CREDENTIALS",
    TOKEN_EXPIRED: "KINOVA::AUTH::TOKEN_EXPIRED",
    TOKEN_INVALID: "KINOVA::AUTH::TOKEN_INVALID",
    SESSION_EXPIRED: "KINOVA::AUTH::SESSION_EXPIRED",
    PERMISSION_DENIED: "KINOVA::AUTH::PERMISSION_DENIED",
    ACCOUNT_LOCKED: "KINOVA::AUTH::ACCOUNT_LOCKED",
    EMAIL_NOT_VERIFIED: "KINOVA::AUTH::EMAIL_NOT_VERIFIED",
  },
  NETWORK: {
    CONNECTION_FAILED: "KINOVA::NETWORK::CONNECTION_FAILED",
    TIMEOUT: "KINOVA::NETWORK::TIMEOUT",
    SERVER_UNREACHABLE: "KINOVA::NETWORK::SERVER_UNREACHABLE",
    SSL_ERROR: "KINOVA::NETWORK::SSL_ERROR",
  },
  PAYMENT: {
    CARD_DECLINED: "KINOVA::PAYMENT::CARD_DECLINED",
    INSUFFICIENT_FUNDS: "KINOVA::PAYMENT::INSUFFICIENT_FUNDS",
    INVALID_CARD: "KINOVA::PAYMENT::INVALID_CARD",
    PAYMENT_FAILED: "KINOVA::PAYMENT::PAYMENT_FAILED",
    STRIPE_ERROR: "KINOVA::PAYMENT::STRIPE_ERROR",
  },
  ASSISTANT: {
    AI_UNAVAILABLE: "KINOVA::ASSISTANT::AI_UNAVAILABLE",
    QUOTA_EXCEEDED: "KINOVA::ASSISTANT::QUOTA_EXCEEDED",
    INVALID_REQUEST: "KINOVA::ASSISTANT::INVALID_REQUEST",
    PROCESSING_ERROR: "KINOVA::ASSISTANT::PROCESSING_ERROR",
  },
  CALENDAR: {
    EVENT_NOT_FOUND: "KINOVA::CALENDAR::EVENT_NOT_FOUND",
    INVALID_DATE: "KINOVA::CALENDAR::INVALID_DATE",
    CONFLICT: "KINOVA::CALENDAR::CONFLICT",
  },
  TASKS: {
    TASK_NOT_FOUND: "KINOVA::TASKS::TASK_NOT_FOUND",
    INVALID_PRIORITY: "KINOVA::TASKS::INVALID_PRIORITY",
  },
  SHOPPING: {
    ITEM_NOT_FOUND: "KINOVA::SHOPPING::ITEM_NOT_FOUND",
    INVALID_QUANTITY: "KINOVA::SHOPPING::INVALID_QUANTITY",
  },
  BUDGET: {
    EXPENSE_NOT_FOUND: "KINOVA::BUDGET::EXPENSE_NOT_FOUND",
    INVALID_AMOUNT: "KINOVA::BUDGET::INVALID_AMOUNT",
  },
  FAMILY: {
    FAMILY_NOT_FOUND: "KINOVA::FAMILY::FAMILY_NOT_FOUND",
    INVITE_EXPIRED: "KINOVA::FAMILY::INVITE_EXPIRED",
    INVITE_INVALID: "KINOVA::FAMILY::INVITE_INVALID",
    MEMBER_NOT_FOUND: "KINOVA::FAMILY::MEMBER_NOT_FOUND",
  },
  GENERAL: {
    UNKNOWN_ERROR: "KINOVA::GENERAL::UNKNOWN_ERROR",
    VALIDATION_ERROR: "KINOVA::GENERAL::VALIDATION_ERROR",
    NOT_FOUND: "KINOVA::GENERAL::NOT_FOUND",
    SERVER_ERROR: "KINOVA::GENERAL::SERVER_ERROR",
    RATE_LIMITED: "KINOVA::GENERAL::RATE_LIMITED",
    MAINTENANCE: "KINOVA::GENERAL::MAINTENANCE",
  },
} as const;

export const ERROR_MESSAGES = {
  it: {
    [ERROR_CODES.AUTH.INVALID_CREDENTIALS]: "Credenziali non valide",
    [ERROR_CODES.AUTH.TOKEN_EXPIRED]: "Sessione scaduta, effettua nuovamente l'accesso",
    [ERROR_CODES.AUTH.TOKEN_INVALID]: "Token non valido",
    [ERROR_CODES.AUTH.SESSION_EXPIRED]: "Sessione scaduta",
    [ERROR_CODES.AUTH.PERMISSION_DENIED]: "Non hai i permessi per questa azione",
    [ERROR_CODES.AUTH.ACCOUNT_LOCKED]: "Account bloccato per troppi tentativi",
    [ERROR_CODES.AUTH.EMAIL_NOT_VERIFIED]: "Verifica la tua email per continuare",
    [ERROR_CODES.NETWORK.CONNECTION_FAILED]: "Connessione al server fallita",
    [ERROR_CODES.NETWORK.TIMEOUT]: "La richiesta ha impiegato troppo tempo",
    [ERROR_CODES.NETWORK.SERVER_UNREACHABLE]: "Server non raggiungibile",
    [ERROR_CODES.NETWORK.SSL_ERROR]: "Errore di sicurezza della connessione",
    [ERROR_CODES.PAYMENT.CARD_DECLINED]: "Carta rifiutata",
    [ERROR_CODES.PAYMENT.INSUFFICIENT_FUNDS]: "Fondi insufficienti",
    [ERROR_CODES.PAYMENT.INVALID_CARD]: "Dati carta non validi",
    [ERROR_CODES.PAYMENT.PAYMENT_FAILED]: "Pagamento non riuscito",
    [ERROR_CODES.PAYMENT.STRIPE_ERROR]: "Errore del sistema di pagamento",
    [ERROR_CODES.ASSISTANT.AI_UNAVAILABLE]: "Assistente non disponibile",
    [ERROR_CODES.ASSISTANT.QUOTA_EXCEEDED]: "Limite richieste giornaliere raggiunto",
    [ERROR_CODES.ASSISTANT.INVALID_REQUEST]: "Richiesta non valida",
    [ERROR_CODES.ASSISTANT.PROCESSING_ERROR]: "Errore durante l'elaborazione",
    [ERROR_CODES.CALENDAR.EVENT_NOT_FOUND]: "Evento non trovato",
    [ERROR_CODES.CALENDAR.INVALID_DATE]: "Data non valida",
    [ERROR_CODES.CALENDAR.CONFLICT]: "Conflitto con un altro evento",
    [ERROR_CODES.TASKS.TASK_NOT_FOUND]: "Attività non trovata",
    [ERROR_CODES.TASKS.INVALID_PRIORITY]: "Priorità non valida",
    [ERROR_CODES.SHOPPING.ITEM_NOT_FOUND]: "Articolo non trovato",
    [ERROR_CODES.SHOPPING.INVALID_QUANTITY]: "Quantità non valida",
    [ERROR_CODES.BUDGET.EXPENSE_NOT_FOUND]: "Spesa non trovata",
    [ERROR_CODES.BUDGET.INVALID_AMOUNT]: "Importo non valido",
    [ERROR_CODES.FAMILY.FAMILY_NOT_FOUND]: "Famiglia non trovata",
    [ERROR_CODES.FAMILY.INVITE_EXPIRED]: "Invito scaduto",
    [ERROR_CODES.FAMILY.INVITE_INVALID]: "Invito non valido",
    [ERROR_CODES.FAMILY.MEMBER_NOT_FOUND]: "Membro non trovato",
    [ERROR_CODES.GENERAL.UNKNOWN_ERROR]: "Si è verificato un errore",
    [ERROR_CODES.GENERAL.VALIDATION_ERROR]: "Dati non validi",
    [ERROR_CODES.GENERAL.NOT_FOUND]: "Risorsa non trovata",
    [ERROR_CODES.GENERAL.SERVER_ERROR]: "Errore del server",
    [ERROR_CODES.GENERAL.RATE_LIMITED]: "Troppe richieste, riprova tra poco",
    [ERROR_CODES.GENERAL.MAINTENANCE]: "Sistema in manutenzione",
  },
  en: {
    [ERROR_CODES.AUTH.INVALID_CREDENTIALS]: "Invalid credentials",
    [ERROR_CODES.AUTH.TOKEN_EXPIRED]: "Session expired, please log in again",
    [ERROR_CODES.AUTH.TOKEN_INVALID]: "Invalid token",
    [ERROR_CODES.AUTH.SESSION_EXPIRED]: "Session expired",
    [ERROR_CODES.AUTH.PERMISSION_DENIED]: "You don't have permission for this action",
    [ERROR_CODES.AUTH.ACCOUNT_LOCKED]: "Account locked due to too many attempts",
    [ERROR_CODES.AUTH.EMAIL_NOT_VERIFIED]: "Please verify your email to continue",
    [ERROR_CODES.NETWORK.CONNECTION_FAILED]: "Failed to connect to server",
    [ERROR_CODES.NETWORK.TIMEOUT]: "Request timed out",
    [ERROR_CODES.NETWORK.SERVER_UNREACHABLE]: "Server unreachable",
    [ERROR_CODES.NETWORK.SSL_ERROR]: "Connection security error",
    [ERROR_CODES.PAYMENT.CARD_DECLINED]: "Card declined",
    [ERROR_CODES.PAYMENT.INSUFFICIENT_FUNDS]: "Insufficient funds",
    [ERROR_CODES.PAYMENT.INVALID_CARD]: "Invalid card details",
    [ERROR_CODES.PAYMENT.PAYMENT_FAILED]: "Payment failed",
    [ERROR_CODES.PAYMENT.STRIPE_ERROR]: "Payment system error",
    [ERROR_CODES.ASSISTANT.AI_UNAVAILABLE]: "Assistant unavailable",
    [ERROR_CODES.ASSISTANT.QUOTA_EXCEEDED]: "Daily request limit reached",
    [ERROR_CODES.ASSISTANT.INVALID_REQUEST]: "Invalid request",
    [ERROR_CODES.ASSISTANT.PROCESSING_ERROR]: "Processing error",
    [ERROR_CODES.CALENDAR.EVENT_NOT_FOUND]: "Event not found",
    [ERROR_CODES.CALENDAR.INVALID_DATE]: "Invalid date",
    [ERROR_CODES.CALENDAR.CONFLICT]: "Conflict with another event",
    [ERROR_CODES.TASKS.TASK_NOT_FOUND]: "Task not found",
    [ERROR_CODES.TASKS.INVALID_PRIORITY]: "Invalid priority",
    [ERROR_CODES.SHOPPING.ITEM_NOT_FOUND]: "Item not found",
    [ERROR_CODES.SHOPPING.INVALID_QUANTITY]: "Invalid quantity",
    [ERROR_CODES.BUDGET.EXPENSE_NOT_FOUND]: "Expense not found",
    [ERROR_CODES.BUDGET.INVALID_AMOUNT]: "Invalid amount",
    [ERROR_CODES.FAMILY.FAMILY_NOT_FOUND]: "Family not found",
    [ERROR_CODES.FAMILY.INVITE_EXPIRED]: "Invite expired",
    [ERROR_CODES.FAMILY.INVITE_INVALID]: "Invalid invite",
    [ERROR_CODES.FAMILY.MEMBER_NOT_FOUND]: "Member not found",
    [ERROR_CODES.GENERAL.UNKNOWN_ERROR]: "An error occurred",
    [ERROR_CODES.GENERAL.VALIDATION_ERROR]: "Invalid data",
    [ERROR_CODES.GENERAL.NOT_FOUND]: "Resource not found",
    [ERROR_CODES.GENERAL.SERVER_ERROR]: "Server error",
    [ERROR_CODES.GENERAL.RATE_LIMITED]: "Too many requests, try again later",
    [ERROR_CODES.GENERAL.MAINTENANCE]: "System under maintenance",
  },
} as const;

export function getErrorMessage(code: string, language: "it" | "en" = "it"): string {
  const messages = ERROR_MESSAGES[language];
  return messages[code as keyof typeof messages] || messages[ERROR_CODES.GENERAL.UNKNOWN_ERROR];
}

export function registerLoggingRoutes(
  app: Express,
  authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => void
): void {
  app.post("/api/logs/session/start", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { deviceId, platform, appVersion, osVersion, locale, metadata } = req.body;
      
      const sessionLog = await storage.createSessionLog({
        userId: req.auth!.userId,
        familyId: req.auth!.familyId,
        deviceId,
        platform,
        appVersion,
        osVersion,
        locale,
        ipAddress: req.ip || req.header("x-forwarded-for") || null,
        userAgent: req.header("user-agent") || null,
        status: "started",
        startedAt: new Date(),
        endedAt: null,
        terminationReason: null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });

      res.json({ sessionId: sessionLog.id });
    } catch (error) {
      console.error("Session start log error:", error);
      res.status(500).json({ error: "Failed to log session start" });
    }
  });

  app.post("/api/logs/session/end", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { sessionId, terminationReason } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const updated = await storage.updateSessionLog(sessionId, {
        status: "ended",
        endedAt: new Date(),
        terminationReason,
      });

      if (!updated) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Session end log error:", error);
      res.status(500).json({ error: "Failed to log session end" });
    }
  });

  app.post("/api/logs/session/crash", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { sessionId, errorDetails } = req.body;
      
      if (sessionId) {
        await storage.updateSessionLog(sessionId, {
          status: "crashed",
          endedAt: new Date(),
          terminationReason: errorDetails || "App crash",
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Session crash log error:", error);
      res.status(500).json({ error: "Failed to log session crash" });
    }
  });

  app.post("/api/logs/error", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const {
        sessionId,
        requestId,
        category,
        severity,
        code,
        message,
        userMessage,
        component,
        stackTrace,
        context,
      } = req.body;

      if (!code || !message) {
        return res.status(400).json({ error: "code and message are required" });
      }

      const errorLog = await storage.createErrorLog({
        sessionId: sessionId || null,
        userId: req.auth!.userId,
        familyId: req.auth!.familyId,
        requestId: requestId || null,
        category: (category as LogCategory) || "general",
        severity: (severity as LogSeverity) || "error",
        code,
        message,
        userMessage: userMessage || null,
        component: component || null,
        stackTrace: stackTrace || null,
        context: context ? JSON.stringify(context) : null,
        ipAddress: req.ip || req.header("x-forwarded-for") || null,
        userAgent: req.header("user-agent") || null,
        resolved: false,
        resolvedAt: null,
        resolvedBy: null,
      });

      res.json({ errorId: errorLog.id });
    } catch (error) {
      console.error("Error log error:", error);
      res.status(500).json({ error: "Failed to log error" });
    }
  });

  app.get("/api/logs/error-codes", (_req: Request, res: Response) => {
    res.json({
      codes: ERROR_CODES,
      messages: ERROR_MESSAGES,
    });
  });
}
