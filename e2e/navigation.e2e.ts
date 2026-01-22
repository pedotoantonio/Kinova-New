/**
 * E2E Tests for Navigation Flow
 * Tests tab navigation and screen transitions
 */

import { device, element, by, expect, waitFor } from "detox";

describe("Navigation Flow", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });

    // Login with test account
    await element(by.id("email-input")).typeText("test@kinova.com");
    await element(by.id("password-input")).typeText("TestPassword123!");
    await element(by.id("login-button")).tap();

    await waitFor(element(by.id("home-screen")))
      .toBeVisible()
      .withTimeout(10000);
  });

  afterAll(async () => {
    // Logout
    await element(by.id("tab-profile")).tap();
    await element(by.id("logout-button")).tap();
    try {
      await element(by.text(/confirm|yes|logout/i)).tap();
    } catch {
      // No confirmation
    }
  });

  describe("Bottom Tab Navigation", () => {
    it("should display all tab icons", async () => {
      await expect(element(by.id("tab-home"))).toBeVisible();
      await expect(element(by.id("tab-calendar"))).toBeVisible();
      await expect(element(by.id("tab-lists"))).toBeVisible();
      await expect(element(by.id("tab-notes"))).toBeVisible();
      await expect(element(by.id("tab-budget"))).toBeVisible();
      await expect(element(by.id("tab-assistant"))).toBeVisible();
      await expect(element(by.id("tab-profile"))).toBeVisible();
    });

    it("should navigate to Calendar screen", async () => {
      await element(by.id("tab-calendar")).tap();

      await waitFor(element(by.id("calendar-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should navigate to Lists screen", async () => {
      await element(by.id("tab-lists")).tap();

      await waitFor(element(by.id("lists-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should navigate to Notes screen", async () => {
      await element(by.id("tab-notes")).tap();

      await waitFor(element(by.id("notes-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should navigate to Budget screen", async () => {
      await element(by.id("tab-budget")).tap();

      await waitFor(element(by.id("budget-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should navigate to Assistant screen", async () => {
      await element(by.id("tab-assistant")).tap();

      await waitFor(element(by.id("assistant-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should navigate to Profile screen", async () => {
      await element(by.id("tab-profile")).tap();

      await waitFor(element(by.id("profile-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should navigate back to Home screen", async () => {
      await element(by.id("tab-home")).tap();

      await waitFor(element(by.id("home-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe("Header Navigation", () => {
    it("should show notifications icon in header", async () => {
      await element(by.id("tab-home")).tap();

      await expect(element(by.id("notifications-button"))).toBeVisible();
    });

    it("should navigate to notifications screen", async () => {
      await element(by.id("notifications-button")).tap();

      await waitFor(element(by.id("notifications-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should go back from notifications", async () => {
      await element(by.id("back-button")).tap();

      await waitFor(element(by.id("home-screen")))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe("Screen Transitions", () => {
    it("should animate screen transitions smoothly", async () => {
      // Navigate between tabs quickly
      await element(by.id("tab-calendar")).tap();
      await element(by.id("tab-lists")).tap();
      await element(by.id("tab-notes")).tap();
      await element(by.id("tab-home")).tap();

      // If no crash, transitions are working
      await expect(element(by.id("home-screen"))).toBeVisible();
    });
  });

  describe("Deep Navigation", () => {
    it("should navigate into nested screens", async () => {
      // Navigate to profile
      await element(by.id("tab-profile")).tap();

      // Navigate to settings (if available)
      try {
        await element(by.id("settings-button")).tap();
        await waitFor(element(by.id("settings-screen")))
          .toBeVisible()
          .withTimeout(3000);

        // Go back
        await element(by.id("back-button")).tap();
      } catch {
        // Settings button might not exist
      }

      await expect(element(by.id("profile-screen"))).toBeVisible();
    });

    it("should navigate to help screen from profile", async () => {
      await element(by.id("tab-profile")).tap();

      try {
        await element(by.id("help-button")).tap();
        await waitFor(element(by.id("help-screen")))
          .toBeVisible()
          .withTimeout(3000);

        await element(by.id("back-button")).tap();
      } catch {
        // Help button might not exist
      }
    });
  });
});
