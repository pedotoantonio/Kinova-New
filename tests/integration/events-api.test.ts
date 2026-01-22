/**
 * Integration Tests for Events API
 * Tests CRUD operations for calendar events
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockStorage } from "../helpers/db";
import { createTestUserData } from "../helpers/auth";
import { eventFixtures, generateUniqueFixture, createDateRange } from "../helpers/fixtures";

describe("Events API", () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  let testUser: any;
  let testFamily: any;

  beforeEach(async () => {
    mockStorage = createMockStorage();
    mockStorage._reset();

    // Create test family
    testFamily = await mockStorage.createFamily({
      name: "Test Family",
    });

    // Create test user
    const userData = createTestUserData({ familyId: testFamily.id });
    testUser = await mockStorage.createUser({
      email: userData.email,
      username: userData.username,
      password: userData.hashedPassword,
      familyId: testFamily.id,
      role: "admin",
    });
  });

  describe("POST /api/events", () => {
    it("should create a new event with required fields", async () => {
      const eventData = {
        ...eventFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      };

      const event = await mockStorage.createEvent(eventData);

      expect(event.id).toBeDefined();
      expect(event.title).toBe(eventFixtures.basic.title);
      expect(event.familyId).toBe(testFamily.id);
      expect(event.createdBy).toBe(testUser.id);
    });

    it("should create all-day event", async () => {
      const eventData = {
        ...eventFixtures.allDay,
        familyId: testFamily.id,
        createdBy: testUser.id,
      };

      const event = await mockStorage.createEvent(eventData);

      expect(event.allDay).toBe(true);
      expect(event.category).toBe("holiday");
    });

    it("should create event with place reference", async () => {
      // First create a place
      const place = {
        id: "place-123",
        familyId: testFamily.id,
        name: "Test Place",
        latitude: "45.4642",
        longitude: "9.1900",
        createdBy: testUser.id,
      };

      const eventData = {
        ...eventFixtures.withPlace,
        familyId: testFamily.id,
        createdBy: testUser.id,
        placeId: place.id,
      };

      const event = await mockStorage.createEvent(eventData);

      expect(event.placeId).toBe(place.id);
    });

    it("should create event with assigned user", async () => {
      const eventData = {
        ...eventFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
        assignedTo: testUser.id,
      };

      const event = await mockStorage.createEvent(eventData);

      expect(event.assignedTo).toBe(testUser.id);
    });
  });

  describe("GET /api/events", () => {
    it("should get events for date range", async () => {
      // Create events
      const event1 = await mockStorage.createEvent({
        ...eventFixtures.basic,
        title: "Event 1",
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const event2 = await mockStorage.createEvent({
        ...eventFixtures.basic,
        title: "Event 2",
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const { from, to } = createDateRange(7, 7);
      const events = await mockStorage.getEvents(testFamily.id, from, to);

      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter events by family", async () => {
      // Create event for test family
      await mockStorage.createEvent({
        ...eventFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      // Create another family
      const otherFamily = await mockStorage.createFamily({
        name: "Other Family",
      });

      // Get events for test family only
      const events = await mockStorage.getEvents(testFamily.id);

      // All events should belong to test family
      events.forEach((event: any) => {
        expect(event.familyId).toBe(testFamily.id);
      });
    });
  });

  describe("GET /api/events/:id", () => {
    it("should get event by id", async () => {
      const created = await mockStorage.createEvent({
        ...eventFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const event = await mockStorage.getEvent(created.id);

      expect(event).not.toBeNull();
      expect(event.id).toBe(created.id);
      expect(event.title).toBe(eventFixtures.basic.title);
    });

    it("should return null for non-existent event", async () => {
      const event = await mockStorage.getEvent("non-existent-id");
      expect(event).toBeNull();
    });
  });

  describe("PUT /api/events/:id", () => {
    it("should update event title", async () => {
      const created = await mockStorage.createEvent({
        ...eventFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const updated = await mockStorage.updateEvent(created.id, {
        title: "Updated Event Title",
      });

      expect(updated.title).toBe("Updated Event Title");
      expect(updated.id).toBe(created.id);
    });

    it("should update event dates", async () => {
      const created = await mockStorage.createEvent({
        ...eventFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const newStartDate = new Date(Date.now() + 86400000).toISOString();
      const newEndDate = new Date(Date.now() + 90000000).toISOString();

      const updated = await mockStorage.updateEvent(created.id, {
        startDate: newStartDate,
        endDate: newEndDate,
      });

      expect(updated.startDate).toBe(newStartDate);
      expect(updated.endDate).toBe(newEndDate);
    });

    it("should update event category", async () => {
      const created = await mockStorage.createEvent({
        ...eventFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const updated = await mockStorage.updateEvent(created.id, {
        category: "vacation",
      });

      expect(updated.category).toBe("vacation");
    });

    it("should update assigned user", async () => {
      const created = await mockStorage.createEvent({
        ...eventFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      // Create another user
      const anotherUser = await mockStorage.createUser({
        email: "another@test.com",
        username: "another",
        password: "hashed",
        familyId: testFamily.id,
      });

      const updated = await mockStorage.updateEvent(created.id, {
        assignedTo: anotherUser.id,
      });

      expect(updated.assignedTo).toBe(anotherUser.id);
    });
  });

  describe("DELETE /api/events/:id", () => {
    it("should delete event", async () => {
      const created = await mockStorage.createEvent({
        ...eventFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      await mockStorage.deleteEvent(created.id);

      const deleted = await mockStorage.getEvent(created.id);
      expect(deleted).toBeNull();
    });

    it("should handle deleting non-existent event", async () => {
      // Should not throw
      await expect(
        mockStorage.deleteEvent("non-existent-id")
      ).resolves.not.toThrow();
    });
  });

  describe("Event Categories", () => {
    const categories = ["family", "course", "shift", "vacation", "holiday", "other"];

    it.each(categories)("should create event with category: %s", async (category) => {
      const event = await mockStorage.createEvent({
        ...eventFixtures.basic,
        category,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      expect(event.category).toBe(category);
    });
  });

  describe("Event Date Validation", () => {
    it("should accept event with same start and end date for all-day events", async () => {
      const date = new Date().toISOString();

      const event = await mockStorage.createEvent({
        title: "All Day Event",
        startDate: date,
        endDate: date,
        allDay: true,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      expect(event.allDay).toBe(true);
    });

    it("should accept multi-day event", async () => {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      const event = await mockStorage.createEvent({
        title: "Multi-day Event",
        startDate,
        endDate,
        allDay: false,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      expect(new Date(event.endDate).getTime()).toBeGreaterThan(
        new Date(event.startDate).getTime()
      );
    });
  });
});
