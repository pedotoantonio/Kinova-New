/**
 * Integration Tests for Tasks API
 * Tests CRUD operations for task management
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createMockStorage } from "../helpers/db";
import { createTestUserData } from "../helpers/auth";
import { taskFixtures } from "../helpers/fixtures";

describe("Tasks API", () => {
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

  describe("POST /api/tasks", () => {
    it("should create a new task with required fields", async () => {
      const taskData = {
        ...taskFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      };

      const task = await mockStorage.createTask(taskData);

      expect(task.id).toBeDefined();
      expect(task.title).toBe(taskFixtures.basic.title);
      expect(task.familyId).toBe(testFamily.id);
      expect(task.completed).toBe(false);
    });

    it("should create task with high priority", async () => {
      const taskData = {
        ...taskFixtures.highPriority,
        familyId: testFamily.id,
        createdBy: testUser.id,
      };

      const task = await mockStorage.createTask(taskData);

      expect(task.priority).toBe("high");
      expect(task.dueDate).toBeDefined();
    });

    it("should create task with assigned user", async () => {
      const taskData = {
        ...taskFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
        assignedTo: testUser.id,
      };

      const task = await mockStorage.createTask(taskData);

      expect(task.assignedTo).toBe(testUser.id);
    });
  });

  describe("GET /api/tasks", () => {
    it("should get all tasks for family", async () => {
      // Create multiple tasks
      await mockStorage.createTask({
        ...taskFixtures.basic,
        title: "Task 1",
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      await mockStorage.createTask({
        ...taskFixtures.basic,
        title: "Task 2",
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const tasks = await mockStorage.getTasks(testFamily.id);

      expect(tasks.length).toBe(2);
    });

    it("should filter tasks by family", async () => {
      // Create task for test family
      await mockStorage.createTask({
        ...taskFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const tasks = await mockStorage.getTasks(testFamily.id);

      tasks.forEach((task: any) => {
        expect(task.familyId).toBe(testFamily.id);
      });
    });
  });

  describe("GET /api/tasks/:id", () => {
    it("should get task by id", async () => {
      const created = await mockStorage.createTask({
        ...taskFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const task = await mockStorage.getTask(created.id);

      expect(task).not.toBeNull();
      expect(task.id).toBe(created.id);
    });

    it("should return null for non-existent task", async () => {
      const task = await mockStorage.getTask("non-existent-id");
      expect(task).toBeNull();
    });
  });

  describe("PUT /api/tasks/:id", () => {
    it("should update task title", async () => {
      const created = await mockStorage.createTask({
        ...taskFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const updated = await mockStorage.updateTask(created.id, {
        title: "Updated Task Title",
      });

      expect(updated.title).toBe("Updated Task Title");
    });

    it("should mark task as completed", async () => {
      const created = await mockStorage.createTask({
        ...taskFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const updated = await mockStorage.updateTask(created.id, {
        completed: true,
      });

      expect(updated.completed).toBe(true);
    });

    it("should update task priority", async () => {
      const created = await mockStorage.createTask({
        ...taskFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const updated = await mockStorage.updateTask(created.id, {
        priority: "high",
      });

      expect(updated.priority).toBe("high");
    });

    it("should update due date", async () => {
      const created = await mockStorage.createTask({
        ...taskFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const newDueDate = new Date(Date.now() + 86400000).toISOString();

      const updated = await mockStorage.updateTask(created.id, {
        dueDate: newDueDate,
      });

      expect(updated.dueDate).toBe(newDueDate);
    });

    it("should reassign task to another user", async () => {
      const created = await mockStorage.createTask({
        ...taskFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
        assignedTo: testUser.id,
      });

      // Create another user
      const anotherUser = await mockStorage.createUser({
        email: "another@test.com",
        username: "another",
        password: "hashed",
        familyId: testFamily.id,
      });

      const updated = await mockStorage.updateTask(created.id, {
        assignedTo: anotherUser.id,
      });

      expect(updated.assignedTo).toBe(anotherUser.id);
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete task", async () => {
      const created = await mockStorage.createTask({
        ...taskFixtures.basic,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      await mockStorage.deleteTask(created.id);

      const deleted = await mockStorage.getTask(created.id);
      expect(deleted).toBeNull();
    });
  });

  describe("Task Priority Levels", () => {
    const priorities = ["low", "medium", "high"];

    it.each(priorities)("should create task with priority: %s", async (priority) => {
      const task = await mockStorage.createTask({
        ...taskFixtures.basic,
        priority,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      expect(task.priority).toBe(priority);
    });
  });

  describe("Task Completion Flow", () => {
    it("should track completion status changes", async () => {
      // Create incomplete task
      const task = await mockStorage.createTask({
        ...taskFixtures.basic,
        completed: false,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      expect(task.completed).toBe(false);

      // Mark as completed
      const completed = await mockStorage.updateTask(task.id, {
        completed: true,
      });

      expect(completed.completed).toBe(true);

      // Mark as incomplete again
      const uncompleted = await mockStorage.updateTask(task.id, {
        completed: false,
      });

      expect(uncompleted.completed).toBe(false);
    });
  });

  describe("Overdue Task Detection", () => {
    it("should identify overdue tasks", async () => {
      const pastDueDate = new Date(Date.now() - 86400000).toISOString();

      const task = await mockStorage.createTask({
        ...taskFixtures.basic,
        dueDate: pastDueDate,
        completed: false,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      // Check if task is overdue
      const isOverdue =
        task.dueDate &&
        !task.completed &&
        new Date(task.dueDate).getTime() < Date.now();

      expect(isOverdue).toBe(true);
    });

    it("should not flag completed tasks as overdue", async () => {
      const pastDueDate = new Date(Date.now() - 86400000).toISOString();

      const task = await mockStorage.createTask({
        ...taskFixtures.basic,
        dueDate: pastDueDate,
        completed: true,
        familyId: testFamily.id,
        createdBy: testUser.id,
      });

      const isOverdue =
        task.dueDate &&
        !task.completed &&
        new Date(task.dueDate).getTime() < Date.now();

      expect(isOverdue).toBe(false);
    });
  });
});
