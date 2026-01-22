/**
 * E2E Tests for Authentication Flow
 * Tests login, registration, and logout flows
 */

import { device, element, by, expect, waitFor } from "detox";

describe("Authentication Flow", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe("Login Screen", () => {
    it("should show login screen on first launch", async () => {
      await expect(element(by.id("login-screen"))).toBeVisible();
    });

    it("should display email input field", async () => {
      await expect(element(by.id("email-input"))).toBeVisible();
    });

    it("should display password input field", async () => {
      await expect(element(by.id("password-input"))).toBeVisible();
    });

    it("should display login button", async () => {
      await expect(element(by.id("login-button"))).toBeVisible();
    });

    it("should display register link", async () => {
      await expect(element(by.id("register-link"))).toBeVisible();
    });

    it("should display forgot password link", async () => {
      await expect(element(by.id("forgot-password-link"))).toBeVisible();
    });
  });

  describe("Login Validation", () => {
    it("should show error for empty email", async () => {
      await element(by.id("password-input")).typeText("Password123!");
      await element(by.id("login-button")).tap();

      await waitFor(element(by.text(/email/i)))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should show error for empty password", async () => {
      await element(by.id("email-input")).typeText("test@example.com");
      await element(by.id("login-button")).tap();

      await waitFor(element(by.text(/password/i)))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should show error for invalid email format", async () => {
      await element(by.id("email-input")).typeText("invalid-email");
      await element(by.id("password-input")).typeText("Password123!");
      await element(by.id("login-button")).tap();

      await waitFor(element(by.text(/email.*valid/i)))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should show error for incorrect credentials", async () => {
      await element(by.id("email-input")).typeText("wrong@example.com");
      await element(by.id("password-input")).typeText("WrongPassword123!");
      await element(by.id("login-button")).tap();

      await waitFor(element(by.text(/invalid|incorrect|wrong/i)))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe("Successful Login", () => {
    it("should navigate to home screen after successful login", async () => {
      // Use test account credentials
      await element(by.id("email-input")).typeText("test@kinova.com");
      await element(by.id("password-input")).typeText("TestPassword123!");
      await element(by.id("login-button")).tap();

      // Wait for home screen to appear
      await waitFor(element(by.id("home-screen")))
        .toBeVisible()
        .withTimeout(10000);

      await expect(element(by.id("home-screen"))).toBeVisible();
    });

    it("should display bottom tab navigation after login", async () => {
      // Assuming already logged in from previous test
      await expect(element(by.id("tab-bar"))).toBeVisible();
    });

    it("should show user greeting on home screen", async () => {
      // Should show some form of greeting or user name
      await expect(element(by.id("home-greeting"))).toBeVisible();
    });
  });

  describe("Registration Flow", () => {
    beforeEach(async () => {
      await device.reloadReactNative();
    });

    it("should navigate to register screen", async () => {
      await element(by.id("register-link")).tap();

      await waitFor(element(by.id("register-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should display registration form fields", async () => {
      await element(by.id("register-link")).tap();

      await expect(element(by.id("email-input"))).toBeVisible();
      await expect(element(by.id("password-input"))).toBeVisible();
      await expect(element(by.id("display-name-input"))).toBeVisible();
      await expect(element(by.id("family-name-input"))).toBeVisible();
      await expect(element(by.id("terms-checkbox"))).toBeVisible();
    });

    it("should require terms acceptance", async () => {
      await element(by.id("register-link")).tap();

      await element(by.id("email-input")).typeText("newuser@example.com");
      await element(by.id("password-input")).typeText("NewPassword123!");
      await element(by.id("display-name-input")).typeText("New User");
      // Don't check terms checkbox
      await element(by.id("register-button")).tap();

      await waitFor(element(by.text(/terms|accept/i)))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should show password strength indicator", async () => {
      await element(by.id("register-link")).tap();

      await element(by.id("password-input")).typeText("weak");
      await expect(element(by.id("password-strength-weak"))).toBeVisible();

      await element(by.id("password-input")).clearText();
      await element(by.id("password-input")).typeText("StrongPass123!");
      await expect(element(by.id("password-strength-strong"))).toBeVisible();
    });
  });

  describe("Forgot Password Flow", () => {
    beforeEach(async () => {
      await device.reloadReactNative();
    });

    it("should navigate to forgot password screen", async () => {
      await element(by.id("forgot-password-link")).tap();

      await waitFor(element(by.id("forgot-password-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should send reset email for valid email", async () => {
      await element(by.id("forgot-password-link")).tap();
      await element(by.id("email-input")).typeText("test@example.com");
      await element(by.id("send-reset-button")).tap();

      await waitFor(element(by.text(/sent|email|check/i)))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe("Logout Flow", () => {
    beforeEach(async () => {
      // Login first
      await device.reloadReactNative();
      await element(by.id("email-input")).typeText("test@kinova.com");
      await element(by.id("password-input")).typeText("TestPassword123!");
      await element(by.id("login-button")).tap();
      await waitFor(element(by.id("home-screen")))
        .toBeVisible()
        .withTimeout(10000);
    });

    it("should navigate to profile/settings", async () => {
      await element(by.id("tab-profile")).tap();

      await waitFor(element(by.id("profile-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should show logout button", async () => {
      await element(by.id("tab-profile")).tap();

      await expect(element(by.id("logout-button"))).toBeVisible();
    });

    it("should logout and return to login screen", async () => {
      await element(by.id("tab-profile")).tap();
      await element(by.id("logout-button")).tap();

      // Confirm logout if there's a dialog
      try {
        await element(by.text(/confirm|yes|logout/i)).tap();
      } catch {
        // No confirmation dialog
      }

      await waitFor(element(by.id("login-screen")))
        .toBeVisible()
        .withTimeout(5000);
    });
  });
});
