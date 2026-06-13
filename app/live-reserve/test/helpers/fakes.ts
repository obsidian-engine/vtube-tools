// テスト用のインメモリ実装。プロダクションは D1 / R2 実装（src/worker/db, src/worker/lib/r2.ts）。
import type {
  User,
  Template,
  BroadcastRecord,
  UserRepo,
  TemplateRepo,
  BroadcastRepo,
  ThumbnailStore,
  NewTemplate,
  NewBroadcastRecord,
} from "../../src/worker/types";

export class InMemoryUserRepo implements UserRepo {
  private users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByGoogleSub(sub: string): Promise<User | null> {
    for (const u of this.users.values()) if (u.googleSub === sub) return u;
    return null;
  }

  async upsert(user: Omit<User, "createdAt">): Promise<User> {
    const existing = await this.findByGoogleSub(user.googleSub);
    const saved: User = {
      ...user,
      id: existing?.id ?? user.id,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    this.users.set(saved.id, saved);
    return saved;
  }
}

export class InMemoryTemplateRepo implements TemplateRepo {
  private templates = new Map<string, Template>();
  private seq = 0;

  async listByUser(userId: string): Promise<Template[]> {
    return [...this.templates.values()].filter((t) => t.userId === userId);
  }

  async findById(id: string, userId: string): Promise<Template | null> {
    const t = this.templates.get(id);
    return t && t.userId === userId ? t : null;
  }

  async create(data: NewTemplate): Promise<Template> {
    const now = new Date().toISOString();
    const t: Template = {
      id: `tpl-${++this.seq}`,
      thumbnailKey: null,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.templates.set(t.id, t);
    return t;
  }

  async update(
    id: string,
    userId: string,
    data: Partial<NewTemplate> & { thumbnailKey?: string },
  ): Promise<Template | null> {
    const t = await this.findById(id, userId);
    if (!t) return null;
    const updated: Template = { ...t, ...data, updatedAt: new Date().toISOString() };
    this.templates.set(id, updated);
    return updated;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const t = await this.findById(id, userId);
    if (!t) return false;
    this.templates.delete(id);
    return true;
  }
}

export class InMemoryBroadcastRepo implements BroadcastRepo {
  private records: BroadcastRecord[] = [];
  private seq = 0;

  async listByUser(userId: string): Promise<BroadcastRecord[]> {
    return this.records.filter((b) => b.userId === userId);
  }

  async create(data: NewBroadcastRecord): Promise<BroadcastRecord> {
    const rec: BroadcastRecord = {
      id: `bc-${++this.seq}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.records.push(rec);
    return rec;
  }
}

export class InMemoryThumbnailStore implements ThumbnailStore {
  private store = new Map<string, { data: ArrayBuffer; contentType: string }>();

  async put(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
    this.store.set(key, { data, contentType });
  }

  async get(key: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
    return this.store.get(key) ?? null;
  }
}
