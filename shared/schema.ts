import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "member", "child"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);
export const placeCategoryEnum = pgEnum("place_category", [
  "home",
  "work",
  "school",
  "leisure",
  "other"
]);
export const eventCategoryEnum = pgEnum("event_category", [
  "family",
  "course",
  "shift",
  "vacation",
  "holiday",
  "other"
]);
export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", [
  "daily",
  "weekly",
  "monthly"
]);

export const families = pgTable("families", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  city: text("city"),
  cityLat: numeric("city_lat"),
  cityLon: numeric("city_lon"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const places = pgTable("places", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: numeric("longitude", { precision: 11, scale: 7 }).notNull(),
  address: text("address"),
  category: placeCategoryEnum("category").default("other").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  displayName: text("display_name"),
  birthDate: timestamp("birth_date"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").default("member").notNull(),
  familyId: varchar("family_id").references(() => families.id).notNull(),
  canViewCalendar: boolean("can_view_calendar").default(true).notNull(),
  canViewTasks: boolean("can_view_tasks").default(true).notNull(),
  canViewShopping: boolean("can_view_shopping").default(true).notNull(),
  canViewBudget: boolean("can_view_budget").default(false).notNull(),
  canViewPlaces: boolean("can_view_places").default(true).notNull(),
  canModifyItems: boolean("can_modify_items").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const familyInvites = pgTable("family_invites", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id).notNull(),
  code: text("code").notNull().unique(),
  role: userRoleEnum("role").default("member").notNull(),
  displayName: text("display_name"),
  email: text("email"),
  canViewCalendar: boolean("can_view_calendar").default(true).notNull(),
  canViewTasks: boolean("can_view_tasks").default(true).notNull(),
  canViewShopping: boolean("can_view_shopping").default(true).notNull(),
  canViewBudget: boolean("can_view_budget").default(false).notNull(),
  canViewPlaces: boolean("can_view_places").default(true).notNull(),
  canModifyItems: boolean("can_modify_items").default(true).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: varchar("accepted_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id).notNull(),
  title: text("title").notNull(),
  shortCode: text("short_code"),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  allDay: boolean("all_day").default(false).notNull(),
  color: text("color"),
  category: eventCategoryEnum("category").default("family").notNull(),
  assignedTo: varchar("assigned_to").references(() => users.id),
  placeId: varchar("place_id").references(() => places.id, { onDelete: "set null" }),
  isHoliday: boolean("is_holiday").default(false).notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventRecurrences = pgTable("event_recurrences", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  frequency: recurrenceFrequencyEnum("frequency").notNull(),
  interval: integer("interval").default(1).notNull(),
  endDate: timestamp("end_date"),
  byWeekday: text("by_weekday"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").default(false).notNull(),
  dueDate: timestamp("due_date"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  placeId: varchar("place_id").references(() => places.id, { onDelete: "set null" }),
  priority: priorityEnum("priority").default("medium").notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shoppingItems = pgTable("shopping_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id).notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unit: text("unit"),
  category: text("category"),
  estimatedPrice: numeric("estimated_price", { precision: 10, scale: 2 }),
  purchased: boolean("purchased").default(false).notNull(),
  purchasedAt: timestamp("purchased_at"),
  purchasedBy: varchar("purchased_by").references(() => users.id),
  actualPrice: numeric("actual_price", { precision: 10, scale: 2 }),
  purchaseExpenseId: varchar("purchase_expense_id").references(() => expenses.id),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category"),
  paidBy: varchar("paid_by").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tokenTypeEnum = pgEnum("token_type", ["access", "refresh"]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "event_reminder",
  "event_allday",
  "event_multiday",
  "event_modified",
  "event_cancelled",
  "task_assigned",
  "task_due",
  "task_overdue",
  "task_completed",
  "shopping_item_added",
  "shopping_list_long",
  "budget_threshold",
  "expense_high",
  "ai_suggestion",
  "ai_alert"
]);

export const notificationCategoryEnum = pgEnum("notification_category", [
  "calendar",
  "tasks",
  "shopping",
  "budget",
  "ai"
]);

export const sessions = pgTable("sessions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  familyId: varchar("family_id").references(() => families.id, { onDelete: "cascade" }).notNull(),
  role: userRoleEnum("role").notNull(),
  type: tokenTypeEnum("type").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

export const insertFamilySchema = createInsertSchema(families).pick({
  name: true,
});

export type UserRole = "admin" | "member" | "child";
export type Priority = "low" | "medium" | "high";
export type PlaceCategory = "home" | "work" | "school" | "leisure" | "other";
export type EventCategory = "family" | "course" | "shift" | "vacation" | "holiday" | "other";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";
export type DbPlace = typeof places.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type Family = typeof families.$inferSelect;
export type FamilyInvite = typeof familyInvites.$inferSelect;
export type DbEvent = typeof events.$inferSelect;
export type DbEventRecurrence = typeof eventRecurrences.$inferSelect;
export type DbTask = typeof tasks.$inferSelect;
export type DbShoppingItem = typeof shoppingItems.$inferSelect;
export type DbExpense = typeof expenses.$inferSelect;
export type DbSession = typeof sessions.$inferSelect;

export const assistantConversations = pgTable("assistant_conversations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assistantMessages = pgTable("assistant_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => assistantConversations.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  attachments: text("attachments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assistantUploads = pgTable("assistant_uploads", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(),
  details: text("details"),
  source: text("source").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DbAssistantConversation = typeof assistantConversations.$inferSelect;
export type DbAssistantMessage = typeof assistantMessages.$inferSelect;
export type DbAssistantUpload = typeof assistantUploads.$inferSelect;
export type DbAuditLog = typeof auditLogs.$inferSelect;

export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: notificationTypeEnum("type").notNull(),
  category: notificationCategoryEnum("category").notNull(),
  titleKey: text("title_key").notNull(),
  titleParams: text("title_params"),
  messageKey: text("message_key").notNull(),
  messageParams: text("message_params"),
  targetUserId: varchar("target_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  familyId: varchar("family_id").references(() => families.id, { onDelete: "cascade" }).notNull(),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: varchar("related_entity_id"),
  read: boolean("read").default(false).notNull(),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationSettings = pgTable("notification_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  enabled: boolean("enabled").default(true).notNull(),
  calendarEnabled: boolean("calendar_enabled").default(true).notNull(),
  tasksEnabled: boolean("tasks_enabled").default(true).notNull(),
  shoppingEnabled: boolean("shopping_enabled").default(true).notNull(),
  budgetEnabled: boolean("budget_enabled").default(true).notNull(),
  aiEnabled: boolean("ai_enabled").default(true).notNull(),
  quietHoursStart: text("quiet_hours_start"),
  quietHoursEnd: text("quiet_hours_end"),
  eventReminderMinutes: integer("event_reminder_minutes").default(30).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pushTokens = pgTable("push_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type NotificationType = typeof notificationTypeEnum.enumValues[number];
export type NotificationCategory = typeof notificationCategoryEnum.enumValues[number];
export type DbNotification = typeof notifications.$inferSelect;
export type DbNotificationSettings = typeof notificationSettings.$inferSelect;
export type DbPushToken = typeof pushTokens.$inferSelect;
