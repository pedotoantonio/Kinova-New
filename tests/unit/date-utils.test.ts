/**
 * Unit Tests for Date Utilities
 * Tests date formatting and manipulation functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getTodayRange,
  getCurrentMonthRange,
  createDateRange,
} from "../helpers/fixtures";

describe("Date Utils", () => {
  // Mock current date for consistent testing
  const mockDate = new Date("2026-01-22T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getTodayRange", () => {
    it("should return start of today at 00:00:00", () => {
      const { from } = getTodayRange();
      const fromDate = new Date(from);

      expect(fromDate.getHours()).toBe(0);
      expect(fromDate.getMinutes()).toBe(0);
      expect(fromDate.getSeconds()).toBe(0);
      expect(fromDate.getMilliseconds()).toBe(0);
    });

    it("should return end of today at 23:59:59", () => {
      const { to } = getTodayRange();
      const toDate = new Date(to);

      expect(toDate.getHours()).toBe(23);
      expect(toDate.getMinutes()).toBe(59);
      expect(toDate.getSeconds()).toBe(59);
      expect(toDate.getMilliseconds()).toBe(999);
    });

    it("should return same date for from and to", () => {
      const { from, to } = getTodayRange();
      const fromDate = new Date(from);
      const toDate = new Date(to);

      expect(fromDate.getDate()).toBe(toDate.getDate());
      expect(fromDate.getMonth()).toBe(toDate.getMonth());
      expect(fromDate.getFullYear()).toBe(toDate.getFullYear());
    });
  });

  describe("getCurrentMonthRange", () => {
    it("should return first day of current month", () => {
      const { from } = getCurrentMonthRange();
      const fromDate = new Date(from);

      expect(fromDate.getDate()).toBe(1);
      expect(fromDate.getMonth()).toBe(0); // January
      expect(fromDate.getFullYear()).toBe(2026);
    });

    it("should return last day of current month", () => {
      const { to } = getCurrentMonthRange();
      const toDate = new Date(to);

      expect(toDate.getDate()).toBe(31); // January has 31 days
      expect(toDate.getMonth()).toBe(0); // January
      expect(toDate.getFullYear()).toBe(2026);
    });

    it("should handle February correctly", () => {
      vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));

      const { to } = getCurrentMonthRange();
      const toDate = new Date(to);

      expect(toDate.getDate()).toBe(28); // 2026 is not a leap year
      expect(toDate.getMonth()).toBe(1); // February
    });

    it("should handle leap year February", () => {
      vi.setSystemTime(new Date("2028-02-15T12:00:00Z"));

      const { to } = getCurrentMonthRange();
      const toDate = new Date(to);

      expect(toDate.getDate()).toBe(29); // 2028 is a leap year
    });
  });

  describe("createDateRange", () => {
    it("should create range from days ago to days ahead", () => {
      const { from, to } = createDateRange(7, 7);
      const fromDate = new Date(from);
      const toDate = new Date(to);

      // From should be 7 days ago
      expect(fromDate.getDate()).toBe(15); // 22 - 7 = 15
      expect(fromDate.getMonth()).toBe(0); // January

      // To should be 7 days ahead
      expect(toDate.getDate()).toBe(29); // 22 + 7 = 29
      expect(toDate.getMonth()).toBe(0); // January
    });

    it("should handle month boundaries correctly", () => {
      vi.setSystemTime(new Date("2026-01-03T12:00:00Z"));

      const { from } = createDateRange(5, 0);
      const fromDate = new Date(from);

      expect(fromDate.getDate()).toBe(29);
      expect(fromDate.getMonth()).toBe(11); // December
      expect(fromDate.getFullYear()).toBe(2025);
    });

    it("should set correct times for range boundaries", () => {
      const { from, to } = createDateRange(1, 1);
      const fromDate = new Date(from);
      const toDate = new Date(to);

      // From should be at start of day
      expect(fromDate.getHours()).toBe(0);
      expect(fromDate.getMinutes()).toBe(0);

      // To should be at end of day
      expect(toDate.getHours()).toBe(23);
      expect(toDate.getMinutes()).toBe(59);
    });

    it("should handle zero days", () => {
      const { from, to } = createDateRange(0, 0);

      const fromDate = new Date(from);
      const toDate = new Date(to);

      expect(fromDate.getDate()).toBe(22);
      expect(toDate.getDate()).toBe(22);
    });
  });

  describe("Event Date Helpers", () => {
    /**
     * Helper function to check if event is on a specific date
     */
    function isEventOnDate(
      event: { startDate: string; endDate?: string; allDay: boolean },
      targetDate: Date
    ): boolean {
      const dayStart = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        0,
        0,
        0,
        0
      );
      const dayEnd = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        23,
        59,
        59,
        999
      );

      const start = new Date(event.startDate);
      const end = event.endDate ? new Date(event.endDate) : start;

      if (event.allDay) {
        const eventDayStart = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate()
        );
        const eventDayEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        return dayStart >= eventDayStart && dayStart <= eventDayEnd;
      }

      return start <= dayEnd && end >= dayStart;
    }

    it("should detect event on same day", () => {
      const event = {
        startDate: "2026-01-22T10:00:00Z",
        endDate: "2026-01-22T11:00:00Z",
        allDay: false,
      };

      expect(isEventOnDate(event, mockDate)).toBe(true);
    });

    it("should detect all-day event", () => {
      const event = {
        startDate: "2026-01-22T00:00:00Z",
        endDate: "2026-01-22T23:59:59Z",
        allDay: true,
      };

      expect(isEventOnDate(event, mockDate)).toBe(true);
    });

    it("should detect multi-day event", () => {
      const event = {
        startDate: "2026-01-20T10:00:00Z",
        endDate: "2026-01-25T11:00:00Z",
        allDay: false,
      };

      expect(isEventOnDate(event, mockDate)).toBe(true);
      expect(isEventOnDate(event, new Date("2026-01-26T12:00:00Z"))).toBe(false);
    });

    it("should not detect past event", () => {
      const event = {
        startDate: "2026-01-15T10:00:00Z",
        endDate: "2026-01-15T11:00:00Z",
        allDay: false,
      };

      expect(isEventOnDate(event, mockDate)).toBe(false);
    });

    it("should not detect future event", () => {
      const event = {
        startDate: "2026-01-30T10:00:00Z",
        endDate: "2026-01-30T11:00:00Z",
        allDay: false,
      };

      expect(isEventOnDate(event, mockDate)).toBe(false);
    });
  });

  describe("Format Event Time", () => {
    /**
     * Format event time for display
     */
    function formatEventTime(event: { startDate: string; allDay: boolean }): string {
      if (event.allDay) {
        return "";
      }
      const start = new Date(event.startDate);
      return start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    it("should return empty string for all-day events", () => {
      const event = {
        startDate: "2026-01-22T10:00:00Z",
        allDay: true,
      };

      expect(formatEventTime(event)).toBe("");
    });

    it("should format time for regular events", () => {
      const event = {
        startDate: "2026-01-22T14:30:00Z",
        allDay: false,
      };

      const result = formatEventTime(event);
      // Result should match HH:MM pattern
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });
});
