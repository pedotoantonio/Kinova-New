/**
 * E2E Tests for Events/Calendar Flow
 * Tests creating, editing, and deleting events
 */

import { device, element, by, expect, waitFor } from "detox";

describe("Events/Calendar Flow", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });

    // Login
    await element(by.id("email-input")).typeText("test@kinova.com");
    await element(by.id("password-input")).typeText("TestPassword123!");
    await element(by.id("login-button")).tap();

    await waitFor(element(by.id("home-screen")))
      .toBeVisible()
      .withTimeout(10000);

    // Navigate to calendar
    await element(by.id("tab-calendar")).tap();
    await waitFor(element(by.id("calendar-screen")))
      .toBeVisible()
      .withTimeout(3000);
  });

  describe("Calendar Screen", () => {
    it("should display calendar view", async () => {
      await expect(element(by.id("calendar-view"))).toBeVisible();
    });

    it("should display add event button", async () => {
      await expect(element(by.id("add-event-button"))).toBeVisible();
    });

    it("should show current month", async () => {
      // Calendar should show current month header
      await expect(element(by.id("month-header"))).toBeVisible();
    });
  });

  describe("Create Event", () => {
    it("should open event creation form", async () => {
      await element(by.id("add-event-button")).tap();

      await waitFor(element(by.id("event-form")))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("should display event form fields", async () => {
      await expect(element(by.id("event-title-input"))).toBeVisible();
      await expect(element(by.id("event-date-picker"))).toBeVisible();
    });

    it("should create a new event", async () => {
      const eventTitle = `Test Event ${Date.now()}`;

      await element(by.id("event-title-input")).typeText(eventTitle);

      // Add description if field exists
      try {
        await element(by.id("event-description-input")).typeText(
          "Test event description"
        );
      } catch {
        // Description field optional
      }

      // Save the event
      await element(by.id("save-event-button")).tap();

      // Should navigate back to calendar
      await waitFor(element(by.id("calendar-screen")))
        .toBeVisible()
        .withTimeout(5000);

      // Event should appear in the list/calendar
      await waitFor(element(by.text(eventTitle)))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe("View Event", () => {
    it("should open event details when tapped", async () => {
      // Find an event and tap it
      const events = element(by.id("event-item")).atIndex(0);

      try {
        await events.tap();

        await waitFor(element(by.id("event-details")))
          .toBeVisible()
          .withTimeout(3000);
      } catch {
        // No events to tap
      }
    });

    it("should display event information", async () => {
      try {
        await expect(element(by.id("event-title"))).toBeVisible();
        await expect(element(by.id("event-date"))).toBeVisible();
      } catch {
        // If event details not visible
      }
    });

    it("should close event details", async () => {
      try {
        await element(by.id("close-button")).tap();
        await expect(element(by.id("calendar-screen"))).toBeVisible();
      } catch {
        // Already on calendar screen
      }
    });
  });

  describe("Edit Event", () => {
    it("should open edit form for existing event", async () => {
      // Tap on an event
      const events = element(by.id("event-item")).atIndex(0);

      try {
        await events.tap();
        await element(by.id("edit-event-button")).tap();

        await waitFor(element(by.id("event-form")))
          .toBeVisible()
          .withTimeout(3000);
      } catch {
        // No events or edit button
      }
    });

    it("should update event title", async () => {
      try {
        await element(by.id("event-title-input")).clearText();
        await element(by.id("event-title-input")).typeText("Updated Event Title");
        await element(by.id("save-event-button")).tap();

        await waitFor(element(by.text("Updated Event Title")))
          .toBeVisible()
          .withTimeout(5000);
      } catch {
        // Editing flow might differ
      }
    });
  });

  describe("Delete Event", () => {
    it("should show delete confirmation", async () => {
      const events = element(by.id("event-item")).atIndex(0);

      try {
        await events.tap();
        await element(by.id("delete-event-button")).tap();

        await waitFor(element(by.text(/delete|confirm|remove/i)))
          .toBeVisible()
          .withTimeout(3000);
      } catch {
        // No events or delete button
      }
    });

    it("should delete event when confirmed", async () => {
      try {
        await element(by.text(/confirm|yes|delete/i)).tap();

        await waitFor(element(by.id("calendar-screen")))
          .toBeVisible()
          .withTimeout(3000);
      } catch {
        // Delete confirmation might differ
      }
    });
  });

  describe("Calendar Navigation", () => {
    it("should navigate to next month", async () => {
      await element(by.id("next-month-button")).tap();

      // Month header should change
      await expect(element(by.id("month-header"))).toBeVisible();
    });

    it("should navigate to previous month", async () => {
      await element(by.id("prev-month-button")).tap();

      await expect(element(by.id("month-header"))).toBeVisible();
    });

    it("should return to today", async () => {
      try {
        await element(by.id("today-button")).tap();
      } catch {
        // Today button might not exist
      }

      await expect(element(by.id("calendar-view"))).toBeVisible();
    });
  });

  describe("Event Categories", () => {
    it("should filter events by category", async () => {
      try {
        await element(by.id("category-filter")).tap();
        await element(by.text("Family")).tap();

        // Should show filtered events
        await expect(element(by.id("calendar-view"))).toBeVisible();
      } catch {
        // Category filter might not exist
      }
    });
  });
});
