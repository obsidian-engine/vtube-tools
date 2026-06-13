import type { PrivacyStatus } from "./youtube/client";

export interface User {
  id: string;
  googleSub: string;
  email: string;
  displayName: string | null;
  encryptedRefreshToken: string;
  createdAt: string;
}

export interface Template {
  id: string;
  userId: string;
  name: string;
  title: string;
  description: string;
  privacy: PrivacyStatus;
  defaultTime: string | null;
  thumbnailKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewTemplate = Pick<
  Template,
  "userId" | "name" | "title" | "description" | "privacy" | "defaultTime"
>;

export interface BroadcastRecord {
  id: string;
  userId: string;
  templateId: string | null;
  videoId: string;
  broadcastId: string;
  streamId: string | null;
  title: string;
  scheduledAt: string;
  privacy: PrivacyStatus;
  watchUrl: string;
  status: string;
  createdAt: string;
}

export type NewBroadcastRecord = Omit<BroadcastRecord, "id" | "createdAt">;

export interface UserRepo {
  findById(id: string): Promise<User | null>;
  findByGoogleSub(sub: string): Promise<User | null>;
  upsert(user: Omit<User, "createdAt">): Promise<User>;
}

export interface TemplateRepo {
  listByUser(userId: string): Promise<Template[]>;
  findById(id: string, userId: string): Promise<Template | null>;
  create(data: NewTemplate): Promise<Template>;
  update(
    id: string,
    userId: string,
    data: Partial<NewTemplate> & { thumbnailKey?: string },
  ): Promise<Template | null>;
  delete(id: string, userId: string): Promise<boolean>;
}

export interface BroadcastRepo {
  listByUser(userId: string): Promise<BroadcastRecord[]>;
  create(data: NewBroadcastRecord): Promise<BroadcastRecord>;
}

export interface ThumbnailStore {
  put(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ data: ArrayBuffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
}
