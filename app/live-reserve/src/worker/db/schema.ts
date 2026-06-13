import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  privacy: text("privacy", { enum: ["public", "unlisted", "private"] })
    .notNull()
    .default("private"),
  // カレンダー/週ボード配置時に既定で入る配信時刻（"HH:MM"）。未設定はボード既定にフォールバック。
  defaultTime: text("default_time"),
  thumbnailKey: text("thumbnail_key"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const broadcasts = sqliteTable("broadcasts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  templateId: text("template_id").references(() => templates.id),
  videoId: text("video_id").notNull(),
  broadcastId: text("broadcast_id").notNull(),
  streamId: text("stream_id"),
  title: text("title").notNull(),
  scheduledAt: text("scheduled_at").notNull(),
  privacy: text("privacy", { enum: ["public", "unlisted", "private"] }).notNull(),
  watchUrl: text("watch_url").notNull(),
  status: text("status").notNull().default("created"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
