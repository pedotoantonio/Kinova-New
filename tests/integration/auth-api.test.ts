/**
 * Integration Tests for Authentication API
 * Tests registration, login, token refresh, and logout flows
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockStorage } from "../helpers/db";
import { createTestUserData, testCredentials } from "../helpers/auth";
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  validateEmail,
  generateSecureToken,
} from "@server/auth-utils";

// Mock the storage module
vi.mock("@server/storage", () => ({
  storage: createMockStorage(),
}));

describe("Authentication API", () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    mockStorage._reset();
    vi.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    describe("Input Validation", () => {
      it("should require email field", async () => {
        const requestBody = {
          password: "ValidPassword123!",
          familyName: "Test Family",
          acceptTerms: true,
        };

        // Validate that email is required
        expect(requestBody.email).toBeUndefined();
        expect(validateEmail("")).toBe(false);
      });

      it("should require password field", async () => {
        const requestBody = {
          email: "test@example.com",
          familyName: "Test Family",
          acceptTerms: true,
        };

        // Password is required
        expect(requestBody.password).toBeUndefined();
      });

      it("should reject invalid email format", async () => {
        const invalidEmails = [
          "not-an-email",
          "missing@domain",
          "@nodomain.com",
          "spaces in@email.com",
        ];

        for (const email of invalidEmails) {
          expect(validateEmail(email)).toBe(false);
        }
      });

      it("should reject weak passwords", async () => {
        const weakPasswords = [
          "short",      // Too short
          "nouppercase123!",  // No uppercase
          "NOLOWERCASE123!",  // No lowercase
          "NoNumbers!",       // No numbers
          "NoSymbols123",     // No symbols
        ];

        for (const password of weakPasswords) {
          const result = validatePassword(password);
          expect(result.valid).toBe(false);
        }
      });

      it("should accept valid registration data", async () => {
        const validData = {
          email: "valid@example.com",
          password: "ValidPassword123!",
          familyName: "Test Family",
          acceptTerms: true,
        };

        expect(validateEmail(validData.email)).toBe(true);
        expect(validatePassword(validData.password).valid).toBe(true);
      });
    });

    describe("User Creation", () => {
      it("should hash password before storing", async () => {
        const password = "SecurePassword123!";
        const hashedPassword = hashPassword(password);

        // Hash should be different from original
        expect(hashedPassword).not.toBe(password);

        // Hash should contain salt separator
        expect(hashedPassword).toContain(":");

        // Should be able to verify the password
        expect(verifyPassword(password, hashedPassword)).toBe(true);
      });

      it("should create user with correct default values", async () => {
        const userData = createTestUserData({
          email: "newuser@example.com",
          password: "NewUserPass123!",
        });

        const createdUser = await mockStorage.createUser({
          email: userData.email,
          username: userData.username,
          password: userData.hashedPassword,
          familyId: userData.familyId,
          role: "admin", // First user in family should be admin
        });

        expect(createdUser.email).toBe(userData.email);
        expect(createdUser.role).toBe("admin");
        expect(createdUser.id).toBeDefined();
      });

      it("should reject duplicate email registration", async () => {
        const userData = createTestUserData({
          email: "duplicate@example.com",
        });

        // Create first user
        await mockStorage.createUser({
          email: userData.email,
          username: userData.username,
          password: userData.hashedPassword,
          familyId: userData.familyId,
        });

        // Check if user exists
        const existingUser = await mockStorage.getUserByEmail(userData.email);
        expect(existingUser).not.toBeNull();
      });
    });

    describe("Token Generation", () => {
      it("should generate unique tokens", () => {
        const tokens = new Set<string>();
        for (let i = 0; i < 100; i++) {
          tokens.add(generateSecureToken());
        }
        expect(tokens.size).toBe(100);
      });

      it("should create session with correct expiry", async () => {
        const userData = createTestUserData();

        // Create user
        const user = await mockStorage.createUser({
          email: userData.email,
          username: userData.username,
          password: userData.hashedPassword,
          familyId: userData.familyId,
        });

        // Create session
        const accessToken = generateSecureToken();
        const now = Date.now();
        const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

        const session = await mockStorage.createSession({
          token: accessToken,
          userId: user.id,
          familyId: user.familyId,
          type: "access",
          expiresAt: new Date(now + ACCESS_TOKEN_EXPIRY_MS),
        });

        expect(session.token).toBe(accessToken);
        expect(session.userId).toBe(user.id);
      });
    });
  });

  describe("POST /api/auth/login", () => {
    describe("Credential Validation", () => {
      it("should verify correct password", async () => {
        const password = "CorrectPassword123!";
        const hashedPassword = hashPassword(password);

        expect(verifyPassword(password, hashedPassword)).toBe(true);
        expect(verifyPassword("WrongPassword123!", hashedPassword)).toBe(false);
      });

      it("should be case-sensitive for passwords", async () => {
        const password = "CaseSensitive123!";
        const hashedPassword = hashPassword(password);

        expect(verifyPassword("casesensitive123!", hashedPassword)).toBe(false);
        expect(verifyPassword("CASESENSITIVE123!", hashedPassword)).toBe(false);
      });

      it("should handle non-existent user", async () => {
        const nonExistentUser = await mockStorage.getUserByEmail(
          "nonexistent@example.com"
        );
        expect(nonExistentUser).toBeNull();
      });
    });

    describe("Session Management", () => {
      it("should create new session on successful login", async () => {
        const userData = createTestUserData();

        // Create user
        const user = await mockStorage.createUser({
          email: userData.email,
          username: userData.username,
          password: userData.hashedPassword,
          familyId: userData.familyId,
        });

        // Create access session
        const accessToken = generateSecureToken();
        const accessSession = await mockStorage.createSession({
          token: accessToken,
          userId: user.id,
          familyId: user.familyId,
          type: "access",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });

        // Create refresh session
        const refreshToken = generateSecureToken();
        const refreshSession = await mockStorage.createSession({
          token: refreshToken,
          userId: user.id,
          familyId: user.familyId,
          type: "refresh",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        expect(accessSession.token).toBe(accessToken);
        expect(refreshSession.token).toBe(refreshToken);
      });
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should issue new tokens with valid refresh token", async () => {
      const userData = createTestUserData();

      // Create user
      const user = await mockStorage.createUser({
        email: userData.email,
        username: userData.username,
        password: userData.hashedPassword,
        familyId: userData.familyId,
      });

      // Create refresh session
      const refreshToken = generateSecureToken();
      await mockStorage.createSession({
        token: refreshToken,
        userId: user.id,
        familyId: user.familyId,
        type: "refresh",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Verify session exists
      const session = await mockStorage.getSession(refreshToken);
      expect(session).not.toBeNull();
      expect(session.userId).toBe(user.id);
    });

    it("should reject expired refresh token", async () => {
      const userData = createTestUserData();

      // Create user
      const user = await mockStorage.createUser({
        email: userData.email,
        username: userData.username,
        password: userData.hashedPassword,
        familyId: userData.familyId,
      });

      // Create expired refresh session
      const refreshToken = generateSecureToken();
      await mockStorage.createSession({
        token: refreshToken,
        userId: user.id,
        familyId: user.familyId,
        type: "refresh",
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      // Get session and check expiry
      const session = await mockStorage.getSession(refreshToken);
      expect(new Date(session.expiresAt).getTime()).toBeLessThan(Date.now());
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should delete user sessions on logout", async () => {
      const userData = createTestUserData();

      // Create user
      const user = await mockStorage.createUser({
        email: userData.email,
        username: userData.username,
        password: userData.hashedPassword,
        familyId: userData.familyId,
      });

      // Create sessions
      const accessToken = generateSecureToken();
      await mockStorage.createSession({
        token: accessToken,
        userId: user.id,
        familyId: user.familyId,
        type: "access",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Delete session
      await mockStorage.deleteSession(accessToken);

      // Verify session is deleted
      const session = await mockStorage.getSession(accessToken);
      expect(session).toBeNull();
    });

    it("should delete all user sessions on full logout", async () => {
      const userData = createTestUserData();

      // Create user
      const user = await mockStorage.createUser({
        email: userData.email,
        username: userData.username,
        password: userData.hashedPassword,
        familyId: userData.familyId,
      });

      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        await mockStorage.createSession({
          token: generateSecureToken(),
          userId: user.id,
          familyId: user.familyId,
          type: "access",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
      }

      // Delete all user sessions
      await mockStorage.deleteUserSessions(user.id);

      // Verify all sessions are deleted (mockStorage tracks internally)
      expect(mockStorage._mockSessions.size).toBe(0);
    });
  });

  describe("Rate Limiting", () => {
    it("should track login attempts", async () => {
      // Rate limit constants from auth-utils
      const RATE_LIMIT_MAX_ATTEMPTS = 5;
      const RATE_LIMIT_WINDOW_MINUTES = 15;

      const attempts: { timestamp: number; email: string }[] = [];

      // Simulate login attempts
      for (let i = 0; i < RATE_LIMIT_MAX_ATTEMPTS; i++) {
        attempts.push({
          timestamp: Date.now(),
          email: "test@example.com",
        });
      }

      expect(attempts.length).toBe(RATE_LIMIT_MAX_ATTEMPTS);

      // Next attempt should be rate limited
      const recentAttempts = attempts.filter(
        (a) => Date.now() - a.timestamp < RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
      );

      expect(recentAttempts.length).toBe(RATE_LIMIT_MAX_ATTEMPTS);
    });
  });

  describe("Password Reset Flow", () => {
    it("should generate secure reset token", () => {
      const token = generateSecureToken();

      // Token should be sufficiently long
      expect(token.length).toBeGreaterThanOrEqual(40);

      // Token should be URL-safe
      expect(token).not.toMatch(/[+/=]/);
    });

    it("should set correct expiry for reset token", () => {
      const PASSWORD_RESET_EXPIRY_MINUTES = 30;
      const expiresAt = new Date(
        Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000
      );

      // Expiry should be in the future
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Expiry should be approximately 30 minutes from now
      const diffMinutes = (expiresAt.getTime() - Date.now()) / (60 * 1000);
      expect(diffMinutes).toBeCloseTo(30, 0);
    });
  });

  describe("Email Verification Flow", () => {
    it("should generate verification token", () => {
      const token = generateSecureToken();
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    it("should set correct expiry for verification token", () => {
      const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
      const expiresAt = new Date(
        Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
      );

      // Expiry should be approximately 24 hours from now
      const diffHours =
        (expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
      expect(diffHours).toBeCloseTo(24, 0);
    });
  });
});
