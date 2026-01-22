/**
 * Unit Tests for Schema Validation
 * Tests Zod schemas from shared/schema.ts
 */

import { describe, it, expect } from "vitest";
import {
  insertUserSchema,
  insertFamilySchema,
} from "@shared/schema";

describe("Schema Validation", () => {
  describe("insertUserSchema", () => {
    const validUser = {
      email: "test@example.com",
      username: "testuser",
      password: "SecurePass123!",
      familyId: "family-123",
    };

    it("should validate a correct user object", () => {
      const result = insertUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it("should accept optional fields", () => {
      const userWithOptionals = {
        ...validUser,
        firstName: "John",
        lastName: "Doe",
        displayName: "Johnny",
        avatarUrl: "https://example.com/avatar.jpg",
      };
      const result = insertUserSchema.safeParse(userWithOptionals);
      expect(result.success).toBe(true);
    });

    it("should accept valid role values", () => {
      const roles = ["admin", "member", "child"];
      for (const role of roles) {
        const result = insertUserSchema.safeParse({ ...validUser, role });
        expect(result.success).toBe(true);
      }
    });

    it("should accept permission fields", () => {
      const userWithPermissions = {
        ...validUser,
        canViewCalendar: true,
        canViewTasks: false,
        canViewShopping: true,
        canViewBudget: false,
        canViewPlaces: true,
        canModifyItems: false,
      };
      const result = insertUserSchema.safeParse(userWithPermissions);
      expect(result.success).toBe(true);
    });

    it("should accept email verification fields", () => {
      const userWithVerification = {
        ...validUser,
        emailVerified: false,
        emailVerificationToken: "some-token",
        emailVerificationExpires: new Date(),
      };
      const result = insertUserSchema.safeParse(userWithVerification);
      expect(result.success).toBe(true);
    });
  });

  describe("insertFamilySchema", () => {
    it("should validate a correct family object", () => {
      const validFamily = {
        name: "Test Family",
      };
      const result = insertFamilySchema.safeParse(validFamily);
      expect(result.success).toBe(true);
    });

    it("should accept optional city and coordinates", () => {
      const familyWithLocation = {
        name: "Test Family",
        city: "Milan",
        cityLat: "45.4642",
        cityLon: "9.1900",
      };
      const result = insertFamilySchema.safeParse(familyWithLocation);
      expect(result.success).toBe(true);
    });

    it("should accept valid plan types", () => {
      const planTypes = ["trial", "donor", "premium"];
      for (const planType of planTypes) {
        const result = insertFamilySchema.safeParse({
          name: "Test Family",
          planType,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should accept isActive field", () => {
      const familyWithActive = {
        name: "Test Family",
        isActive: true,
      };
      const result = insertFamilySchema.safeParse(familyWithActive);
      expect(result.success).toBe(true);
    });

    it("should accept trial date fields", () => {
      const familyWithTrial = {
        name: "Test Family",
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      const result = insertFamilySchema.safeParse(familyWithTrial);
      expect(result.success).toBe(true);
    });
  });

  describe("Email Format Validation", () => {
    it("should accept standard email formats", () => {
      const validEmails = [
        "user@example.com",
        "user.name@example.com",
        "user+tag@example.com",
        "user@subdomain.example.com",
      ];

      for (const email of validEmails) {
        const result = insertUserSchema.safeParse({
          email,
          username: "testuser",
          password: "Password123!",
          familyId: "family-id",
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Username Validation", () => {
    it("should accept various username formats", () => {
      const usernames = ["user123", "test_user", "JohnDoe", "a"];

      for (const username of usernames) {
        const result = insertUserSchema.safeParse({
          email: "test@example.com",
          username,
          password: "Password123!",
          familyId: "family-id",
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Family Name Validation", () => {
    it("should accept various family name formats", () => {
      const names = ["Smith Family", "The Johnsons", "Casa Rossi", "家族"];

      for (const name of names) {
        const result = insertFamilySchema.safeParse({ name });
        expect(result.success).toBe(true);
      }
    });
  });
});
