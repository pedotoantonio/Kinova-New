import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "member", "child"]);

export const families = pgTable("families", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").default("member").notNull(),
  familyId: varchar("family_id").references(() => families.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const familyInvites = pgTable("family_invites", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").references(() => families.id).notNull(),
  code: text("code").notNull().unique(),
  role: userRoleEnum("role").default("member").notNull(),
  email: text("email"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: varchar("accepted_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
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
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type Family = typeof families.$inferSelect;
export type FamilyInvite = typeof familyInvites.$inferSelect;
