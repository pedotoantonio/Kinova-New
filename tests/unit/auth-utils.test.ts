/**
 * Unit Tests for Auth Utilities
 * Tests password hashing, validation, and token generation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  validatePassword,
  validateEmail,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateShortCode,
  PASSWORD_MIN_LENGTH,
} from "@server/auth-utils";

describe("Auth Utils", () => {
  describe("validatePassword", () => {
    it("should reject password shorter than minimum length", () => {
      const result = validatePassword("Short1!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("min_length");
    });

    it("should reject password without uppercase letter", () => {
      const result = validatePassword("lowercase123!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("uppercase");
    });

    it("should reject password without lowercase letter", () => {
      const result = validatePassword("UPPERCASE123!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("lowercase");
    });

    it("should reject password without number", () => {
      const result = validatePassword("NoNumbers!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("number");
    });

    it("should reject password without special character", () => {
      const result = validatePassword("NoSpecial123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("symbol");
    });

    it("should accept valid password with all requirements", () => {
      const result = validatePassword("ValidPass123!");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return weak strength for passwords with few requirements", () => {
      const result = validatePassword("abc");
      expect(result.strength).toBe("weak");
      expect(result.score).toBeLessThanOrEqual(2);
    });

    it("should return fair strength for moderate passwords", () => {
      const result = validatePassword("Password1");
      expect(result.strength).toBe("fair");
    });

    it("should return good strength for better passwords", () => {
      const result = validatePassword("Password123!");
      expect(result.strength).toBe("good");
    });

    it("should return strong strength for excellent passwords", () => {
      const result = validatePassword("VeryStrongPassword123!@#");
      expect(result.strength).toBe("strong");
      expect(result.score).toBeGreaterThanOrEqual(6);
    });

    it("should give bonus score for longer passwords", () => {
      const short = validatePassword("Pass123!");
      const long = validatePassword("LongerPassword123!");
      expect(long.score).toBeGreaterThan(short.score);
    });
  });

  describe("validateEmail", () => {
    it("should accept valid email addresses", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.org",
        "user+tag@example.co.uk",
        "firstname.lastname@company.io",
      ];

      for (const email of validEmails) {
        expect(validateEmail(email)).toBe(true);
      }
    });

    it("should reject invalid email addresses", () => {
      const invalidEmails = [
        "not-an-email",
        "@missing-local.com",
        "missing-at.com",
        "missing@domain",
        "spaces in@email.com",
        "",
        "double@@at.com",
      ];

      for (const email of invalidEmails) {
        expect(validateEmail(email)).toBe(false);
      }
    });
  });

  describe("hashPassword", () => {
    it("should hash password with salt", () => {
      const password = "SecurePassword123!";
      const hash = hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toContain(":");
    });

    it("should generate different hashes for the same password", () => {
      const password = "SecurePassword123!";
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should produce hash in correct format (salt:hash)", () => {
      const hash = hashPassword("test");
      const parts = hash.split(":");

      expect(parts).toHaveLength(2);
      expect(parts[0]).toHaveLength(32); // 16 bytes hex = 32 chars
      expect(parts[1]).toHaveLength(128); // 64 bytes hex = 128 chars
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", () => {
      const password = "SecurePassword123!";
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
    });

    it("should reject incorrect password", () => {
      const password = "SecurePassword123!";
      const hash = hashPassword(password);

      expect(verifyPassword("WrongPassword123!", hash)).toBe(false);
    });

    it("should reject password with case difference", () => {
      const password = "SecurePassword123!";
      const hash = hashPassword(password);

      expect(verifyPassword("securepassword123!", hash)).toBe(false);
    });

    it("should verify password against multiple hashes from same password", () => {
      const password = "TestPassword123!";
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(verifyPassword(password, hash1)).toBe(true);
      expect(verifyPassword(password, hash2)).toBe(true);
    });

    it("should handle legacy base64 passwords", () => {
      const password = "legacypassword";
      const legacyHash = Buffer.from(password).toString("base64");

      expect(verifyPassword(password, legacyHash)).toBe(true);
    });
  });

  describe("generateSecureToken", () => {
    it("should generate token of correct length", () => {
      const token = generateSecureToken();
      // 32 bytes in base64url = ~43 characters
      expect(token.length).toBeGreaterThanOrEqual(40);
    });

    it("should generate unique tokens", () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      expect(tokens.size).toBe(100);
    });

    it("should generate URL-safe tokens", () => {
      const token = generateSecureToken();
      // base64url should not contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });
  });

  describe("generateShortCode", () => {
    it("should generate 8 character code", () => {
      const code = generateShortCode();
      expect(code).toHaveLength(8);
    });

    it("should generate uppercase hex code", () => {
      const code = generateShortCode();
      expect(code).toMatch(/^[0-9A-F]{8}$/);
    });

    it("should generate unique codes", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateShortCode());
      }
      expect(codes.size).toBe(100);
    });
  });
});
