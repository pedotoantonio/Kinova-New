/**
 * Unit Tests for Schema Validation
 * Tests Zod schemas and database schema definitions
 */

import { describe, it, expect } from "vitest";
import {
  insertUserSchema,
  insertFamilySchema,
  insertEventSchema,
  insertTaskSchema,
  insertShoppingItemSchema,
  insertExpenseSchema,
  insertNoteSchema,
  insertPlaceSchema,
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

    it("should reject missing email", () => {
      const { email, ...userWithoutEmail } = validUser;
      const result = insertUserSchema.safeParse(userWithoutEmail);
      expect(result.success).toBe(false);
    });

    it("should reject missing username", () => {
      const { username, ...userWithoutUsername } = validUser;
      const result = insertUserSchema.safeParse(userWithoutUsername);
      expect(result.success).toBe(false);
    });

    it("should reject missing password", () => {
      const { password, ...userWithoutPassword } = validUser;
      const result = insertUserSchema.safeParse(userWithoutPassword);
      expect(result.success).toBe(false);
    });

    it("should reject missing familyId", () => {
      const { familyId, ...userWithoutFamilyId } = validUser;
      const result = insertUserSchema.safeParse(userWithoutFamilyId);
      expect(result.success).toBe(false);
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
  });

  describe("insertFamilySchema", () => {
    it("should validate a correct family object", () => {
      const validFamily = {
        name: "Test Family",
      };
      const result = insertFamilySchema.safeParse(validFamily);
      expect(result.success).toBe(true);
    });

    it("should reject missing name", () => {
      const result = insertFamilySchema.safeParse({});
      expect(result.success).toBe(false);
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
  });

  describe("insertEventSchema", () => {
    const validEvent = {
      familyId: "family-123",
      title: "Test Event",
      startDate: new Date(),
      createdBy: "user-123",
    };

    it("should validate a correct event object", () => {
      const result = insertEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it("should reject missing title", () => {
      const { title, ...eventWithoutTitle } = validEvent;
      const result = insertEventSchema.safeParse(eventWithoutTitle);
      expect(result.success).toBe(false);
    });

    it("should reject missing startDate", () => {
      const { startDate, ...eventWithoutStartDate } = validEvent;
      const result = insertEventSchema.safeParse(eventWithoutStartDate);
      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const eventWithOptionals = {
        ...validEvent,
        description: "Event description",
        endDate: new Date(Date.now() + 3600000),
        allDay: true,
        color: "#ff0000",
        category: "family",
        assignedTo: "user-456",
        placeId: "place-123",
      };
      const result = insertEventSchema.safeParse(eventWithOptionals);
      expect(result.success).toBe(true);
    });

    it("should accept valid category values", () => {
      const categories = ["family", "course", "shift", "vacation", "holiday", "other"];
      for (const category of categories) {
        const result = insertEventSchema.safeParse({ ...validEvent, category });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("insertTaskSchema", () => {
    const validTask = {
      familyId: "family-123",
      title: "Test Task",
      createdBy: "user-123",
    };

    it("should validate a correct task object", () => {
      const result = insertTaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it("should reject missing title", () => {
      const { title, ...taskWithoutTitle } = validTask;
      const result = insertTaskSchema.safeParse(taskWithoutTitle);
      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const taskWithOptionals = {
        ...validTask,
        description: "Task description",
        completed: false,
        dueDate: new Date(),
        assignedTo: "user-456",
        priority: "high",
        placeId: "place-123",
      };
      const result = insertTaskSchema.safeParse(taskWithOptionals);
      expect(result.success).toBe(true);
    });

    it("should accept valid priority values", () => {
      const priorities = ["low", "medium", "high"];
      for (const priority of priorities) {
        const result = insertTaskSchema.safeParse({ ...validTask, priority });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("insertShoppingItemSchema", () => {
    const validItem = {
      familyId: "family-123",
      name: "Milk",
      createdBy: "user-123",
    };

    it("should validate a correct shopping item object", () => {
      const result = insertShoppingItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it("should reject missing name", () => {
      const { name, ...itemWithoutName } = validItem;
      const result = insertShoppingItemSchema.safeParse(itemWithoutName);
      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const itemWithOptionals = {
        ...validItem,
        quantity: 2,
        unit: "liters",
        category: "dairy",
        estimatedPrice: "2.50",
        purchased: false,
      };
      const result = insertShoppingItemSchema.safeParse(itemWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe("insertExpenseSchema", () => {
    const validExpense = {
      familyId: "family-123",
      amount: "50.00",
      category: "food",
      date: new Date(),
      createdBy: "user-123",
    };

    it("should validate a correct expense object", () => {
      const result = insertExpenseSchema.safeParse(validExpense);
      expect(result.success).toBe(true);
    });

    it("should reject missing amount", () => {
      const { amount, ...expenseWithoutAmount } = validExpense;
      const result = insertExpenseSchema.safeParse(expenseWithoutAmount);
      expect(result.success).toBe(false);
    });

    it("should accept optional description", () => {
      const expenseWithDescription = {
        ...validExpense,
        description: "Grocery shopping",
      };
      const result = insertExpenseSchema.safeParse(expenseWithDescription);
      expect(result.success).toBe(true);
    });
  });

  describe("insertNoteSchema", () => {
    const validNote = {
      familyId: "family-123",
      title: "Test Note",
      createdBy: "user-123",
    };

    it("should validate a correct note object", () => {
      const result = insertNoteSchema.safeParse(validNote);
      expect(result.success).toBe(true);
    });

    it("should accept optional fields", () => {
      const noteWithOptionals = {
        ...validNote,
        content: "Note content here",
        color: "#ffeb3b",
        pinned: true,
      };
      const result = insertNoteSchema.safeParse(noteWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe("insertPlaceSchema", () => {
    const validPlace = {
      familyId: "family-123",
      name: "Home",
      latitude: "45.4642",
      longitude: "9.1900",
      createdBy: "user-123",
    };

    it("should validate a correct place object", () => {
      const result = insertPlaceSchema.safeParse(validPlace);
      expect(result.success).toBe(true);
    });

    it("should reject missing coordinates", () => {
      const { latitude, longitude, ...placeWithoutCoords } = validPlace;
      const result = insertPlaceSchema.safeParse(placeWithoutCoords);
      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const placeWithOptionals = {
        ...validPlace,
        description: "Our home",
        address: "Via Roma 1, Milan",
        category: "home",
      };
      const result = insertPlaceSchema.safeParse(placeWithOptionals);
      expect(result.success).toBe(true);
    });

    it("should accept valid category values", () => {
      const categories = ["home", "work", "school", "leisure", "other"];
      for (const category of categories) {
        const result = insertPlaceSchema.safeParse({ ...validPlace, category });
        expect(result.success).toBe(true);
      }
    });
  });
});
