import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { UserRole } from "@shared/schema";
import { createNotification, createFamilyNotification, deleteNotificationsForEntity } from "./notification-service";
import { extractPermissions, getDefaultPermissionsForRole } from "./permissions";
import {
  validatePassword,
  validateEmail,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  RATE_LIMIT_MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MINUTES,
  EMAIL_VERIFICATION_EXPIRY_HOURS,
  PASSWORD_RESET_EXPIRY_MINUTES,
} from "./auth-utils";

const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function createToken(): string {
  return randomBytes(32).toString("base64url");
}

function generateInviteCode(): string {
  return randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);
}

import type { IStorage } from "./storage";
import type { User } from "@shared/schema";

async function createBirthdayEvent(storageInstance: IStorage, user: User, createdBy: string): Promise<void> {
  if (!user.birthDate) return;
  
  const birthDate = new Date(user.birthDate);
  const currentYear = new Date().getFullYear();
  const nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
  
  if (nextBirthday < new Date()) {
    nextBirthday.setFullYear(currentYear + 1);
  }
  
  const displayName = user.displayName || user.firstName || user.username;
  
  const event = await storageInstance.createEvent({
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
  
  await storageInstance.createEventRecurrence({
    eventId: event.id,
    frequency: "monthly",
    interval: 12,
    endDate: null,
    byWeekday: null,
  });
}

let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function maybeCleanupExpiredSessions() {
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

async function issueTokens(userId: string, familyId: string, role: UserRole): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
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

  maybeCleanupExpiredSessions();

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_MS / 1000,
  };
}

interface AuthRequest extends Request {
  auth?: {
    userId: string;
    familyId: string;
    role: UserRole;
    tokenId: string;
  };
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
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

function requireRoles(...allowedRoles: UserRole[]) {
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

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, displayName, familyName, acceptTerms } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: { code: "MISSING_FIELDS", message: "Email and password required" } });
      }

      if (!acceptTerms) {
        return res.status(400).json({ error: { code: "TERMS_NOT_ACCEPTED", message: "You must accept the terms and privacy policy" } });
      }

      if (!validateEmail(email)) {
        return res.status(400).json({ error: { code: "INVALID_EMAIL", message: "Invalid email format" } });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ 
          error: { 
            code: "WEAK_PASSWORD", 
            message: "Password does not meet requirements",
            details: passwordValidation.errors,
            strength: passwordValidation.strength
          } 
        });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" } });
      }

      const emailVerificationToken = generateSecureToken();
      const emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

      const username = email.split("@")[0] + "_" + randomBytes(4).toString("hex");
      const family = await storage.createFamily({ name: familyName || `${displayName || email.split("@")[0]}'s Family` });

      const user = await storage.createUser({
        email,
        username,
        password: hashPassword(password),
        displayName: displayName || email.split("@")[0],
        familyId: family.id,
        role: "admin",
        emailVerificationToken,
        emailVerificationExpires,
      });

      const tokenData = await issueTokens(user.id, user.familyId, user.role);

      // Token generated for email verification - in production, send via email service

      res.status(201).json({
        ...tokenData,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
          role: user.role,
          emailVerified: user.emailVerified,
          permissions: extractPermissions(user),
        },
        requiresEmailVerification: true,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || null;

      if (!email || !password) {
        return res.status(400).json({ error: { code: "MISSING_FIELDS", message: "Email and password required" } });
      }

      const recentAttempts = await storage.getRecentLoginAttempts(email, RATE_LIMIT_WINDOW_MINUTES);
      if (recentAttempts.length >= RATE_LIMIT_MAX_ATTEMPTS) {
        const oldestAttempt = recentAttempts[recentAttempts.length - 1];
        const resetTime = new Date(oldestAttempt.createdAt.getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
        const minutesLeft = Math.ceil((resetTime.getTime() - Date.now()) / 60000);
        
        return res.status(429).json({ 
          error: { 
            code: "RATE_LIMITED", 
            message: "Too many login attempts. Please try again later.",
            retryAfterMinutes: minutesLeft
          } 
        });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !verifyPassword(password, user.password)) {
        await storage.recordLoginAttempt(email, ipAddress, false);
        return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } });
      }

      await storage.recordLoginAttempt(email, ipAddress, true);

      const tokenData = await issueTokens(user.id, user.familyId, user.role);

      res.json({
        ...tokenData,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
          role: user.role,
          emailVerified: user.emailVerified,
          permissions: extractPermissions(user),
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: { code: "MISSING_TOKEN", message: "Verification token required" } });
      }

      const user = await storage.getUserByEmailVerificationToken(token);
      if (!user) {
        return res.status(400).json({ error: { code: "INVALID_TOKEN", message: "Invalid or expired verification token" } });
      }

      if (user.emailVerificationExpires && new Date(user.emailVerificationExpires) < new Date()) {
        return res.status(400).json({ error: { code: "TOKEN_EXPIRED", message: "Verification token has expired" } });
      }

      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      res.json({ success: true, message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/auth/resend-verification", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user) {
        return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: { code: "ALREADY_VERIFIED", message: "Email is already verified" } });
      }

      const emailVerificationToken = generateSecureToken();
      const emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

      await storage.updateUser(user.id, {
        emailVerificationToken,
        emailVerificationExpires,
      });

      // New verification token generated - in production, send via email service

      res.json({ success: true, message: "Verification email sent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: { code: "MISSING_EMAIL", message: "Email required" } });
      }

      const user = await storage.getUserByEmail(email);
      
      if (user) {
        const passwordResetToken = generateSecureToken();
        const passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

        await storage.updateUser(user.id, {
          passwordResetToken,
          passwordResetExpires,
        });

        // Password reset token generated - in production, send via email service
      }

      res.json({ success: true, message: "If an account exists with this email, a password reset link has been sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: { code: "MISSING_FIELDS", message: "Token and new password required" } });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ 
          error: { 
            code: "WEAK_PASSWORD", 
            message: "Password does not meet requirements",
            details: passwordValidation.errors,
            strength: passwordValidation.strength
          } 
        });
      }

      const user = await storage.getUserByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ error: { code: "INVALID_TOKEN", message: "Invalid or expired reset token" } });
      }

      if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
        return res.status(400).json({ error: { code: "TOKEN_EXPIRED", message: "Reset token has expired" } });
      }

      await storage.deleteSessionsByUser(user.id);

      await storage.updateUser(user.id, {
        password: hashPassword(password),
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/auth/logout-all", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteSessionsByUser(req.auth!.userId);
      res.json({ success: true, message: "Logged out from all devices" });
    } catch (error) {
      console.error("Logout all error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/auth/password-policy", async (req: Request, res: Response) => {
    res.json({
      minLength: 8,
      requirements: ["uppercase", "lowercase", "number", "symbol"],
    });
  });

  app.post("/api/auth/validate-password", async (req: Request, res: Response) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: { code: "MISSING_PASSWORD", message: "Password required" } });
    }
    const result = validatePassword(password);
    res.json(result);
  });

  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token required" });
      }

      const session = await storage.getSession(refreshToken);

      if (!session) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      if (session.type !== "refresh") {
        return res.status(401).json({ error: "Invalid token type" });
      }

      if (new Date(session.expiresAt) < new Date()) {
        await storage.deleteSession(refreshToken);
        return res.status(401).json({ error: "Refresh token expired" });
      }

      await storage.deleteSession(refreshToken);

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const newTokens = await issueTokens(user.id, user.familyId, user.role);

      res.json({
        ...newTokens,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
          role: user.role,
          emailVerified: user.emailVerified,
          permissions: extractPermissions(user),
        },
      });
    } catch (error) {
      console.error("Refresh error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        await storage.deleteSession(token);
      }

      const { refreshToken } = req.body;
      if (refreshToken) {
        await storage.deleteSession(refreshToken);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.json({ success: true });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user) {
        return res.status(401).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
      }

      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        familyId: user.familyId,
        role: user.role,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        permissions: extractPermissions(user),
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/family", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const family = await storage.getFamily(req.auth!.familyId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      res.json(family);
    } catch (error) {
      console.error("Get family error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/family", authMiddleware, requireRoles("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { name, city, cityLat, cityLon } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (city !== undefined) updateData.city = city;
      if (cityLat !== undefined) updateData.cityLat = cityLat;
      if (cityLon !== undefined) updateData.cityLon = cityLon;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updated = await storage.updateFamily(req.auth!.familyId, updateData as any);
      if (!updated) {
        return res.status(404).json({ error: "Family not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update family error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/family/members", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const members = await storage.getFamilyMembers(req.auth!.familyId);

      res.json(
        members.map((m) => ({
          id: m.id,
          username: m.username,
          firstName: m.firstName,
          lastName: m.lastName,
          displayName: m.displayName,
          birthDate: m.birthDate,
          avatarUrl: m.avatarUrl,
          role: m.role,
          permissions: extractPermissions(m),
        }))
      );
    } catch (error) {
      console.error("Get family members error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/family/members/:memberId", authMiddleware, requireRoles("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { memberId } = req.params;
      const { 
        role, 
        displayName,
        firstName,
        lastName,
        birthDate,
        canViewCalendar, 
        canViewTasks, 
        canViewShopping, 
        canViewBudget, 
        canViewPlaces, 
        canModifyItems 
      } = req.body;

      const member = await storage.getUser(memberId);
      if (!member) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
      }

      if (member.familyId !== req.auth!.familyId) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Member does not belong to your family" } });
      }

      if (member.role === "admin" && memberId !== req.auth!.userId) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Cannot modify another admin" } });
      }

      const updateData: Record<string, unknown> = {};
      if (role !== undefined && ["member", "child"].includes(role)) updateData.role = role;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
      if (canViewCalendar !== undefined) updateData.canViewCalendar = canViewCalendar;
      if (canViewTasks !== undefined) updateData.canViewTasks = canViewTasks;
      if (canViewShopping !== undefined) updateData.canViewShopping = canViewShopping;
      if (canViewBudget !== undefined) updateData.canViewBudget = canViewBudget;
      if (canViewPlaces !== undefined) updateData.canViewPlaces = canViewPlaces;
      if (canModifyItems !== undefined) updateData.canModifyItems = canModifyItems;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updated = await storage.updateUser(memberId, updateData as any);

      if (birthDate && updated) {
        await createBirthdayEvent(storage, updated, req.auth!.userId);
      }

      res.json({
        id: updated!.id,
        username: updated!.username,
        firstName: updated!.firstName,
        lastName: updated!.lastName,
        displayName: updated!.displayName,
        birthDate: updated!.birthDate,
        avatarUrl: updated!.avatarUrl,
        role: updated!.role,
        permissions: extractPermissions(updated!),
      });
    } catch (error) {
      console.error("Update member error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/family/invite", authMiddleware, requireRoles("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { 
        role = "member", 
        displayName,
        email,
        canViewCalendar,
        canViewTasks,
        canViewShopping,
        canViewBudget,
        canViewPlaces,
        canModifyItems,
      } = req.body;

      if (!["member", "child"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'member' or 'child'" });
      }

      const code = generateInviteCode();
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

      const invite = await storage.createInvite({
        familyId: req.auth!.familyId,
        code,
        role: role as UserRole,
        expiresAt,
        createdBy: req.auth!.userId,
        displayName,
        email,
        canViewCalendar,
        canViewTasks,
        canViewShopping,
        canViewBudget,
        canViewPlaces,
        canModifyItems,
      });

      res.status(201).json({
        id: invite.id,
        code: invite.code,
        role: invite.role,
        displayName: invite.displayName,
        expiresAt: invite.expiresAt,
        permissions: {
          canViewCalendar: invite.canViewCalendar,
          canViewTasks: invite.canViewTasks,
          canViewShopping: invite.canViewShopping,
          canViewBudget: invite.canViewBudget,
          canViewPlaces: invite.canViewPlaces,
          canModifyItems: invite.canModifyItems,
        },
      });
    } catch (error) {
      console.error("Create invite error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/family/invites", authMiddleware, requireRoles("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const invites = await storage.getActiveInvitesByFamily(req.auth!.familyId);

      res.json(
        invites.map((i) => ({
          id: i.id,
          code: i.code,
          role: i.role,
          email: i.email,
          expiresAt: i.expiresAt,
          createdAt: i.createdAt,
        }))
      );
    } catch (error) {
      console.error("Get invites error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/family/join", async (req: Request, res: Response) => {
    try {
      const { code, email, password, displayName, acceptTerms } = req.body;

      if (!code) {
        return res.status(400).json({ error: { code: "MISSING_CODE", message: "Invite code required" } });
      }

      const invite = await storage.getInviteByCode(code);
      if (!invite) {
        return res.status(404).json({ error: { code: "INVALID_CODE", message: "Invalid or expired invite code" } });
      }

      if (invite.expiresAt < new Date()) {
        return res.status(410).json({ error: { code: "CODE_EXPIRED", message: "Invite code has expired" } });
      }

      if (invite.acceptedAt) {
        return res.status(410).json({ error: { code: "CODE_USED", message: "Invite code has already been used" } });
      }

      if (!email || !password) {
        return res.status(400).json({ error: { code: "MISSING_FIELDS", message: "Email and password required" } });
      }

      if (!acceptTerms) {
        return res.status(400).json({ error: { code: "TERMS_NOT_ACCEPTED", message: "You must accept the terms and privacy policy" } });
      }

      if (!validateEmail(email)) {
        return res.status(400).json({ error: { code: "INVALID_EMAIL", message: "Invalid email format" } });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ 
          error: { 
            code: "WEAK_PASSWORD", 
            message: "Password does not meet requirements",
            details: passwordValidation.errors,
            strength: passwordValidation.strength
          } 
        });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" } });
      }

      const username = email.split("@")[0] + "_" + randomBytes(4).toString("hex");

      const user = await storage.createUserWithPermissions({
        email,
        username,
        password: hashPassword(password),
        displayName: invite.displayName || displayName || email.split("@")[0],
        familyId: invite.familyId,
        role: invite.role,
        canViewCalendar: invite.canViewCalendar,
        canViewTasks: invite.canViewTasks,
        canViewShopping: invite.canViewShopping,
        canViewBudget: invite.canViewBudget,
        canViewPlaces: invite.canViewPlaces,
        canModifyItems: invite.canModifyItems,
      });

      await storage.acceptInvite(invite.id, user.id);

      const tokenData = await issueTokens(user.id, user.familyId, user.role);

      res.status(201).json({
        ...tokenData,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          familyId: user.familyId,
          role: user.role,
          emailVerified: user.emailVerified,
          permissions: extractPermissions(user),
        },
      });
    } catch (error) {
      console.error("Join family error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/family/invite/accept", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Invite code required" });
      }

      const invite = await storage.getInviteByCode(code);
      if (!invite) {
        return res.status(404).json({ error: "Invalid or expired invite code" });
      }

      if (invite.expiresAt < new Date()) {
        return res.status(410).json({ error: "Invite code has expired" });
      }

      if (invite.acceptedAt) {
        return res.status(410).json({ error: "Invite code has already been used" });
      }

      const user = await storage.getUser(req.auth!.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      await storage.updateUser(user.id, {
        familyId: invite.familyId,
        role: invite.role,
        canViewCalendar: invite.canViewCalendar,
        canViewTasks: invite.canViewTasks,
        canViewShopping: invite.canViewShopping,
        canViewBudget: invite.canViewBudget,
        canViewPlaces: invite.canViewPlaces,
        canModifyItems: invite.canModifyItems,
      });

      await storage.acceptInvite(invite.id, user.id);

      await storage.deleteSessionsByUser(user.id);

      const updatedUser = await storage.getUser(user.id);
      const tokenData = await issueTokens(updatedUser!.id, updatedUser!.familyId, updatedUser!.role);

      res.json({
        ...tokenData,
        user: {
          id: updatedUser!.id,
          username: updatedUser!.username,
          displayName: updatedUser!.displayName,
          familyId: updatedUser!.familyId,
          role: updatedUser!.role,
          permissions: extractPermissions(updatedUser!),
        },
      });
    } catch (error) {
      console.error("Accept invite error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/family/members/:memberId", authMiddleware, requireRoles("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { memberId } = req.params;

      if (memberId === req.auth!.userId) {
        return res.status(400).json({ error: { code: "SELF_REMOVAL", message: "Cannot remove yourself" } });
      }

      const member = await storage.getUser(memberId);
      if (!member) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
      }

      if (member.familyId !== req.auth!.familyId) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Member does not belong to your family" } });
      }

      const guestFamily = await storage.createFamily({ name: `${member.username}'s Family` });
      await storage.updateUser(memberId, { familyId: guestFamily.id, role: "admin" });

      res.json({ success: true });
    } catch (error) {
      console.error("Remove member error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/events", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { from, to, category, assignedTo } = req.query;
      const fromDate = from ? new Date(from as string) : undefined;
      const toDate = to ? new Date(to as string) : undefined;
      const filters: { category?: "family" | "course" | "shift" | "vacation" | "holiday" | "other"; assignedTo?: string } = {};
      if (category && ["family", "course", "shift", "vacation", "holiday", "other"].includes(category as string)) {
        filters.category = category as "family" | "course" | "shift" | "vacation" | "holiday" | "other";
      }
      if (assignedTo) {
        filters.assignedTo = assignedTo as string;
      }
      
      if (req.auth!.role === "child") {
        filters.assignedTo = req.auth!.userId;
      }
      
      const events = await storage.getEvents(req.auth!.familyId, fromDate, toDate, Object.keys(filters).length > 0 ? filters : undefined);
      
      const eventsWithRecurrence = await Promise.all(events.map(async (e) => {
        const recurrence = await storage.getEventRecurrence(e.id);
        return {
          id: e.id,
          familyId: e.familyId,
          title: e.title,
          shortCode: e.shortCode,
          description: e.description,
          startDate: e.startDate.toISOString(),
          endDate: e.endDate?.toISOString() || null,
          allDay: e.allDay,
          color: e.color,
          category: e.category,
          assignedTo: e.assignedTo,
          placeId: e.placeId,
          isHoliday: e.isHoliday,
          createdBy: e.createdBy,
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
          recurrence: recurrence ? {
            frequency: recurrence.frequency,
            interval: recurrence.interval,
            endDate: recurrence.endDate?.toISOString() || null,
            byWeekday: recurrence.byWeekday,
          } : null,
        };
      }));
      
      res.json(eventsWithRecurrence);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/events", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { title, shortCode, description, startDate, endDate, allDay, color, category, assignedTo, placeId, isHoliday, recurrence } = req.body;
      
      if (!title || !startDate) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Title and startDate are required" } });
      }
      
      const validCategories = ["family", "course", "shift", "vacation", "holiday", "other"];
      const eventCategory = validCategories.includes(category) ? category : "family";
      
      const event = await storage.createEvent({
        familyId: req.auth!.familyId,
        title,
        shortCode: shortCode || null,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay: allDay ?? false,
        color: color || null,
        category: eventCategory,
        assignedTo: assignedTo || null,
        placeId: placeId || null,
        isHoliday: isHoliday ?? false,
        createdBy: req.auth!.userId,
      });
      
      let eventRecurrence = null;
      if (recurrence && recurrence.frequency) {
        const validFrequencies = ["daily", "weekly", "monthly"];
        if (validFrequencies.includes(recurrence.frequency)) {
          eventRecurrence = await storage.createEventRecurrence({
            eventId: event.id,
            frequency: recurrence.frequency,
            interval: recurrence.interval || 1,
            endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
            byWeekday: recurrence.byWeekday || null,
          });
        }
      }
      
      const settings = await storage.getNotificationSettings(req.auth!.userId);
      const reminderMinutes = settings?.eventReminderMinutes || 30;
      const eventStart = new Date(startDate);
      const reminderTime = new Date(eventStart.getTime() - reminderMinutes * 60 * 1000);
      
      if (reminderTime > new Date()) {
        const notificationType = event.allDay ? "event_allday" : "event_reminder";
        await createFamilyNotification({
          type: notificationType,
          titleKey: "notifications.event_reminder.title",
          messageKey: "notifications.event_reminder.message",
          messageParams: { title: event.title, minutes: String(reminderMinutes) },
          familyId: req.auth!.familyId,
          relatedEntityType: "event",
          relatedEntityId: event.id,
          scheduledAt: reminderTime,
          excludeUserId: req.auth!.userId,
        });
      }
      
      res.status(201).json({
        id: event.id,
        familyId: event.familyId,
        title: event.title,
        shortCode: event.shortCode,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString() || null,
        allDay: event.allDay,
        color: event.color,
        category: event.category,
        assignedTo: event.assignedTo,
        placeId: event.placeId,
        isHoliday: event.isHoliday,
        createdBy: event.createdBy,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        recurrence: eventRecurrence ? {
          frequency: eventRecurrence.frequency,
          interval: eventRecurrence.interval,
          endDate: eventRecurrence.endDate?.toISOString() || null,
          byWeekday: eventRecurrence.byWeekday,
        } : null,
      });
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/events/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, shortCode, description, startDate, endDate, allDay, color, category, assignedTo, placeId, isHoliday, recurrence } = req.body;
      
      const existing = await storage.getEvent(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Event not found" } });
      }
      
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (shortCode !== undefined) updates.shortCode = shortCode || null;
      if (description !== undefined) updates.description = description;
      if (startDate !== undefined) updates.startDate = new Date(startDate);
      if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;
      if (allDay !== undefined) updates.allDay = allDay;
      if (color !== undefined) updates.color = color;
      if (category !== undefined) {
        const validCategories = ["family", "course", "shift", "vacation", "holiday", "other"];
        updates.category = validCategories.includes(category) ? category : "family";
      }
      if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;
      if (placeId !== undefined) updates.placeId = placeId || null;
      if (isHoliday !== undefined) updates.isHoliday = isHoliday;
      
      const event = await storage.updateEvent(id, req.auth!.familyId, updates);
      if (!event) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Event not found" } });
      }
      
      let eventRecurrence = await storage.getEventRecurrence(id);
      if (recurrence !== undefined) {
        if (recurrence === null) {
          await storage.deleteEventRecurrence(id);
          eventRecurrence = undefined;
        } else if (recurrence.frequency) {
          const validFrequencies = ["daily", "weekly", "monthly"];
          if (validFrequencies.includes(recurrence.frequency)) {
            if (eventRecurrence) {
              eventRecurrence = await storage.updateEventRecurrence(id, {
                frequency: recurrence.frequency,
                interval: recurrence.interval || 1,
                endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
                byWeekday: recurrence.byWeekday || null,
              });
            } else {
              eventRecurrence = await storage.createEventRecurrence({
                eventId: id,
                frequency: recurrence.frequency,
                interval: recurrence.interval || 1,
                endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
                byWeekday: recurrence.byWeekday || null,
              });
            }
          }
        }
      }
      
      res.json({
        id: event.id,
        familyId: event.familyId,
        title: event.title,
        shortCode: event.shortCode,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString() || null,
        allDay: event.allDay,
        color: event.color,
        category: event.category,
        assignedTo: event.assignedTo,
        placeId: event.placeId,
        isHoliday: event.isHoliday,
        createdBy: event.createdBy,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        recurrence: eventRecurrence ? {
          frequency: eventRecurrence.frequency,
          interval: eventRecurrence.interval,
          endDate: eventRecurrence.endDate?.toISOString() || null,
          byWeekday: eventRecurrence.byWeekday,
        } : null,
      });
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/events/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const existing = await storage.getEvent(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Event not found" } });
      }
      
      await storage.deleteEvent(id, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/tasks", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { completed, assignedTo } = req.query;
      const filters: { completed?: boolean; assignedTo?: string } = {};
      if (completed !== undefined) filters.completed = completed === "true";
      if (assignedTo) filters.assignedTo = assignedTo as string;
      
      if (req.auth!.role === "child") {
        filters.assignedTo = req.auth!.userId;
      }
      
      const tasks = await storage.getTasks(req.auth!.familyId, filters);
      res.json(tasks.map(t => ({
        id: t.id,
        familyId: t.familyId,
        title: t.title,
        description: t.description,
        completed: t.completed,
        dueDate: t.dueDate?.toISOString() || null,
        assignedTo: t.assignedTo,
        placeId: t.placeId,
        priority: t.priority,
        createdBy: t.createdBy,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })));
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/tasks", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canModifyItems) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      }
      
      const { title, description, dueDate, assignedTo, placeId, priority } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Title is required" } });
      }
      
      const task = await storage.createTask({
        familyId: req.auth!.familyId,
        title,
        description: description || null,
        completed: false,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo || null,
        placeId: placeId || null,
        priority: priority || "medium",
        createdBy: req.auth!.userId,
      });
      
      if (assignedTo && assignedTo !== req.auth!.userId) {
        await createNotification({
          type: "task_assigned",
          titleKey: "notifications.task_assigned.title",
          messageKey: "notifications.task_assigned.message",
          messageParams: { title: task.title },
          targetUserId: assignedTo,
          familyId: req.auth!.familyId,
          relatedEntityType: "task",
          relatedEntityId: task.id,
          pushTitle: "New Task Assigned",
          pushBody: task.title,
        });
      }
      
      if (dueDate) {
        const dueDateObj = new Date(dueDate);
        const reminderTime = new Date(dueDateObj.getTime() - 60 * 60 * 1000);
        if (reminderTime > new Date()) {
          await createFamilyNotification({
            type: "task_due",
            titleKey: "notifications.task_due.title",
            messageKey: "notifications.task_due.message",
            messageParams: { title: task.title },
            familyId: req.auth!.familyId,
            relatedEntityType: "task",
            relatedEntityId: task.id,
            scheduledAt: reminderTime,
          });
        }
      }
      
      res.status(201).json({
        id: task.id,
        familyId: task.familyId,
        title: task.title,
        description: task.description,
        completed: task.completed,
        dueDate: task.dueDate?.toISOString() || null,
        assignedTo: task.assignedTo,
        placeId: task.placeId,
        priority: task.priority,
        createdBy: task.createdBy,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/tasks/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canModifyItems) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      }
      
      const { id } = req.params;
      const { title, description, completed, dueDate, assignedTo, placeId, priority } = req.body;
      
      const existing = await storage.getTask(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });
      }
      
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (completed !== undefined) updates.completed = completed;
      if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
      if (assignedTo !== undefined) updates.assignedTo = assignedTo;
      if (placeId !== undefined) updates.placeId = placeId || null;
      if (priority !== undefined) updates.priority = priority;
      
      const task = await storage.updateTask(id, req.auth!.familyId, updates);
      if (!task) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });
      }
      
      res.json({
        id: task.id,
        familyId: task.familyId,
        title: task.title,
        description: task.description,
        completed: task.completed,
        dueDate: task.dueDate?.toISOString() || null,
        assignedTo: task.assignedTo,
        placeId: task.placeId,
        priority: task.priority,
        createdBy: task.createdBy,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/tasks/:id", authMiddleware, requireRoles("admin", "member"), async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canModifyItems) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      }
      
      const { id } = req.params;
      
      const existing = await storage.getTask(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Task not found" } });
      }
      
      await storage.deleteTask(id, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/shopping", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canViewShopping) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      }
      
      const { purchased, category } = req.query;
      const filters: { purchased?: boolean; category?: string } = {};
      if (purchased !== undefined) filters.purchased = purchased === "true";
      if (category) filters.category = category as string;
      
      const items = await storage.getShoppingItems(req.auth!.familyId, filters);
      res.json(items.map(i => ({
        id: i.id,
        familyId: i.familyId,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
        purchased: i.purchased,
        createdBy: i.createdBy,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })));
    } catch (error) {
      console.error("Get shopping items error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/shopping", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canViewShopping || !user.canModifyItems) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      }
      
      const { name, quantity, unit, category } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Name is required" } });
      }
      
      const item = await storage.createShoppingItem({
        familyId: req.auth!.familyId,
        name,
        quantity: quantity ?? 1,
        unit: unit || null,
        category: category || null,
        purchased: false,
        createdBy: req.auth!.userId,
        estimatedPrice: null,
        purchasedAt: null,
        purchasedBy: null,
        actualPrice: null,
        purchaseExpenseId: null,
      });
      
      await createFamilyNotification({
        type: "shopping_item_added",
        titleKey: "notifications.shopping_item_added.title",
        messageKey: "notifications.shopping_item_added.message",
        messageParams: { name: item.name },
        familyId: req.auth!.familyId,
        relatedEntityType: "shopping_item",
        relatedEntityId: item.id,
        excludeUserId: req.auth!.userId,
        pushTitle: "Shopping List Updated",
        pushBody: `${item.name} added to shopping list`,
      });
      
      res.status(201).json({
        id: item.id,
        familyId: item.familyId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        purchased: item.purchased,
        createdBy: item.createdBy,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Create shopping item error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/shopping/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canViewShopping || !user.canModifyItems) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      }
      
      const { id } = req.params;
      const { name, quantity, unit, category, purchased } = req.body;
      
      const existing = await storage.getShoppingItem(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Shopping item not found" } });
      }
      
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (quantity !== undefined) updates.quantity = quantity;
      if (unit !== undefined) updates.unit = unit;
      if (category !== undefined) updates.category = category;
      if (purchased !== undefined) updates.purchased = purchased;
      
      const item = await storage.updateShoppingItem(id, req.auth!.familyId, updates);
      if (!item) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Shopping item not found" } });
      }
      
      res.json({
        id: item.id,
        familyId: item.familyId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        purchased: item.purchased,
        createdBy: item.createdBy,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update shopping item error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/shopping/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canViewShopping || !user.canModifyItems) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      }
      
      const { id } = req.params;
      
      const existing = await storage.getShoppingItem(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Shopping item not found" } });
      }
      
      await storage.deleteShoppingItem(id, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete shopping item error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/expenses", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canViewBudget) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      }
      
      const { from, to, category, paidBy } = req.query;
      const filters: { from?: Date; to?: Date; category?: string; paidBy?: string } = {};
      if (from) filters.from = new Date(from as string);
      if (to) filters.to = new Date(to as string);
      if (category) filters.category = category as string;
      if (paidBy) filters.paidBy = paidBy as string;
      
      const expenses = await storage.getExpenses(req.auth!.familyId, filters);
      res.json(expenses.map(e => ({
        id: e.id,
        familyId: e.familyId,
        amount: parseFloat(e.amount),
        description: e.description,
        category: e.category,
        paidBy: e.paidBy,
        date: e.date.toISOString(),
        createdBy: e.createdBy,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })));
    } catch (error) {
      console.error("Get expenses error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/expenses", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canViewBudget) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      }
      
      const { amount, description, category, paidBy, date } = req.body;
      
      if (amount === undefined || !description || !paidBy || !date) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Amount, description, paidBy, and date are required" } });
      }
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Amount must be greater than zero" } });
      }
      
      const expense = await storage.createExpense({
        familyId: req.auth!.familyId,
        amount: amount.toString(),
        description,
        category: category || null,
        paidBy,
        date: new Date(date),
        createdBy: req.auth!.userId,
      });
      
      res.status(201).json({
        id: expense.id,
        familyId: expense.familyId,
        amount: parseFloat(expense.amount),
        description: expense.description,
        category: expense.category,
        paidBy: expense.paidBy,
        date: expense.date.toISOString(),
        createdBy: expense.createdBy,
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/expenses/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canViewBudget) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      }
      
      const { id } = req.params;
      const { amount, description, category, paidBy, date } = req.body;
      
      const existing = await storage.getExpense(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
      }
      
      const updates: Record<string, unknown> = {};
      if (amount !== undefined) {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Amount must be greater than zero" } });
        }
        updates.amount = amount.toString();
      }
      if (description !== undefined) updates.description = description;
      if (category !== undefined) updates.category = category;
      if (paidBy !== undefined) updates.paidBy = paidBy;
      if (date !== undefined) updates.date = new Date(date);
      
      const expense = await storage.updateExpense(id, req.auth!.familyId, updates);
      if (!expense) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
      }
      
      res.json({
        id: expense.id,
        familyId: expense.familyId,
        amount: parseFloat(expense.amount),
        description: expense.description,
        category: expense.category,
        paidBy: expense.paidBy,
        date: expense.date.toISOString(),
        createdBy: expense.createdBy,
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/expenses/:id", authMiddleware, requireRoles("admin", "member"), async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canViewBudget) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
      }
      
      const { id } = req.params;
      
      const existing = await storage.getExpense(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Expense not found" } });
      }
      
      await storage.deleteExpense(id, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  // Notes API
  app.get("/api/notes", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { relatedType, relatedId, pinned, search, limit, offset } = req.query;
      
      const filters: { relatedType?: string; relatedId?: string; pinned?: boolean; search?: string; limit?: number; offset?: number } = {};
      if (relatedType && typeof relatedType === "string") {
        filters.relatedType = relatedType;
      }
      if (relatedId && typeof relatedId === "string") {
        filters.relatedId = relatedId;
      }
      if (pinned !== undefined) {
        filters.pinned = pinned === "true";
      }
      if (search && typeof search === "string") {
        filters.search = search.trim();
      }
      if (limit && typeof limit === "string") {
        const parsedLimit = parseInt(limit, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          filters.limit = Math.min(parsedLimit, 100);
        }
      }
      if (offset && typeof offset === "string") {
        const parsedOffset = parseInt(offset, 10);
        if (!isNaN(parsedOffset) && parsedOffset >= 0) {
          filters.offset = parsedOffset;
        }
      }

      const notesList = await storage.getNotes(req.auth!.familyId, filters);
      res.json(notesList.map(n => ({
        id: n.id,
        familyId: n.familyId,
        title: n.title,
        content: n.content,
        color: n.color,
        pinned: n.pinned,
        relatedType: n.relatedType,
        relatedId: n.relatedId,
        createdBy: n.createdBy,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })));
    } catch (error) {
      console.error("Get notes error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/notes/by-related/:type/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { type, id } = req.params;
      const validTypes = ["event", "task", "expense", "shopping_item"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid related type" } });
      }

      const notesList = await storage.getNotesByRelated(req.auth!.familyId, type, id);
      res.json(notesList.map(n => ({
        id: n.id,
        familyId: n.familyId,
        title: n.title,
        content: n.content,
        color: n.color,
        pinned: n.pinned,
        relatedType: n.relatedType,
        relatedId: n.relatedId,
        createdBy: n.createdBy,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })));
    } catch (error) {
      console.error("Get related notes error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/notes/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const note = await storage.getNote(req.params.id, req.auth!.familyId);
      if (!note) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Note not found" } });
      }
      res.json({
        id: note.id,
        familyId: note.familyId,
        title: note.title,
        content: note.content,
        color: note.color,
        pinned: note.pinned,
        relatedType: note.relatedType,
        relatedId: note.relatedId,
        createdBy: note.createdBy,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Get note error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/notes", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canModifyItems) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Non hai i permessi per creare note" } });
      }

      const { title, content, color, pinned, relatedType, relatedId } = req.body;
      
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Title is required" } });
      }

      if (relatedType && relatedId) {
        const validTypes = ["event", "task", "expense", "shopping_item"];
        if (!validTypes.includes(relatedType)) {
          return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid related type" } });
        }
        
        let exists = false;
        switch (relatedType) {
          case "event":
            exists = !!(await storage.getEvent(relatedId, req.auth!.familyId));
            break;
          case "task":
            exists = !!(await storage.getTask(relatedId, req.auth!.familyId));
            break;
          case "expense":
            exists = !!(await storage.getExpense(relatedId, req.auth!.familyId));
            break;
          case "shopping_item":
            exists = !!(await storage.getShoppingItem(relatedId, req.auth!.familyId));
            break;
        }
        if (!exists) {
          return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Related entity not found" } });
        }
      }

      const noteColors = ["default", "red", "orange", "yellow", "green", "blue", "purple", "pink"];
      const noteColor = noteColors.includes(color) ? color : "default";

      const note = await storage.createNote({
        familyId: req.auth!.familyId,
        title: title.trim(),
        content: content || null,
        color: noteColor,
        pinned: pinned === true,
        relatedType: relatedType || null,
        relatedId: relatedId || null,
        createdBy: req.auth!.userId,
      });

      res.status(201).json({
        id: note.id,
        familyId: note.familyId,
        title: note.title,
        content: note.content,
        color: note.color,
        pinned: note.pinned,
        relatedType: note.relatedType,
        relatedId: note.relatedId,
        createdBy: note.createdBy,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Create note error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.patch("/api/notes/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canModifyItems) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Non hai i permessi per modificare note" } });
      }

      const existingNote = await storage.getNote(req.params.id, req.auth!.familyId);
      if (!existingNote) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Note not found" } });
      }

      const { title, content, color, pinned, relatedType, relatedId } = req.body;
      const updates: Record<string, unknown> = {};

      if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length === 0) {
          return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Title cannot be empty" } });
        }
        updates.title = title.trim();
      }
      if (content !== undefined) updates.content = content;
      if (color !== undefined) {
        const noteColors = ["default", "red", "orange", "yellow", "green", "blue", "purple", "pink"];
        if (noteColors.includes(color)) updates.color = color;
      }
      if (pinned !== undefined) updates.pinned = pinned === true;
      
      if (relatedType !== undefined || relatedId !== undefined) {
        const newRelatedType = relatedType !== undefined ? relatedType : existingNote.relatedType;
        const newRelatedId = relatedId !== undefined ? relatedId : existingNote.relatedId;
        
        if (newRelatedType && newRelatedId) {
          const validRelatedTypes = ["event", "task", "expense", "shopping_item"];
          if (!validRelatedTypes.includes(newRelatedType)) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid related type" } });
          }
          
          let relatedExists = false;
          switch (newRelatedType) {
            case "event":
              relatedExists = !!(await storage.getEvent(newRelatedId, req.auth!.familyId));
              break;
            case "task":
              relatedExists = !!(await storage.getTask(newRelatedId, req.auth!.familyId));
              break;
            case "expense":
              relatedExists = !!(await storage.getExpense(newRelatedId, req.auth!.familyId));
              break;
            case "shopping_item":
              relatedExists = !!(await storage.getShoppingItem(newRelatedId, req.auth!.familyId));
              break;
          }
          
          if (!relatedExists) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Related entity not found" } });
          }
          
          updates.relatedType = newRelatedType;
          updates.relatedId = newRelatedId;
        } else if (!newRelatedType && !newRelatedId) {
          updates.relatedType = null;
          updates.relatedId = null;
        } else {
          return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Both relatedType and relatedId must be provided together" } });
        }
      }

      const note = await storage.updateNote(req.params.id, req.auth!.familyId, updates);
      res.json({
        id: note!.id,
        familyId: note!.familyId,
        title: note!.title,
        content: note!.content,
        color: note!.color,
        pinned: note!.pinned,
        relatedType: note!.relatedType,
        relatedId: note!.relatedId,
        createdBy: note!.createdBy,
        createdAt: note!.createdAt.toISOString(),
        updatedAt: note!.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update note error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/notes/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.auth!.userId);
      if (!user || !user.canModifyItems) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Non hai i permessi per eliminare note" } });
      }

      const existingNote = await storage.getNote(req.params.id, req.auth!.familyId);
      if (!existingNote) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Note not found" } });
      }

      await storage.deleteNote(req.params.id, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete note error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/places", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const placesList = await storage.getPlaces(req.auth!.familyId, category as any);
      
      res.json(placesList.map(p => ({
        id: p.id,
        familyId: p.familyId,
        name: p.name,
        description: p.description,
        latitude: parseFloat(p.latitude),
        longitude: parseFloat(p.longitude),
        address: p.address,
        category: p.category,
        createdBy: p.createdBy,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })));
    } catch (error) {
      console.error("Get places error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/places/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const place = await storage.getPlace(id, req.auth!.familyId);
      
      if (!place) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Place not found" } });
      }
      
      res.json({
        id: place.id,
        familyId: place.familyId,
        name: place.name,
        description: place.description,
        latitude: parseFloat(place.latitude),
        longitude: parseFloat(place.longitude),
        address: place.address,
        category: place.category,
        createdBy: place.createdBy,
        createdAt: place.createdAt.toISOString(),
        updatedAt: place.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Get place error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/places", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, latitude, longitude, address, category } = req.body;
      
      if (!name || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Name, latitude, and longitude are required" } });
      }
      
      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Latitude must be between -90 and 90" } });
      }
      
      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Longitude must be between -180 and 180" } });
      }
      
      const place = await storage.createPlace({
        familyId: req.auth!.familyId,
        name,
        description: description || null,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        address: address || null,
        category: category || "other",
        createdBy: req.auth!.userId,
      });
      
      res.status(201).json({
        id: place.id,
        familyId: place.familyId,
        name: place.name,
        description: place.description,
        latitude: parseFloat(place.latitude),
        longitude: parseFloat(place.longitude),
        address: place.address,
        category: place.category,
        createdBy: place.createdBy,
        createdAt: place.createdAt.toISOString(),
        updatedAt: place.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Create place error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/places/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, latitude, longitude, address, category } = req.body;
      
      const existing = await storage.getPlace(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Place not found" } });
      }
      
      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Latitude must be between -90 and 90" } });
      }
      
      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Longitude must be between -180 and 180" } });
      }
      
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (latitude !== undefined) updateData.latitude = latitude.toString();
      if (longitude !== undefined) updateData.longitude = longitude.toString();
      if (address !== undefined) updateData.address = address;
      if (category !== undefined) updateData.category = category;
      
      const place = await storage.updatePlace(id, req.auth!.familyId, updateData);
      
      res.json({
        id: place!.id,
        familyId: place!.familyId,
        name: place!.name,
        description: place!.description,
        latitude: parseFloat(place!.latitude),
        longitude: parseFloat(place!.longitude),
        address: place!.address,
        category: place!.category,
        createdBy: place!.createdBy,
        createdAt: place!.createdAt.toISOString(),
        updatedAt: place!.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update place error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/places/:id", authMiddleware, requireRoles("admin", "member"), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const existing = await storage.getPlace(id, req.auth!.familyId);
      if (!existing) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Place not found" } });
      }
      
      await storage.deletePlace(id, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete place error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/notifications", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const unreadOnly = req.query.unreadOnly === "true";
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const notificationsList = await storage.getNotifications(
        req.auth!.userId,
        req.auth!.familyId,
        { unreadOnly, limit }
      );
      
      res.json(notificationsList.map(n => ({
        id: n.id,
        type: n.type,
        category: n.category,
        titleKey: n.titleKey,
        titleParams: n.titleParams ? JSON.parse(n.titleParams) : null,
        messageKey: n.messageKey,
        messageParams: n.messageParams ? JSON.parse(n.messageParams) : null,
        relatedEntityType: n.relatedEntityType,
        relatedEntityId: n.relatedEntityId,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })));
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/notifications/count", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.auth!.userId, req.auth!.familyId);
      res.json({ count });
    } catch (error) {
      console.error("Get notification count error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/notifications/:id/read", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationRead(id, req.auth!.userId, req.auth!.familyId);
      if (!notification) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Notification not found" } });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/notifications/read-all", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.markAllNotificationsRead(req.auth!.userId, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/notifications/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteNotification(id, req.auth!.userId, req.auth!.familyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.get("/api/notification-settings", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      let settings = await storage.getNotificationSettings(req.auth!.userId);
      if (!settings) {
        settings = await storage.upsertNotificationSettings(req.auth!.userId, {});
      }
      res.json({
        enabled: settings.enabled,
        calendarEnabled: settings.calendarEnabled,
        tasksEnabled: settings.tasksEnabled,
        shoppingEnabled: settings.shoppingEnabled,
        budgetEnabled: settings.budgetEnabled,
        aiEnabled: settings.aiEnabled,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
        eventReminderMinutes: settings.eventReminderMinutes,
      });
    } catch (error) {
      console.error("Get notification settings error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.put("/api/notification-settings", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { enabled, calendarEnabled, tasksEnabled, shoppingEnabled, budgetEnabled, aiEnabled, quietHoursStart, quietHoursEnd, eventReminderMinutes } = req.body;
      
      const updates: Record<string, unknown> = {};
      if (enabled !== undefined) updates.enabled = enabled;
      if (calendarEnabled !== undefined) updates.calendarEnabled = calendarEnabled;
      if (tasksEnabled !== undefined) updates.tasksEnabled = tasksEnabled;
      if (shoppingEnabled !== undefined) updates.shoppingEnabled = shoppingEnabled;
      if (budgetEnabled !== undefined) updates.budgetEnabled = budgetEnabled;
      if (aiEnabled !== undefined) updates.aiEnabled = aiEnabled;
      if (quietHoursStart !== undefined) updates.quietHoursStart = quietHoursStart;
      if (quietHoursEnd !== undefined) updates.quietHoursEnd = quietHoursEnd;
      if (eventReminderMinutes !== undefined) updates.eventReminderMinutes = eventReminderMinutes;
      
      const settings = await storage.upsertNotificationSettings(req.auth!.userId, updates);
      res.json({
        enabled: settings.enabled,
        calendarEnabled: settings.calendarEnabled,
        tasksEnabled: settings.tasksEnabled,
        shoppingEnabled: settings.shoppingEnabled,
        budgetEnabled: settings.budgetEnabled,
        aiEnabled: settings.aiEnabled,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
        eventReminderMinutes: settings.eventReminderMinutes,
      });
    } catch (error) {
      console.error("Update notification settings error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.post("/api/push-token", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { token, platform } = req.body;
      if (!token || !platform) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Token and platform required" } });
      }
      await storage.upsertPushToken(req.auth!.userId, token, platform);
      res.json({ success: true });
    } catch (error) {
      console.error("Register push token error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  app.delete("/api/push-token", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deletePushToken(req.auth!.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete push token error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  });

  const { registerAssistantRoutes } = await import("./assistant");
  registerAssistantRoutes(app, authMiddleware);

  const { registerLoggingRoutes } = await import("./logging-routes");
  registerLoggingRoutes(app, authMiddleware);

  const { registerAdminRoutes } = await import("./admin-routes");
  registerAdminRoutes(app);

  const paymentRoutes = (await import("./payment-routes")).default;
  app.use("/api/payments", paymentRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
