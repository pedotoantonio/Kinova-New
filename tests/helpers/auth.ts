/**
 * Authentication Test Helpers
 * Utilities for testing authentication flows
 */

import { hashPassword, generateSecureToken } from "@server/auth-utils";

export interface TestUser {
  id: string;
  email: string;
  username: string;
  password: string;
  hashedPassword: string;
  familyId: string;
  role: "admin" | "member" | "child";
}

export interface TestTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Creates a test user object with hashed password
 */
export function createTestUserData(overrides: Partial<TestUser> = {}): TestUser {
  const password = overrides.password || "TestPassword123!";
  const id = overrides.id || `test-user-${Date.now()}`;

  return {
    id,
    email: overrides.email || `test-${id}@example.com`,
    username: overrides.username || `testuser-${id}`,
    password,
    hashedPassword: hashPassword(password),
    familyId: overrides.familyId || `test-family-${Date.now()}`,
    role: overrides.role || "member",
  };
}

/**
 * Generates mock JWT tokens for testing
 */
export function createMockTokens(): TestTokens {
  return {
    accessToken: generateSecureToken(),
    refreshToken: generateSecureToken(),
  };
}

/**
 * Creates authorization header for API requests
 */
export function createAuthHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Test credentials for common scenarios
 */
export const testCredentials = {
  validUser: {
    email: "valid@test.com",
    password: "ValidPassword123!",
  },
  weakPassword: {
    email: "weak@test.com",
    password: "123",
  },
  invalidEmail: {
    email: "not-an-email",
    password: "ValidPassword123!",
  },
  adminUser: {
    email: "admin@test.com",
    password: "AdminPassword123!",
    role: "admin" as const,
  },
  childUser: {
    email: "child@test.com",
    password: "ChildPassword123!",
    role: "child" as const,
  },
};
