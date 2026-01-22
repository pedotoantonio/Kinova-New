/**
 * Shared Utilities for API Routes
 * Token generation, helper functions, and constants
 */

import { randomBytes } from "crypto";
import { storage } from "../storage";
import type { UserRole, User } from "@shared/schema";

// Token expiration constants
export const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a secure random token
 */
export function createToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Generate a short invite code (8 chars, uppercase)
 */
export function generateInviteCode(): string {
  return randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);
}

/**
 * Issue access and refresh tokens for a user
 */
export async function issueTokens(
  userId: string,
  familyId: string,
  role: UserRole
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const accessToken = createToken();
  const refreshToken = createToken();
  const now = Date.now();

  await storage.createSession({
    token: accessToken,
    userId,
    familyId,
    role,
    type: "access",
    expiresAt: new Date(now + ACCESS_TOKEN_EXPIRY_MS),
  });

  await storage.createSession({
    token: refreshToken,
    userId,
    familyId,
    role,
    type: "refresh",
    expiresAt: new Date(now + REFRESH_TOKEN_EXPIRY_MS),
  });

  // Trigger async session cleanup
  maybeCleanupExpiredSessions();

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_MS / 1000,
  };
}

// Session cleanup tracking
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Cleanup expired sessions if enough time has passed
 */
export async function maybeCleanupExpiredSessions(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanupTime > CLEANUP_INTERVAL_MS) {
    lastCleanupTime = now;
    try {
      const cleaned = await storage.cleanExpiredSessions();
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired sessions`);
      }
    } catch (error) {
      console.error("Session cleanup error:", error);
    }
  }
}

/**
 * Format user data for API response (excludes sensitive fields)
 */
export function formatUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    birthDate: user.birthDate,
    familyId: user.familyId,
    role: user.role,
    emailVerified: user.emailVerified,
    canViewCalendar: user.canViewCalendar,
    canViewTasks: user.canViewTasks,
    canViewShopping: user.canViewShopping,
    canViewBudget: user.canViewBudget,
    canViewPlaces: user.canViewPlaces,
    canModifyItems: user.canModifyItems,
    createdAt: user.createdAt,
  };
}

/**
 * API error response helper
 */
export function apiError(
  code: string,
  message: string,
  details?: unknown
): {
  error: { code: string; message: string; details?: unknown };
} {
  const error: { code: string; message: string; details?: unknown } = {
    code,
    message,
  };
  if (details !== undefined) {
    error.details = details;
  }
  return { error };
}

/**
 * Create birthday event for user
 */
export async function createBirthdayEvent(
  user: User,
  createdBy: string
): Promise<void> {
  if (!user.birthDate) return;

  const birthDate = new Date(user.birthDate);
  const currentYear = new Date().getFullYear();
  const nextBirthday = new Date(
    currentYear,
    birthDate.getMonth(),
    birthDate.getDate()
  );

  if (nextBirthday < new Date()) {
    nextBirthday.setFullYear(currentYear + 1);
  }

  const displayName = user.displayName || user.firstName || user.username;

  const event = await storage.createEvent({
    familyId: user.familyId,
    title: `🎂 ${displayName}`,
    shortCode: null,
    description: `Compleanno di ${displayName}`,
    startDate: nextBirthday,
    endDate: nextBirthday,
    allDay: true,
    color: "#FF69B4",
    category: "family",
    assignedTo: user.id,
    placeId: null,
    isHoliday: false,
    createdBy,
  });

  await storage.createEventRecurrence({
    eventId: event.id,
    frequency: "monthly",
    interval: 12,
    endDate: null,
    byWeekday: null,
  });
}

/**
 * Parse and validate pagination parameters
 */
export function parsePagination(
  query: Record<string, unknown>,
  defaults: { limit: number; offset: number } = { limit: 50, offset: 0 }
): { limit: number; offset: number } {
  const limit = Math.min(
    Math.max(1, parseInt(String(query.limit || defaults.limit), 10) || defaults.limit),
    100
  );
  const offset = Math.max(
    0,
    parseInt(String(query.offset || defaults.offset), 10) || defaults.offset
  );
  return { limit, offset };
}

/**
 * Parse date range from query parameters
 */
export function parseDateRange(query: Record<string, unknown>): {
  from?: Date;
  to?: Date;
} {
  const result: { from?: Date; to?: Date } = {};

  if (query.from) {
    const from = new Date(String(query.from));
    if (!isNaN(from.getTime())) {
      result.from = from;
    }
  }

  if (query.to) {
    const to = new Date(String(query.to));
    if (!isNaN(to.getTime())) {
      result.to = to;
    }
  }

  return result;
}
