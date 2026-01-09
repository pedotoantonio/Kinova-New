import { 
  type User, 
  type InsertUser, 
  type Family, 
  type InsertFamily, 
  type FamilyInvite,
  type UserRole,
  users, 
  families,
  familyInvites 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, gt } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { familyId: string; role?: UserRole }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getFamily(id: string): Promise<Family | undefined>;
  createFamily(family: InsertFamily): Promise<Family>;
  getFamilyMembers(familyId: string): Promise<User[]>;
  createInvite(data: { familyId: string; code: string; role: UserRole; expiresAt: Date; createdBy: string; email?: string }): Promise<FamilyInvite>;
  getInviteByCode(code: string): Promise<FamilyInvite | undefined>;
  acceptInvite(inviteId: string, userId: string): Promise<FamilyInvite | undefined>;
  getActiveInvitesByFamily(familyId: string): Promise<FamilyInvite[]>;
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

  async createUser(insertUser: InsertUser & { familyId: string; role?: UserRole }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: insertUser.username,
        password: insertUser.password,
        displayName: insertUser.displayName || insertUser.username,
        familyId: insertUser.familyId,
        role: insertUser.role || "member",
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

  async createInvite(data: { 
    familyId: string; 
    code: string; 
    role: UserRole; 
    expiresAt: Date; 
    createdBy: string;
    email?: string;
  }): Promise<FamilyInvite> {
    const [invite] = await db
      .insert(familyInvites)
      .values({
        familyId: data.familyId,
        code: data.code,
        role: data.role,
        expiresAt: data.expiresAt,
        createdBy: data.createdBy,
        email: data.email,
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
}

export const storage = new DatabaseStorage();
