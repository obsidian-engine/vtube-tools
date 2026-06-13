import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp, type AppDeps } from "../src/worker/app";
import { signSession } from "../src/worker/auth/session";
import {
  InMemoryUserRepo,
  InMemoryTemplateRepo,
  InMemoryBroadcastRepo,
  InMemoryThumbnailStore,
} from "./helpers/fakes";
import type { YouTubeClient } from "../src/worker/youtube/client";

const SESSION_SECRET = "test-session-secret";

function makeMockYouTube(): YouTubeClient {
  let n = 0;
  return {
    insertBroadcast: vi.fn().mockImplementation(async () => {
      n += 1;
      return { broadcastId: `bcast-${n}`, videoId: `video-${n}` };
    }),
    insertStream: vi.fn().mockResolvedValue({
      streamId: "stream-1",
      streamKey: "key-abc",
      ingestionAddress: "rtmp://a.rtmp.youtube.com/live2",
    }),
    bind: vi.fn().mockResolvedValue(undefined),
    setThumbnail: vi.fn().mockResolvedValue(undefined),
    deleteBroadcast: vi.fn().mockResolvedValue(undefined),
  };
}

describe("一括予約 / ステージングサムネ", () => {
  let deps: AppDeps;
  let users: InMemoryUserRepo;
  let templates: InMemoryTemplateRepo;
  let broadcasts: InMemoryBroadcastRepo;
  let thumbnails: InMemoryThumbnailStore;
  let yt: YouTubeClient;
  let app: ReturnType<typeof createApp>;
  let cookie: string;
  let templateId: string;

  async function createTemplate(extra: Record<string, unknown> = {}): Promise<string> {
    const res = await app.request("/api/templates", {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "毎週配信", title: "【ゲーム】配信", description: "概要", privacy: "private", ...extra }),
    });
    return ((await res.json()) as { id: string }).id;
  }

  beforeEach(async () => {
    users = new InMemoryUserRepo();
    templates = new InMemoryTemplateRepo();
    broadcasts = new InMemoryBroadcastRepo();
    thumbnails = new InMemoryThumbnailStore();
    yt = makeMockYouTube();
    deps = {
      repos: { users, templates, broadcasts },
      thumbnails,
      sessionSecret: SESSION_SECRET,
      getAccessToken: vi.fn().mockResolvedValue("access-token"),
      youtubeClientFactory: vi.fn().mockReturnValue(yt),
      oauth: {
        clientId: "client-id",
        redirectUrl: "http://localhost/api/auth/callback",
        buildAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?x=1"),
        exchangeCode: vi.fn(),
      },
    };
    app = createApp(deps);
    await users.upsert({
      id: "user-1",
      googleSub: "sub-1",
      email: "user@example.com",
      displayName: "User One",
      encryptedRefreshToken: "enc",
    });
    cookie = `session=${await signSession("user-1", SESSION_SECRET)}`;
    templateId = await createTemplate();
  });

  describe("POST /api/thumbnails/staging", () => {
    it("画像をstaging保存し userId プレフィックスのkeyを返す", async () => {
      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const res = await app.request("/api/thumbnails/staging", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "image/png" },
        body: png,
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { key: string; id: string };
      expect(body.key).toMatch(/^staging\/user-1\//);
      expect(body.id).toBeTruthy();
      expect(await thumbnails.get(body.key)).not.toBeNull();
    });

    it("非画像は400", async () => {
      const res = await app.request("/api/thumbnails/staging", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "text/plain" },
        body: "hello",
      });
      expect(res.status).toBe(400);
    });

    it("未ログインは401", async () => {
      const res = await app.request("/api/thumbnails/staging", {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: new Uint8Array([1]),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/thumbnails/staging/:id", () => {
    it("所有者は画像を取得できる", async () => {
      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const up = (await (
        await app.request("/api/thumbnails/staging", {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "image/png" },
          body: png,
        })
      ).json()) as { id: string };

      const res = await app.request(`/api/thumbnails/staging/${up.id}`, { headers: { Cookie: cookie } });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
    });

    it("存在しないidは404", async () => {
      const res = await app.request("/api/thumbnails/staging/nope", { headers: { Cookie: cookie } });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/broadcasts/bulk", () => {
    it("全件成功し、件数分のbroadcastを記録、各itemのtitle/日時が反映される", async () => {
      const items = [
        { templateId, scheduledAt: "2026-06-21T12:00:00Z", title: "第1節" },
        { templateId, scheduledAt: "2026-06-28T12:00:00Z", title: "第2節" },
      ];
      const res = await app.request("/api/broadcasts/bulk", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { results: { index: number; ok: boolean; watchUrl?: string }[] };
      expect(body.results).toHaveLength(2);
      expect(body.results.every((r) => r.ok)).toBe(true);

      const list = (await (await app.request("/api/broadcasts", { headers: { Cookie: cookie } })).json()) as {
        title: string;
        scheduledAt: string;
      }[];
      expect(list).toHaveLength(2);
      expect(new Set(list.map((b) => b.title))).toEqual(new Set(["第1節", "第2節"]));

      // YouTubeクライアントは1回だけ生成され使い回される
      expect(deps.youtubeClientFactory).toHaveBeenCalledTimes(1);
    });

    it("title未指定はテンプレのtitleを使う", async () => {
      const res = await app.request("/api/broadcasts/bulk", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ templateId, scheduledAt: "2026-06-21T12:00:00Z" }] }),
      });
      expect(res.status).toBe(200);
      expect(yt.insertBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "【ゲーム】配信", description: "概要", privacyStatus: "private" }),
      );
    });

    it("1件失敗しても他は継続し、成功分のみ記録（部分失敗）", async () => {
      (yt.insertBroadcast as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ broadcastId: "b1", videoId: "v1" })
        .mockRejectedValueOnce(new Error("quota exceeded"))
        .mockResolvedValueOnce({ broadcastId: "b3", videoId: "v3" });

      const items = [
        { templateId, scheduledAt: "2026-06-21T12:00:00Z" },
        { templateId, scheduledAt: "2026-06-22T12:00:00Z" },
        { templateId, scheduledAt: "2026-06-23T12:00:00Z" },
      ];
      const res = await app.request("/api/broadcasts/bulk", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { results: { index: number; ok: boolean; error?: string }[] };
      expect(body.results.map((r) => r.ok)).toEqual([true, false, true]);
      expect(body.results[1]!.error).toContain("quota exceeded");

      const list = (await (await app.request("/api/broadcasts", { headers: { Cookie: cookie } })).json()) as unknown[];
      expect(list).toHaveLength(2);
    });

    it("行ごとのthumbnailKey（staging）がsetThumbnailに渡る", async () => {
      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const up = (await (
        await app.request("/api/thumbnails/staging", {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "image/png" },
          body: png,
        })
      ).json()) as { key: string };

      const res = await app.request("/api/broadcasts/bulk", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ templateId, scheduledAt: "2026-06-21T12:00:00Z", thumbnailKey: up.key }] }),
      });
      expect(res.status).toBe(200);
      expect(yt.setThumbnail).toHaveBeenCalledWith("video-1", expect.anything(), "image/png");
      // 消費済みstagingは削除される
      expect(await thumbnails.get(up.key)).toBeNull();
    });

    it("他ユーザーのthumbnailKeyは拒否（所有ガード）", async () => {
      const res = await app.request("/api/broadcasts/bulk", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ templateId, scheduledAt: "2026-06-21T12:00:00Z", thumbnailKey: "staging/user-2/abc" }],
        }),
      });
      expect(res.status).toBe(400);
    });

    it("0件は400", async () => {
      const res = await app.request("/api/broadcasts/bulk", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      });
      expect(res.status).toBe(400);
    });

    it("13件以上は400", async () => {
      const items = Array.from({ length: 13 }, () => ({ templateId, scheduledAt: "2026-06-21T12:00:00Z" }));
      const res = await app.request("/api/broadcasts/bulk", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      expect(res.status).toBe(400);
    });

    it("存在しないテンプレートのitemはその行だけ失敗", async () => {
      const res = await app.request("/api/broadcasts/bulk", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { templateId, scheduledAt: "2026-06-21T12:00:00Z" },
            { templateId: "nope", scheduledAt: "2026-06-22T12:00:00Z" },
          ],
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { results: { ok: boolean }[] };
      expect(body.results.map((r) => r.ok)).toEqual([true, false]);
    });

    it("未ログインは401", async () => {
      const res = await app.request("/api/broadcasts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ templateId, scheduledAt: "2026-06-21T12:00:00Z" }] }),
      });
      expect(res.status).toBe(401);
    });
  });
});
