/**
 * Shared Middleware for API Routes
 * Authentication, authorization, and validation middleware
 */

import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { UserRole } from "@shared/schema";

/**
 * Extended Request interface with authentication data
 */
export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    familyId: string;
    role: UserRole;
    tokenId: string;
  };
}

/**
 * Authentication middleware
 * Validates Bearer token and attaches user info to request
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const token = authHeader.slice(7);

  try {
    const session = await storage.getSession(token);

    if (!session) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (new Date(session.expiresAt) < new Date()) {
      await storage.deleteSession(token);
      return res.status(401).json({ error: "Token expired" });
    }

    if (session.type !== "access") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    req.auth = {
      userId: session.userId,
      familyId: session.familyId,
      role: session.role,
      tokenId: token,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token present, but doesn't require it
 */
export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const session = await storage.getSession(token);

    if (session && new Date(session.expiresAt) >= new Date() && session.type === "access") {
      req.auth = {
        userId: session.userId,
        familyId: session.familyId,
        role: session.role,
        tokenId: token,
      };
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next();
  }
}

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has one of the allowed roles
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRoles("admin");

/**
 * Non-child middleware (admin or member)
 */
export const requireNonChild = requireRoles("admin", "member");

/**
 * Family ownership middleware
 * Ensures user belongs to the family being accessed
 */
export function requireFamilyMember(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.auth) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const familyId = req.params.familyId || req.body?.familyId;
  if (familyId && familyId !== req.auth.familyId) {
    return res.status(403).json({ error: "Access denied to this family" });
  }

  next();
}

/**
 * Request validation middleware factory
 * Validates request body against provided schema
 */
export function validateBody<T>(
  validator: (body: unknown) => { success: boolean; data?: T; error?: unknown }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validator(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: result.error,
        },
      });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Async handler wrapper
 * Catches errors in async route handlers and forwards to error middleware
 */
export function asyncHandler(
  fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Rate limiting state for IP addresses
 */
const rateLimitState = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter middleware factory
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const { windowMs, max, message = "Too many requests" } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    const state = rateLimitState.get(ip);

    if (!state || now > state.resetTime) {
      rateLimitState.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (state.count >= max) {
      return res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message,
          retryAfterMs: state.resetTime - now,
        },
      });
    }

    state.count++;
    next();
  };
}

/**
 * Cleanup expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, state] of rateLimitState.entries()) {
    if (now > state.resetTime) {
      rateLimitState.delete(ip);
    }
  }
}, 60000); // Clean up every minute
