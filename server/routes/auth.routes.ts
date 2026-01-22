/**
 * Authentication Routes
 * Handles registration, login, token refresh, password reset, and email verification
 */

import { Router, type Request, type Response } from "express";
import { randomBytes } from "crypto";
import { storage } from "../storage";
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
} from "../auth-utils";
import { extractPermissions } from "../permissions";
import { authMiddleware, type AuthRequest, asyncHandler } from "./middleware";
import { issueTokens, apiError, formatUserResponse } from "./utils";

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user and create their family
 */
router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, displayName, familyName, acceptTerms } = req.body;

    if (!email || !password) {
      return res.status(400).json(apiError("MISSING_FIELDS", "Email and password required"));
    }

    if (!acceptTerms) {
      return res.status(400).json(apiError("TERMS_NOT_ACCEPTED", "You must accept the terms and privacy policy"));
    }

    if (!validateEmail(email)) {
      return res.status(400).json(apiError("INVALID_EMAIL", "Invalid email format"));
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: {
          code: "WEAK_PASSWORD",
          message: "Password does not meet requirements",
          details: passwordValidation.errors,
          strength: passwordValidation.strength,
        },
      });
    }

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json(apiError("EMAIL_EXISTS", "An account with this email already exists"));
    }

    const emailVerificationToken = generateSecureToken();
    const emailVerificationExpires = new Date(
      Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
    );

    const username = email.split("@")[0] + "_" + randomBytes(4).toString("hex");
    const family = await storage.createFamily({
      name: familyName || `${displayName || email.split("@")[0]}'s Family`,
    });

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

    res.status(201).json({
      ...tokenData,
      user: {
        ...formatUserResponse(user),
        permissions: extractPermissions(user),
      },
      requiresEmailVerification: true,
    });
  })
);

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || null;

    if (!email || !password) {
      return res.status(400).json(apiError("MISSING_FIELDS", "Email and password required"));
    }

    // Check rate limiting
    const recentAttempts = await storage.getRecentLoginAttempts(
      email,
      RATE_LIMIT_WINDOW_MINUTES
    );
    if (recentAttempts.length >= RATE_LIMIT_MAX_ATTEMPTS) {
      const oldestAttempt = recentAttempts[recentAttempts.length - 1];
      const resetTime = new Date(
        oldestAttempt.createdAt.getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
      );
      const minutesLeft = Math.ceil((resetTime.getTime() - Date.now()) / 60000);

      return res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many login attempts. Please try again later.",
          retryAfterMinutes: minutesLeft,
        },
      });
    }

    const user = await storage.getUserByEmail(email);
    if (!user || !verifyPassword(password, user.password)) {
      await storage.recordLoginAttempt(email, ipAddress, false);
      return res.status(401).json(apiError("INVALID_CREDENTIALS", "Invalid credentials"));
    }

    await storage.recordLoginAttempt(email, ipAddress, true);

    const tokenData = await issueTokens(user.id, user.familyId, user.role);

    res.json({
      ...tokenData,
      user: {
        ...formatUserResponse(user),
        permissions: extractPermissions(user),
      },
    });
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  "/refresh",
  asyncHandler(async (req: Request, res: Response) => {
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
        ...formatUserResponse(user),
        permissions: extractPermissions(user),
      },
    });
  })
);

/**
 * POST /api/auth/logout
 * Logout current session
 */
router.post(
  "/logout",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await storage.deleteSession(req.auth!.tokenId);
    res.json({ success: true, message: "Logged out successfully" });
  })
);

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
router.post(
  "/logout-all",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await storage.deleteSessionsByUser(req.auth!.userId);
    res.json({ success: true, message: "Logged out from all devices" });
  })
);

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post(
  "/verify-email",
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(apiError("MISSING_TOKEN", "Verification token required"));
    }

    const user = await storage.getUserByEmailVerificationToken(token);
    if (!user) {
      return res.status(400).json(apiError("INVALID_TOKEN", "Invalid or expired verification token"));
    }

    if (
      user.emailVerificationExpires &&
      new Date(user.emailVerificationExpires) < new Date()
    ) {
      return res.status(400).json(apiError("TOKEN_EXPIRED", "Verification token has expired"));
    }

    await storage.updateUser(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });

    res.json({ success: true, message: "Email verified successfully" });
  })
);

/**
 * POST /api/auth/resend-verification
 * Resend email verification token
 */
router.post(
  "/resend-verification",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await storage.getUser(req.auth!.userId);
    if (!user) {
      return res.status(404).json(apiError("USER_NOT_FOUND", "User not found"));
    }

    if (user.emailVerified) {
      return res.status(400).json(apiError("ALREADY_VERIFIED", "Email is already verified"));
    }

    const emailVerificationToken = generateSecureToken();
    const emailVerificationExpires = new Date(
      Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
    );

    await storage.updateUser(user.id, {
      emailVerificationToken,
      emailVerificationExpires,
    });

    res.json({ success: true, message: "Verification email sent" });
  })
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post(
  "/forgot-password",
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(apiError("MISSING_EMAIL", "Email required"));
    }

    const user = await storage.getUserByEmail(email);

    if (user) {
      const passwordResetToken = generateSecureToken();
      const passwordResetExpires = new Date(
        Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000
      );

      await storage.updateUser(user.id, {
        passwordResetToken,
        passwordResetExpires,
      });

      // In production: send password reset email
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent",
    });
  })
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  "/reset-password",
  asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json(apiError("MISSING_FIELDS", "Token and new password required"));
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: {
          code: "WEAK_PASSWORD",
          message: "Password does not meet requirements",
          details: passwordValidation.errors,
          strength: passwordValidation.strength,
        },
      });
    }

    const user = await storage.getUserByPasswordResetToken(token);
    if (!user) {
      return res.status(400).json(apiError("INVALID_TOKEN", "Invalid or expired reset token"));
    }

    if (
      user.passwordResetExpires &&
      new Date(user.passwordResetExpires) < new Date()
    ) {
      return res.status(400).json(apiError("TOKEN_EXPIRED", "Reset token has expired"));
    }

    // Invalidate all existing sessions
    await storage.deleteSessionsByUser(user.id);

    await storage.updateUser(user.id, {
      password: hashPassword(password),
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    res.json({ success: true, message: "Password reset successfully" });
  })
);

/**
 * GET /api/auth/password-policy
 * Get password requirements
 */
router.get("/password-policy", (_req: Request, res: Response) => {
  res.json({
    minLength: 8,
    requirements: ["uppercase", "lowercase", "number", "symbol"],
  });
});

/**
 * POST /api/auth/validate-password
 * Validate password strength
 */
router.post("/validate-password", (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json(apiError("MISSING_PASSWORD", "Password required"));
  }
  const result = validatePassword(password);
  res.json(result);
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await storage.getUser(req.auth!.userId);
    if (!user) {
      return res.status(404).json(apiError("USER_NOT_FOUND", "User not found"));
    }

    res.json({
      ...formatUserResponse(user),
      permissions: extractPermissions(user),
    });
  })
);

export default router;
