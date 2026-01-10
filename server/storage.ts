import { 
  type User, 
  type InsertUser, 
  type Family, 
  type InsertFamily, 
  type FamilyInvite,
  type UserRole,
  type DbPlace,
  type PlaceCategory,
  type DbEvent,
  type DbEventRecurrence,
  type DbTask,
  type DbShoppingItem,
  type DbExpense,
  type DbSession,
  type DbAssistantConversation,
  type DbAssistantMessage,
  type DbAssistantUpload,
  type DbAuditLog,
  type DbNotification,
  type DbNotificationSettings,
  type DbPushToken,
  type DbLoginAttempt,
  type NotificationType,
  type NotificationCategory,
  type EventCategory,
  users, 
  families,
  places,
  familyInvites,
  events,
  eventRecurrences,
  tasks,
  shoppingItems,
  expenses,
  sessions,
  assistantConversations,
  assistantMessages,
  assistantUploads,
  auditLogs,
  notifications,
  notificationSettings,
  pushTokens,
  loginAttempts
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, gt, gte, lte, desc, lt, or } from "drizzle-orm";
import { getDefaultPermissionsForRole } from "./permissions";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser & { familyId: string; role?: UserRole; email: string }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  recordLoginAttempt(email: string, ipAddress: string | null, success: boolean): Promise<DbLoginAttempt>;
  getRecentLoginAttempts(email: string, minutes: number): Promise<DbLoginAttempt[]>;
  getFamily(id: string): Promise<Family | undefined>;
  createFamily(family: InsertFamily): Promise<Family>;
  updateFamily(id: string, data: Partial<Family>): Promise<Family | undefined>;
  getFamilyMembers(familyId: string): Promise<User[]>;
  createInvite(data: { familyId: string; code: string; role: UserRole; expiresAt: Date; createdBy: string; email?: string }): Promise<FamilyInvite>;
  getInviteByCode(code: string): Promise<FamilyInvite | undefined>;
  acceptInvite(inviteId: string, userId: string): Promise<FamilyInvite | undefined>;
  getActiveInvitesByFamily(familyId: string): Promise<FamilyInvite[]>;
  
  getEvents(familyId: string, from?: Date, to?: Date, filters?: { category?: EventCategory; assignedTo?: string }): Promise<DbEvent[]>;
  getEvent(id: string, familyId: string): Promise<DbEvent | undefined>;
  createEvent(data: Omit<DbEvent, "id" | "createdAt" | "updatedAt">): Promise<DbEvent>;
  updateEvent(id: string, familyId: string, data: Partial<DbEvent>): Promise<DbEvent | undefined>;
  deleteEvent(id: string, familyId: string): Promise<boolean>;
  
  getEventRecurrence(eventId: string): Promise<DbEventRecurrence | undefined>;
  createEventRecurrence(data: Omit<DbEventRecurrence, "id" | "createdAt">): Promise<DbEventRecurrence>;
  updateEventRecurrence(eventId: string, data: Partial<DbEventRecurrence>): Promise<DbEventRecurrence | undefined>;
  deleteEventRecurrence(eventId: string): Promise<boolean>;
  
  getTasks(familyId: string, filters?: { completed?: boolean; assignedTo?: string }): Promise<DbTask[]>;
  getTask(id: string, familyId: string): Promise<DbTask | undefined>;
  createTask(data: Omit<DbTask, "id" | "createdAt" | "updatedAt">): Promise<DbTask>;
  updateTask(id: string, familyId: string, data: Partial<DbTask>): Promise<DbTask | undefined>;
  deleteTask(id: string, familyId: string): Promise<boolean>;
  
  getShoppingItems(familyId: string, filters?: { purchased?: boolean; category?: string }): Promise<DbShoppingItem[]>;
  getShoppingItem(id: string, familyId: string): Promise<DbShoppingItem | undefined>;
  createShoppingItem(data: Omit<DbShoppingItem, "id" | "createdAt" | "updatedAt">): Promise<DbShoppingItem>;
  updateShoppingItem(id: string, familyId: string, data: Partial<DbShoppingItem>): Promise<DbShoppingItem | undefined>;
  deleteShoppingItem(id: string, familyId: string): Promise<boolean>;
  
  getExpenses(familyId: string, filters?: { from?: Date; to?: Date; category?: string; paidBy?: string }): Promise<DbExpense[]>;
  getExpense(id: string, familyId: string): Promise<DbExpense | undefined>;
  createExpense(data: Omit<DbExpense, "id" | "createdAt" | "updatedAt">): Promise<DbExpense>;
  updateExpense(id: string, familyId: string, data: Partial<DbExpense>): Promise<DbExpense | undefined>;
  deleteExpense(id: string, familyId: string): Promise<boolean>;
  
  createSession(data: { token: string; userId: string; familyId: string; role: UserRole; type: "access" | "refresh"; expiresAt: Date }): Promise<DbSession>;
  getSession(token: string): Promise<DbSession | undefined>;
  deleteSession(token: string): Promise<boolean>;
  deleteSessionsByUser(userId: string): Promise<boolean>;
  cleanExpiredSessions(): Promise<number>;
  
  getPlaces(familyId: string, category?: PlaceCategory): Promise<DbPlace[]>;
  getPlace(id: string, familyId: string): Promise<DbPlace | undefined>;
  createPlace(data: Omit<DbPlace, "id" | "createdAt" | "updatedAt">): Promise<DbPlace>;
  updatePlace(id: string, familyId: string, data: Partial<DbPlace>): Promise<DbPlace | undefined>;
  deletePlace(id: string, familyId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user;
  }

  async createUser(insertUser: InsertUser & { familyId: string; role?: UserRole; email: string; emailVerificationToken?: string; emailVerificationExpires?: Date }): Promise<User> {
    const role = insertUser.role || "member";
    const permissions = getDefaultPermissionsForRole(role);
    
    const [user] = await db
      .insert(users)
      .values({
        email: insertUser.email.toLowerCase(),
        username: insertUser.username,
        password: insertUser.password,
        displayName: insertUser.displayName || insertUser.username,
        familyId: insertUser.familyId,
        role,
        emailVerified: false,
        emailVerificationToken: insertUser.emailVerificationToken,
        emailVerificationExpires: insertUser.emailVerificationExpires,
        canViewCalendar: permissions.canViewCalendar,
        canViewTasks: permissions.canViewTasks,
        canViewShopping: permissions.canViewShopping,
        canViewBudget: permissions.canViewBudget,
        canViewPlaces: permissions.canViewPlaces,
        canModifyItems: permissions.canModifyItems,
      })
      .returning();
    return user;
  }

  async recordLoginAttempt(email: string, ipAddress: string | null, success: boolean): Promise<DbLoginAttempt> {
    const [attempt] = await db
      .insert(loginAttempts)
      .values({
        email: email.toLowerCase(),
        ipAddress,
        success,
      })
      .returning();
    return attempt;
  }

  async getRecentLoginAttempts(email: string, minutes: number): Promise<DbLoginAttempt[]> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const attempts = await db
      .select()
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, email.toLowerCase()),
          gt(loginAttempts.createdAt, cutoff),
          eq(loginAttempts.success, false)
        )
      );
    return attempts;
  }

  async createUserWithPermissions(data: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
    familyId: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    birthDate?: Date;
    canViewCalendar: boolean;
    canViewTasks: boolean;
    canViewShopping: boolean;
    canViewBudget: boolean;
    canViewPlaces: boolean;
    canModifyItems: boolean;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        username: data.username,
        password: data.password,
        displayName: data.displayName || data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate,
        familyId: data.familyId,
        role: data.role,
        emailVerified: false,
        canViewCalendar: data.canViewCalendar,
        canViewTasks: data.canViewTasks,
        canViewShopping: data.canViewShopping,
        canViewBudget: data.canViewBudget,
        canViewPlaces: data.canViewPlaces,
        canModifyItems: data.canModifyItems,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getFamily(id: string): Promise<Family | undefined> {
    const [family] = await db.select().from(families).where(eq(families.id, id));
    return family;
  }

  async createFamily(insertFamily: InsertFamily): Promise<Family> {
    const [family] = await db
      .insert(families)
      .values({
        name: insertFamily.name,
      })
      .returning();
    return family;
  }

  async updateFamily(id: string, data: Partial<Family>): Promise<Family | undefined> {
    const [family] = await db
      .update(families)
      .set(data)
      .where(eq(families.id, id))
      .returning();
    return family;
  }

  async getFamilyMembers(familyId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.familyId, familyId));
  }

  async createInvite(data: { 
    familyId: string; 
    code: string; 
    role: UserRole; 
    expiresAt: Date; 
    createdBy: string;
    displayName?: string;
    email?: string;
    canViewCalendar?: boolean;
    canViewTasks?: boolean;
    canViewShopping?: boolean;
    canViewBudget?: boolean;
    canViewPlaces?: boolean;
    canModifyItems?: boolean;
  }): Promise<FamilyInvite> {
    const [invite] = await db
      .insert(familyInvites)
      .values({
        familyId: data.familyId,
        code: data.code,
        role: data.role,
        expiresAt: data.expiresAt,
        createdBy: data.createdBy,
        displayName: data.displayName,
        email: data.email,
        canViewCalendar: data.canViewCalendar ?? true,
        canViewTasks: data.canViewTasks ?? true,
        canViewShopping: data.canViewShopping ?? true,
        canViewBudget: data.canViewBudget ?? false,
        canViewPlaces: data.canViewPlaces ?? true,
        canModifyItems: data.canModifyItems ?? true,
      })
      .returning();
    return invite;
  }

  async getInviteByCode(code: string): Promise<FamilyInvite | undefined> {
    const [invite] = await db
      .select()
      .from(familyInvites)
      .where(
        and(
          eq(familyInvites.code, code),
          isNull(familyInvites.acceptedAt),
          gt(familyInvites.expiresAt, new Date())
        )
      );
    return invite;
  }

  async acceptInvite(inviteId: string, userId: string): Promise<FamilyInvite | undefined> {
    const [invite] = await db
      .update(familyInvites)
      .set({
        acceptedAt: new Date(),
        acceptedBy: userId,
      })
      .where(eq(familyInvites.id, inviteId))
      .returning();
    return invite;
  }

  async getActiveInvitesByFamily(familyId: string): Promise<FamilyInvite[]> {
    return db
      .select()
      .from(familyInvites)
      .where(
        and(
          eq(familyInvites.familyId, familyId),
          isNull(familyInvites.acceptedAt),
          gt(familyInvites.expiresAt, new Date())
        )
      );
  }

  async getEvents(familyId: string, from?: Date, to?: Date, filters?: { category?: EventCategory; assignedTo?: string }): Promise<DbEvent[]> {
    const conditions = [eq(events.familyId, familyId)];
    
    if (from && to) {
      conditions.push(lte(events.startDate, to));
      conditions.push(
        or(
          gte(events.endDate, from),
          isNull(events.endDate)
        )!
      );
    } else if (from) {
      conditions.push(
        or(
          gte(events.startDate, from),
          gte(events.endDate, from)
        )!
      );
    } else if (to) {
      conditions.push(lte(events.startDate, to));
    }
    
    if (filters?.category) {
      conditions.push(eq(events.category, filters.category));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(events.assignedTo, filters.assignedTo));
    }
    
    return db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(events.startDate);
  }

  async getEvent(id: string, familyId: string): Promise<DbEvent | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.familyId, familyId)));
    return event;
  }

  async createEvent(data: Omit<DbEvent, "id" | "createdAt" | "updatedAt">): Promise<DbEvent> {
    const [event] = await db
      .insert(events)
      .values(data)
      .returning();
    return event;
  }

  async updateEvent(id: string, familyId: string, data: Partial<DbEvent>): Promise<DbEvent | undefined> {
    const [event] = await db
      .update(events)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(events.id, id), eq(events.familyId, familyId)))
      .returning();
    return event;
  }

  async deleteEvent(id: string, familyId: string): Promise<boolean> {
    await db.delete(events).where(and(eq(events.id, id), eq(events.familyId, familyId)));
    return true;
  }

  async getEventRecurrence(eventId: string): Promise<DbEventRecurrence | undefined> {
    const [recurrence] = await db
      .select()
      .from(eventRecurrences)
      .where(eq(eventRecurrences.eventId, eventId));
    return recurrence;
  }

  async createEventRecurrence(data: Omit<DbEventRecurrence, "id" | "createdAt">): Promise<DbEventRecurrence> {
    const [recurrence] = await db
      .insert(eventRecurrences)
      .values(data)
      .returning();
    return recurrence;
  }

  async updateEventRecurrence(eventId: string, data: Partial<DbEventRecurrence>): Promise<DbEventRecurrence | undefined> {
    const [recurrence] = await db
      .update(eventRecurrences)
      .set(data)
      .where(eq(eventRecurrences.eventId, eventId))
      .returning();
    return recurrence;
  }

  async deleteEventRecurrence(eventId: string): Promise<boolean> {
    await db.delete(eventRecurrences).where(eq(eventRecurrences.eventId, eventId));
    return true;
  }

  async getTasks(familyId: string, filters?: { completed?: boolean; assignedTo?: string }): Promise<DbTask[]> {
    const conditions = [eq(tasks.familyId, familyId)];
    if (filters?.completed !== undefined) conditions.push(eq(tasks.completed, filters.completed));
    if (filters?.assignedTo) conditions.push(eq(tasks.assignedTo, filters.assignedTo));
    
    return db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string, familyId: string): Promise<DbTask | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.familyId, familyId)));
    return task;
  }

  async createTask(data: Omit<DbTask, "id" | "createdAt" | "updatedAt">): Promise<DbTask> {
    const [task] = await db
      .insert(tasks)
      .values(data)
      .returning();
    return task;
  }

  async updateTask(id: string, familyId: string, data: Partial<DbTask>): Promise<DbTask | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.familyId, familyId)))
      .returning();
    return task;
  }

  async deleteTask(id: string, familyId: string): Promise<boolean> {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.familyId, familyId)));
    return true;
  }

  async getShoppingItems(familyId: string, filters?: { purchased?: boolean; category?: string }): Promise<DbShoppingItem[]> {
    const conditions = [eq(shoppingItems.familyId, familyId)];
    if (filters?.purchased !== undefined) conditions.push(eq(shoppingItems.purchased, filters.purchased));
    if (filters?.category) conditions.push(eq(shoppingItems.category, filters.category));
    
    return db
      .select()
      .from(shoppingItems)
      .where(and(...conditions))
      .orderBy(desc(shoppingItems.createdAt));
  }

  async getShoppingItem(id: string, familyId: string): Promise<DbShoppingItem | undefined> {
    const [item] = await db
      .select()
      .from(shoppingItems)
      .where(and(eq(shoppingItems.id, id), eq(shoppingItems.familyId, familyId)));
    return item;
  }

  async createShoppingItem(data: Omit<DbShoppingItem, "id" | "createdAt" | "updatedAt">): Promise<DbShoppingItem> {
    const [item] = await db
      .insert(shoppingItems)
      .values(data)
      .returning();
    return item;
  }

  async updateShoppingItem(id: string, familyId: string, data: Partial<DbShoppingItem>): Promise<DbShoppingItem | undefined> {
    const [item] = await db
      .update(shoppingItems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(shoppingItems.id, id), eq(shoppingItems.familyId, familyId)))
      .returning();
    return item;
  }

  async deleteShoppingItem(id: string, familyId: string): Promise<boolean> {
    await db.delete(shoppingItems).where(and(eq(shoppingItems.id, id), eq(shoppingItems.familyId, familyId)));
    return true;
  }

  async getExpenses(familyId: string, filters?: { from?: Date; to?: Date; category?: string; paidBy?: string }): Promise<DbExpense[]> {
    const conditions = [eq(expenses.familyId, familyId)];
    if (filters?.from) conditions.push(gte(expenses.date, filters.from));
    if (filters?.to) conditions.push(lte(expenses.date, filters.to));
    if (filters?.category) conditions.push(eq(expenses.category, filters.category));
    if (filters?.paidBy) conditions.push(eq(expenses.paidBy, filters.paidBy));
    
    return db
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.date));
  }

  async getExpense(id: string, familyId: string): Promise<DbExpense | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.familyId, familyId)));
    return expense;
  }

  async createExpense(data: Omit<DbExpense, "id" | "createdAt" | "updatedAt">): Promise<DbExpense> {
    const [expense] = await db
      .insert(expenses)
      .values(data)
      .returning();
    return expense;
  }

  async updateExpense(id: string, familyId: string, data: Partial<DbExpense>): Promise<DbExpense | undefined> {
    const [expense] = await db
      .update(expenses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.familyId, familyId)))
      .returning();
    return expense;
  }

  async deleteExpense(id: string, familyId: string): Promise<boolean> {
    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.familyId, familyId)));
    return true;
  }

  async createSession(data: { 
    token: string; 
    userId: string; 
    familyId: string; 
    role: UserRole; 
    type: "access" | "refresh"; 
    expiresAt: Date 
  }): Promise<DbSession> {
    const [session] = await db
      .insert(sessions)
      .values(data)
      .returning();
    return session;
  }

  async getSession(token: string): Promise<DbSession | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token));
    return session;
  }

  async deleteSession(token: string): Promise<boolean> {
    await db.delete(sessions).where(eq(sessions.token, token));
    return true;
  }

  async deleteSessionsByUser(userId: string): Promise<boolean> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
    return true;
  }

  async cleanExpiredSessions(): Promise<number> {
    const result = await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .returning();
    return result.length;
  }

  async getAssistantConversations(familyId: string, userId: string): Promise<DbAssistantConversation[]> {
    return db
      .select()
      .from(assistantConversations)
      .where(and(eq(assistantConversations.familyId, familyId), eq(assistantConversations.userId, userId)))
      .orderBy(desc(assistantConversations.updatedAt));
  }

  async getAssistantConversation(id: string, familyId: string): Promise<DbAssistantConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(assistantConversations)
      .where(and(eq(assistantConversations.id, id), eq(assistantConversations.familyId, familyId)));
    return conversation;
  }

  async createAssistantConversation(data: { familyId: string; userId: string; title?: string | null }): Promise<DbAssistantConversation> {
    const [conversation] = await db
      .insert(assistantConversations)
      .values({
        familyId: data.familyId,
        userId: data.userId,
        title: data.title || null,
      })
      .returning();
    return conversation;
  }

  async updateAssistantConversation(id: string, data: Partial<DbAssistantConversation>): Promise<DbAssistantConversation | undefined> {
    const [conversation] = await db
      .update(assistantConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assistantConversations.id, id))
      .returning();
    return conversation;
  }

  async deleteAssistantConversation(id: string): Promise<boolean> {
    await db.delete(assistantConversations).where(eq(assistantConversations.id, id));
    return true;
  }

  async getAssistantMessages(conversationId: string): Promise<DbAssistantMessage[]> {
    return db
      .select()
      .from(assistantMessages)
      .where(eq(assistantMessages.conversationId, conversationId))
      .orderBy(assistantMessages.createdAt);
  }

  async createAssistantMessage(data: { conversationId: string; role: string; content: string; attachments?: string | null }): Promise<DbAssistantMessage> {
    const [message] = await db
      .insert(assistantMessages)
      .values({
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        attachments: data.attachments || null,
      })
      .returning();
    return message;
  }

  async getAssistantUpload(id: string, familyId: string): Promise<DbAssistantUpload | undefined> {
    const [upload] = await db
      .select()
      .from(assistantUploads)
      .where(and(eq(assistantUploads.id, id), eq(assistantUploads.familyId, familyId)));
    return upload;
  }

  async createAssistantUpload(data: {
    familyId: string;
    userId: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    extractedText?: string | null;
  }): Promise<DbAssistantUpload> {
    const [upload] = await db
      .insert(assistantUploads)
      .values({
        familyId: data.familyId,
        userId: data.userId,
        filename: data.filename,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        extractedText: data.extractedText || null,
      })
      .returning();
    return upload;
  }

  async createAuditLog(data: {
    familyId: string;
    userId: string;
    action: string;
    details?: string | null;
    source: string;
  }): Promise<DbAuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values({
        familyId: data.familyId,
        userId: data.userId,
        action: data.action,
        details: data.details || null,
        source: data.source,
      })
      .returning();
    return log;
  }

  async getAuditLogs(familyId: string, limit: number = 50): Promise<DbAuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.familyId, familyId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getNotifications(userId: string, familyId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<DbNotification[]> {
    const conditions = [
      eq(notifications.targetUserId, userId),
      eq(notifications.familyId, familyId)
    ];
    if (options?.unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }
    return db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(options?.limit || 50);
  }

  async getNotification(id: string, userId: string, familyId: string): Promise<DbNotification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.targetUserId, userId),
        eq(notifications.familyId, familyId)
      ));
    return notification;
  }

  async createNotification(data: {
    type: NotificationType;
    category: NotificationCategory;
    titleKey: string;
    titleParams?: string | null;
    messageKey: string;
    messageParams?: string | null;
    targetUserId: string;
    familyId: string;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    scheduledAt?: Date | null;
  }): Promise<DbNotification> {
    const [notification] = await db
      .insert(notifications)
      .values({
        type: data.type,
        category: data.category,
        titleKey: data.titleKey,
        titleParams: data.titleParams || null,
        messageKey: data.messageKey,
        messageParams: data.messageParams || null,
        targetUserId: data.targetUserId,
        familyId: data.familyId,
        relatedEntityType: data.relatedEntityType || null,
        relatedEntityId: data.relatedEntityId || null,
        scheduledAt: data.scheduledAt || null,
      })
      .returning();
    return notification;
  }

  async markNotificationRead(id: string, userId: string, familyId: string): Promise<DbNotification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ read: true })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.targetUserId, userId),
        eq(notifications.familyId, familyId)
      ))
      .returning();
    return notification;
  }

  async markAllNotificationsRead(userId: string, familyId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(and(
        eq(notifications.targetUserId, userId),
        eq(notifications.familyId, familyId),
        eq(notifications.read, false)
      ));
    return 1;
  }

  async deleteNotification(id: string, userId: string, familyId: string): Promise<boolean> {
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.targetUserId, userId),
        eq(notifications.familyId, familyId)
      ));
    return true;
  }

  async deleteNotificationsByEntity(entityType: string, entityId: string, familyId: string): Promise<boolean> {
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.relatedEntityType, entityType),
        eq(notifications.relatedEntityId, entityId),
        eq(notifications.familyId, familyId)
      ));
    return true;
  }

  async getUnreadNotificationCount(userId: string, familyId: string): Promise<number> {
    const result = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.targetUserId, userId),
        eq(notifications.familyId, familyId),
        eq(notifications.read, false)
      ));
    return result.length;
  }

  async getScheduledNotifications(before: Date): Promise<DbNotification[]> {
    return db
      .select()
      .from(notifications)
      .where(and(
        lte(notifications.scheduledAt, before),
        isNull(notifications.sentAt)
      ));
  }

  async markNotificationSent(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ sentAt: new Date() })
      .where(eq(notifications.id, id));
  }

  async getNotificationSettings(userId: string): Promise<DbNotificationSettings | undefined> {
    const [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));
    return settings;
  }

  async upsertNotificationSettings(userId: string, data: Partial<Omit<DbNotificationSettings, "id" | "userId" | "updatedAt">>): Promise<DbNotificationSettings> {
    const existing = await this.getNotificationSettings(userId);
    if (existing) {
      const [updated] = await db
        .update(notificationSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(notificationSettings.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(notificationSettings)
        .values({
          userId,
          enabled: data.enabled ?? true,
          calendarEnabled: data.calendarEnabled ?? true,
          tasksEnabled: data.tasksEnabled ?? true,
          shoppingEnabled: data.shoppingEnabled ?? true,
          budgetEnabled: data.budgetEnabled ?? true,
          aiEnabled: data.aiEnabled ?? true,
          quietHoursStart: data.quietHoursStart || null,
          quietHoursEnd: data.quietHoursEnd || null,
          eventReminderMinutes: data.eventReminderMinutes ?? 30,
        })
        .returning();
      return created;
    }
  }

  async getPushToken(userId: string): Promise<DbPushToken | undefined> {
    const [token] = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));
    return token;
  }

  async getPushTokensByFamily(familyId: string): Promise<DbPushToken[]> {
    const familyMembers = await this.getFamilyMembers(familyId);
    const memberIds = familyMembers.map(m => m.id);
    if (memberIds.length === 0) return [];
    
    const tokens: DbPushToken[] = [];
    for (const memberId of memberIds) {
      const token = await this.getPushToken(memberId);
      if (token) tokens.push(token);
    }
    return tokens;
  }

  async upsertPushToken(userId: string, token: string, platform: string): Promise<DbPushToken> {
    const existing = await this.getPushToken(userId);
    if (existing) {
      const [updated] = await db
        .update(pushTokens)
        .set({ token, platform })
        .where(eq(pushTokens.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(pushTokens)
        .values({ userId, token, platform })
        .returning();
      return created;
    }
  }

  async deletePushToken(userId: string): Promise<boolean> {
    await db.delete(pushTokens).where(eq(pushTokens.userId, userId));
    return true;
  }

  async getPlaces(familyId: string, category?: PlaceCategory): Promise<DbPlace[]> {
    const conditions = [eq(places.familyId, familyId)];
    if (category) {
      conditions.push(eq(places.category, category));
    }
    return db
      .select()
      .from(places)
      .where(and(...conditions))
      .orderBy(places.name);
  }

  async getPlace(id: string, familyId: string): Promise<DbPlace | undefined> {
    const [place] = await db
      .select()
      .from(places)
      .where(and(eq(places.id, id), eq(places.familyId, familyId)));
    return place;
  }

  async createPlace(data: Omit<DbPlace, "id" | "createdAt" | "updatedAt">): Promise<DbPlace> {
    const [place] = await db
      .insert(places)
      .values(data)
      .returning();
    return place;
  }

  async updatePlace(id: string, familyId: string, data: Partial<DbPlace>): Promise<DbPlace | undefined> {
    const [place] = await db
      .update(places)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(places.id, id), eq(places.familyId, familyId)))
      .returning();
    return place;
  }

  async deletePlace(id: string, familyId: string): Promise<boolean> {
    await db.delete(places).where(and(eq(places.id, id), eq(places.familyId, familyId)));
    return true;
  }
}

export const storage = new DatabaseStorage();
