/**
 * Database Test Helpers
 * Utilities for database operations in tests
 */

import { vi } from "vitest";

/**
 * Mock database for unit tests
 * Use this when you don't need a real database connection
 */
export function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Mock storage interface
 * Simulates the storage layer for testing
 */
export function createMockStorage() {
  const mockUsers = new Map<string, any>();
  const mockFamilies = new Map<string, any>();
  const mockEvents = new Map<string, any>();
  const mockTasks = new Map<string, any>();
  const mockSessions = new Map<string, any>();

  return {
    // User operations
    getUser: vi.fn((id: string) => Promise.resolve(mockUsers.get(id) || null)),
    getUserByEmail: vi.fn((email: string) => {
      for (const user of mockUsers.values()) {
        if (user.email === email) return Promise.resolve(user);
      }
      return Promise.resolve(null);
    }),
    getUserByUsername: vi.fn((username: string) => {
      for (const user of mockUsers.values()) {
        if (user.username === username) return Promise.resolve(user);
      }
      return Promise.resolve(null);
    }),
    createUser: vi.fn((data: any) => {
      const user = { id: `user-${Date.now()}`, ...data, createdAt: new Date() };
      mockUsers.set(user.id, user);
      return Promise.resolve(user);
    }),
    updateUser: vi.fn((id: string, data: any) => {
      const user = mockUsers.get(id);
      if (user) {
        const updated = { ...user, ...data };
        mockUsers.set(id, updated);
        return Promise.resolve(updated);
      }
      return Promise.resolve(null);
    }),
    deleteUser: vi.fn((id: string) => {
      mockUsers.delete(id);
      return Promise.resolve();
    }),

    // Family operations
    getFamily: vi.fn((id: string) => Promise.resolve(mockFamilies.get(id) || null)),
    createFamily: vi.fn((data: any) => {
      const family = { id: `family-${Date.now()}`, ...data, createdAt: new Date() };
      mockFamilies.set(family.id, family);
      return Promise.resolve(family);
    }),
    updateFamily: vi.fn((id: string, data: any) => {
      const family = mockFamilies.get(id);
      if (family) {
        const updated = { ...family, ...data };
        mockFamilies.set(id, updated);
        return Promise.resolve(updated);
      }
      return Promise.resolve(null);
    }),
    getFamilyMembers: vi.fn((familyId: string) => {
      const members = [];
      for (const user of mockUsers.values()) {
        if (user.familyId === familyId) members.push(user);
      }
      return Promise.resolve(members);
    }),

    // Event operations
    getEvent: vi.fn((id: string) => Promise.resolve(mockEvents.get(id) || null)),
    getEvents: vi.fn((familyId: string, from?: string, to?: string) => {
      const events = [];
      for (const event of mockEvents.values()) {
        if (event.familyId === familyId) events.push(event);
      }
      return Promise.resolve(events);
    }),
    createEvent: vi.fn((data: any) => {
      const event = { id: `event-${Date.now()}`, ...data, createdAt: new Date() };
      mockEvents.set(event.id, event);
      return Promise.resolve(event);
    }),
    updateEvent: vi.fn((id: string, data: any) => {
      const event = mockEvents.get(id);
      if (event) {
        const updated = { ...event, ...data, updatedAt: new Date() };
        mockEvents.set(id, updated);
        return Promise.resolve(updated);
      }
      return Promise.resolve(null);
    }),
    deleteEvent: vi.fn((id: string) => {
      mockEvents.delete(id);
      return Promise.resolve();
    }),

    // Task operations
    getTask: vi.fn((id: string) => Promise.resolve(mockTasks.get(id) || null)),
    getTasks: vi.fn((familyId: string) => {
      const tasks = [];
      for (const task of mockTasks.values()) {
        if (task.familyId === familyId) tasks.push(task);
      }
      return Promise.resolve(tasks);
    }),
    createTask: vi.fn((data: any) => {
      const task = { id: `task-${Date.now()}`, ...data, createdAt: new Date() };
      mockTasks.set(task.id, task);
      return Promise.resolve(task);
    }),
    updateTask: vi.fn((id: string, data: any) => {
      const task = mockTasks.get(id);
      if (task) {
        const updated = { ...task, ...data, updatedAt: new Date() };
        mockTasks.set(id, updated);
        return Promise.resolve(updated);
      }
      return Promise.resolve(null);
    }),
    deleteTask: vi.fn((id: string) => {
      mockTasks.delete(id);
      return Promise.resolve();
    }),

    // Session operations
    createSession: vi.fn((data: any) => {
      const session = { id: `session-${Date.now()}`, ...data, createdAt: new Date() };
      mockSessions.set(session.id, session);
      return Promise.resolve(session);
    }),
    getSession: vi.fn((id: string) => Promise.resolve(mockSessions.get(id) || null)),
    deleteSession: vi.fn((id: string) => {
      mockSessions.delete(id);
      return Promise.resolve();
    }),
    deleteUserSessions: vi.fn((userId: string) => {
      for (const [id, session] of mockSessions.entries()) {
        if (session.userId === userId) mockSessions.delete(id);
      }
      return Promise.resolve();
    }),

    // Utilities
    _mockUsers: mockUsers,
    _mockFamilies: mockFamilies,
    _mockEvents: mockEvents,
    _mockTasks: mockTasks,
    _mockSessions: mockSessions,
    _reset: () => {
      mockUsers.clear();
      mockFamilies.clear();
      mockEvents.clear();
      mockTasks.clear();
      mockSessions.clear();
    },
  };
}

/**
 * Transaction helper for tests
 */
export function createMockTransaction() {
  const operations: Array<() => Promise<void>> = [];

  return {
    add: (operation: () => Promise<void>) => {
      operations.push(operation);
    },
    commit: async () => {
      for (const op of operations) {
        await op();
      }
      operations.length = 0;
    },
    rollback: () => {
      operations.length = 0;
    },
  };
}
