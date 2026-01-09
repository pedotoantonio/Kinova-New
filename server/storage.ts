import { type User, type InsertUser, type Family, type InsertFamily, users, families } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { familyId?: string }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getFamily(id: string): Promise<Family | undefined>;
  createFamily(family: InsertFamily): Promise<Family>;
  getFamilyMembers(familyId: string): Promise<User[]>;
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

  async createUser(insertUser: InsertUser & { familyId?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: insertUser.username,
        password: insertUser.password,
        displayName: insertUser.displayName || insertUser.username,
        familyId: insertUser.familyId,
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

  async getFamilyMembers(familyId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.familyId, familyId));
  }
}

export const storage = new DatabaseStorage();
