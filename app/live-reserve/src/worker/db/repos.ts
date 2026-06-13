// D1 + Drizzle によるリポジトリ実装。インターフェースは src/worker/types.ts。
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { and, desc, eq } from "drizzle-orm";
import { users, templates, broadcasts } from "./schema";
import type {
  User,
  UserRepo,
  Template,
  TemplateRepo,
  NewTemplate,
  BroadcastRecord,
  BroadcastRepo,
  NewBroadcastRecord,
} from "../types";

type DB = DrizzleD1Database;

export function createDb(d1: D1Database): DB {
  return drizzle(d1);
}

export function createUserRepo(db: DB): UserRepo {
  return {
    async findById(id) {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return (rows[0] as User | undefined) ?? null;
    },
    async findByGoogleSub(sub) {
      const rows = await db.select().from(users).where(eq(users.googleSub, sub)).limit(1);
      return (rows[0] as User | undefined) ?? null;
    },
    async upsert(user) {
      const existing = await this.findByGoogleSub(user.googleSub);
      if (existing) {
        await db
          .update(users)
          .set({
            email: user.email,
            displayName: user.displayName,
            encryptedRefreshToken: user.encryptedRefreshToken,
          })
          .where(eq(users.id, existing.id));
        return { ...existing, ...user, id: existing.id };
      }
      const createdAt = new Date().toISOString();
      await db.insert(users).values({ ...user, createdAt });
      return { ...user, createdAt };
    },
  };
}

export function createTemplateRepo(db: DB): TemplateRepo {
  return {
    async listByUser(userId) {
      const rows = await db
        .select()
        .from(templates)
        .where(eq(templates.userId, userId))
        .orderBy(desc(templates.createdAt));
      return rows as Template[];
    },
    async findById(id, userId) {
      const rows = await db
        .select()
        .from(templates)
        .where(and(eq(templates.id, id), eq(templates.userId, userId)))
        .limit(1);
      return (rows[0] as Template | undefined) ?? null;
    },
    async create(data: NewTemplate) {
      const now = new Date().toISOString();
      const row = { id: crypto.randomUUID(), thumbnailKey: null, ...data, createdAt: now, updatedAt: now };
      await db.insert(templates).values(row);
      return row as Template;
    },
    async update(id, userId, data) {
      const existing = await this.findById(id, userId);
      if (!existing) return null;
      const updatedAt = new Date().toISOString();
      await db
        .update(templates)
        .set({ ...data, updatedAt })
        .where(and(eq(templates.id, id), eq(templates.userId, userId)));
      return { ...existing, ...data, updatedAt };
    },
    async delete(id, userId) {
      const existing = await this.findById(id, userId);
      if (!existing) return false;
      await db
        .delete(templates)
        .where(and(eq(templates.id, id), eq(templates.userId, userId)));
      return true;
    },
  };
}

export function createBroadcastRepo(db: DB): BroadcastRepo {
  return {
    async listByUser(userId) {
      const rows = await db
        .select()
        .from(broadcasts)
        .where(eq(broadcasts.userId, userId))
        .orderBy(desc(broadcasts.scheduledAt));
      return rows as BroadcastRecord[];
    },
    async create(data: NewBroadcastRecord) {
      const row = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() };
      await db.insert(broadcasts).values(row);
      return row as BroadcastRecord;
    },
  };
}
