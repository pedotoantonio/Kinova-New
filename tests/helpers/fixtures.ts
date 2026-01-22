/**
 * Test Fixtures
 * Sample data for testing various entities
 */

import type { Event, Task, ShoppingItem, Expense, Note } from "@shared/types";

/**
 * Event Fixtures
 */
export const eventFixtures = {
  basic: {
    title: "Test Event",
    description: "Test event description",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 3600000).toISOString(),
    allDay: false,
    category: "family" as const,
  },
  allDay: {
    title: "All Day Event",
    description: "All day event description",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    allDay: true,
    category: "holiday" as const,
  },
  recurring: {
    title: "Recurring Event",
    description: "Recurring event description",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 3600000).toISOString(),
    allDay: false,
    category: "course" as const,
    recurrence: {
      frequency: "weekly" as const,
      interval: 1,
      endDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
    },
  },
  withPlace: {
    title: "Event with Place",
    description: "Event at a specific location",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 3600000).toISOString(),
    allDay: false,
    category: "family" as const,
    placeId: "test-place-id",
  },
};

/**
 * Task Fixtures
 */
export const taskFixtures = {
  basic: {
    title: "Test Task",
    description: "Test task description",
    completed: false,
    priority: "medium" as const,
  },
  highPriority: {
    title: "Urgent Task",
    description: "High priority task",
    completed: false,
    priority: "high" as const,
    dueDate: new Date(Date.now() + 86400000).toISOString(),
  },
  completed: {
    title: "Completed Task",
    description: "Already completed task",
    completed: true,
    priority: "low" as const,
  },
  overdue: {
    title: "Overdue Task",
    description: "Task past due date",
    completed: false,
    priority: "high" as const,
    dueDate: new Date(Date.now() - 86400000).toISOString(),
  },
};

/**
 * Shopping Item Fixtures
 */
export const shoppingFixtures = {
  basic: {
    name: "Milk",
    quantity: 2,
    unit: "liters",
    category: "dairy",
    purchased: false,
  },
  withPrice: {
    name: "Bread",
    quantity: 1,
    unit: "pcs",
    category: "bakery",
    estimatedPrice: "2.50",
    purchased: false,
  },
  purchased: {
    name: "Eggs",
    quantity: 12,
    unit: "pcs",
    category: "dairy",
    purchased: true,
    actualPrice: "3.99",
    purchasedAt: new Date().toISOString(),
  },
};

/**
 * Expense Fixtures
 */
export const expenseFixtures = {
  basic: {
    amount: "50.00",
    description: "Grocery shopping",
    category: "food",
    date: new Date().toISOString(),
  },
  recurring: {
    amount: "100.00",
    description: "Monthly subscription",
    category: "entertainment",
    date: new Date().toISOString(),
    isRecurring: true,
  },
  large: {
    amount: "500.00",
    description: "Utility bills",
    category: "utilities",
    date: new Date().toISOString(),
  },
};

/**
 * Note Fixtures
 */
export const noteFixtures = {
  basic: {
    title: "Test Note",
    content: "This is a test note content.",
    color: "#ffffff",
    pinned: false,
  },
  pinned: {
    title: "Important Note",
    content: "This is an important pinned note.",
    color: "#ffeb3b",
    pinned: true,
  },
  colored: {
    title: "Colored Note",
    content: "Note with custom color.",
    color: "#4caf50",
    pinned: false,
  },
};

/**
 * Family Fixtures
 */
export const familyFixtures = {
  basic: {
    name: "Test Family",
    city: "Milan",
    cityLat: "45.4642",
    cityLon: "9.1900",
    planType: "trial" as const,
  },
  premium: {
    name: "Premium Family",
    city: "Rome",
    cityLat: "41.9028",
    cityLon: "12.4964",
    planType: "premium" as const,
  },
  donor: {
    name: "Donor Family",
    city: "Naples",
    cityLat: "40.8518",
    cityLon: "14.2681",
    planType: "donor" as const,
  },
};

/**
 * Place Fixtures
 */
export const placeFixtures = {
  home: {
    name: "Home",
    description: "Our home address",
    latitude: "45.4642",
    longitude: "9.1900",
    address: "Via Roma 1, Milan",
    category: "home" as const,
  },
  work: {
    name: "Office",
    description: "Work office",
    latitude: "45.4700",
    longitude: "9.1800",
    address: "Via Milano 100, Milan",
    category: "work" as const,
  },
  school: {
    name: "School",
    description: "Kids school",
    latitude: "45.4600",
    longitude: "9.2000",
    address: "Via Scuola 50, Milan",
    category: "school" as const,
  },
};

/**
 * Generate unique fixture with timestamp
 */
export function generateUniqueFixture<T extends Record<string, unknown>>(
  fixture: T,
  uniqueFields: (keyof T)[] = []
): T {
  const timestamp = Date.now();
  const result = { ...fixture };

  for (const field of uniqueFields) {
    if (typeof result[field] === "string") {
      result[field] = `${result[field]}-${timestamp}` as T[keyof T];
    }
  }

  return result;
}

/**
 * Create date range for queries
 */
export function createDateRange(daysAgo: number, daysAhead: number) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - daysAgo);
  from.setHours(0, 0, 0, 0);

  const to = new Date(now);
  to.setDate(to.getDate() + daysAhead);
  to.setHours(23, 59, 59, 999);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

/**
 * Create today's date range
 */
export function getTodayRange() {
  return createDateRange(0, 0);
}

/**
 * Create current month range
 */
export function getCurrentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}
