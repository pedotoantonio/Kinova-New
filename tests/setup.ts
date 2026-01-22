/**
 * Vitest Global Setup File
 * Configures test environment before all tests run
 */

import { beforeAll, afterAll, afterEach, vi } from "vitest";

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/kinova_test";
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-key-for-testing-only";

// Mock console.log in tests to reduce noise (optional)
// vi.spyOn(console, 'log').mockImplementation(() => {});

// Global setup
beforeAll(async () => {
  // Any global setup before all tests
  console.log("\n🧪 Starting test suite...\n");
});

// Cleanup after each test
afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
});

// Global teardown
afterAll(async () => {
  // Any global cleanup after all tests
  console.log("\n✅ Test suite completed.\n");
});

// Extend expect matchers (if needed)
// You can add custom matchers here
