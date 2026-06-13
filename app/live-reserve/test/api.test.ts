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
  return {
    insertBroadcast: vi.fn().mockResolvedValue({ broadcastId: "bcast-1", videoId: "video-1" }),
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

describe("API", () => {
  let deps: AppDeps;
  let users: InMemoryUserRepo;
  let templates: InMemoryTemplateRepo;
  let broadcasts: InMemoryBroadcastRepo;
  let thumbnails: InMemoryThumbnailStore;
  let yt: YouTubeClient;
  let app: ReturnType<typeof createApp>;
  let cookie: string;

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
      youtubeClientFactory: () => yt,
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
  });

  describe("認証ガード", () => {
    it("Cookie なしは 401", async () => {
      const res = await app.request("/api/templates");
      expect(res.status).toBe(401);
    });

    it("不正な Cookie は 401", async () => {
      const res = await app.request("/api/templates", {
        headers: { Cookie: "session=bad.token" },
      });
      expect(res.status).toBe(401);
    });

    it("GET /api/me はユーザー情報を返す", async () => {
      const res = await app.request("/api/me", { headers: { Cookie: cookie } });
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body).toEqual({ id: "user-1", email: "user@example.com", displayName: "User One" });
    });
  });

  describe("テンプレート CRUD", () => {
    it("POST → GET 一覧で作成したテンプレートが返る", async () => {
      const createRes = await app.request("/api/templates", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "毎週配信",
          title: "【ゲーム】定期配信",
          description: "概要欄",
          privacy: "private",
        }),
      });
      expect(createRes.status).toBe(201);
      const created = await createRes.json() as any;
      expect(created.id).toBeDefined();
      expect(created.title).toBe("【ゲーム】定期配信");

      const listRes = await app.request("/api/templates", { headers: { Cookie: cookie } });
      const list = await listRes.json() as any;
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe("毎週配信");
    });

    it("title 必須: 欠けると 400", async () => {
      const res = await app.request("/api/templates", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "x", description: "", privacy: "private" }),
      });
      expect(res.status).toBe(400);
    });

    it("privacy は public/unlisted/private のみ", async () => {
      const res = await app.request("/api/templates", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "x", title: "t", description: "", privacy: "invalid" }),
      });
      expect(res.status).toBe(400);
    });

    it("PUT で更新できる", async () => {
      const created = await (
        await app.request("/api/templates", {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "n", title: "t", description: "d", privacy: "private" }),
        })
      ).json() as any;

      const res = await app.request(`/api/templates/${created.id}`, {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "n2", title: "t2", description: "d2", privacy: "public" }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json() as any;
      expect(updated.title).toBe("t2");
      expect(updated.privacy).toBe("public");
    });

    it("DELETE で削除できる", async () => {
      const created = await (
        await app.request("/api/templates", {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "n", title: "t", description: "d", privacy: "private" }),
        })
      ).json() as any;

      const res = await app.request(`/api/templates/${created.id}`, {
        method: "DELETE",
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(204);

      const list = await (await app.request("/api/templates", { headers: { Cookie: cookie } })).json() as any;
      expect(list).toHaveLength(0);
    });

    it("他ユーザーのテンプレートは見えない・触れない", async () => {
      await users.upsert({
        id: "user-2",
        googleSub: "sub-2",
        email: "other@example.com",
        displayName: "Other",
        encryptedRefreshToken: "enc2",
      });
      const otherCookie = `session=${await signSession("user-2", SESSION_SECRET)}`;
      const created = await (
        await app.request("/api/templates", {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "n", title: "t", description: "d", privacy: "private" }),
        })
      ).json() as any;

      const listRes = await app.request("/api/templates", { headers: { Cookie: otherCookie } });
      expect(await listRes.json() as any).toHaveLength(0);

      const delRes = await app.request(`/api/templates/${created.id}`, {
        method: "DELETE",
        headers: { Cookie: otherCookie },
      });
      expect(delRes.status).toBe(404);
    });
  });

  describe("配信予約作成", () => {
    let templateId: string;

    beforeEach(async () => {
      const created = await (
        await app.request("/api/templates", {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "毎週配信",
            title: "【ゲーム】定期配信",
            description: "概要欄",
            privacy: "private",
          }),
        })
      ).json() as any;
      templateId = created.id;
    });

    it("POST /api/broadcasts: テンプレート+日時から予約を作成し URL と videoId を返す", async () => {
      const res = await app.request("/api/broadcasts", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, scheduledAt: "2026-06-20T12:00:00Z" }),
      });
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.videoId).toBe("video-1");
      expect(body.watchUrl).toBe("https://www.youtube.com/watch?v=video-1");
      expect(body.streamKey).toBe("key-abc");

      // YouTube にはテンプレートの内容が渡る
      expect(yt.insertBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "【ゲーム】定期配信",
          description: "概要欄",
          privacyStatus: "private",
          scheduledStartTime: "2026-06-20T12:00:00Z",
        }),
      );

      // DB に記録される
      const list = await (await app.request("/api/broadcasts", { headers: { Cookie: cookie } })).json() as any;
      expect(list).toHaveLength(1);
      expect(list[0].videoId).toBe("video-1");
      expect(list[0].title).toBe("【ゲーム】定期配信");
    });

    it("scheduledAt 欠落は 400", async () => {
      const res = await app.request("/api/broadcasts", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      expect(res.status).toBe(400);
    });

    it("存在しないテンプレートは 404", async () => {
      const res = await app.request("/api/broadcasts", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: "nope", scheduledAt: "2026-06-20T12:00:00Z" }),
      });
      expect(res.status).toBe(404);
    });

    it("YouTube API 失敗時は 502 とエラーメッセージを返し、DB に記録しない", async () => {
      (yt.insertBroadcast as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("quota exceeded"),
      );
      const res = await app.request("/api/broadcasts", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, scheduledAt: "2026-06-20T12:00:00Z" }),
      });
      expect(res.status).toBe(502);
      const body = await res.json() as any;
      expect(body.error).toContain("quota exceeded");

      const list = await (await app.request("/api/broadcasts", { headers: { Cookie: cookie } })).json() as any;
      expect(list).toHaveLength(0);
    });

    it("YouTube 作成後の DB 書き込み失敗時は broadcast を削除してロールバックし 502 を返す", async () => {
      vi.spyOn(broadcasts, "create").mockRejectedValue(new Error("D1 write failed"));
      const res = await app.request("/api/broadcasts", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, scheduledAt: "2026-06-20T12:00:00Z" }),
      });
      expect(res.status).toBe(502);
      // YouTube 側に枠が作られた後の失敗なので、作成済み broadcast を削除する
      expect(yt.deleteBroadcast).toHaveBeenCalledWith("bcast-1");
    });
  });

  describe("サムネイル", () => {
    it("POST /api/templates/:id/thumbnail で画像を保存し、予約作成時に setThumbnail に渡る", async () => {
      const created = await (
        await app.request("/api/templates", {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "n", title: "t", description: "d", privacy: "private" }),
        })
      ).json() as any;

      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const upRes = await app.request(`/api/templates/${created.id}/thumbnail`, {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "image/png" },
        body: png,
      });
      expect(upRes.status).toBe(200);

      await app.request("/api/broadcasts", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: created.id, scheduledAt: "2026-06-20T12:00:00Z" }),
      });
      expect(yt.setThumbnail).toHaveBeenCalledWith("video-1", expect.anything(), "image/png");
    });

    it("2MB を超えるサムネイルは 400 で弾く", async () => {
      const created = await (
        await app.request("/api/templates", {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "n", title: "t", description: "d", privacy: "private" }),
        })
      ).json() as any;

      const tooLarge = new Uint8Array(2 * 1024 * 1024 + 1);
      const res = await app.request(`/api/templates/${created.id}/thumbnail`, {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "image/png" },
        body: tooLarge,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("OAuth ルート", () => {
    it("GET /api/auth/login は Google 認可 URL へリダイレクト", async () => {
      const res = await app.request("/api/auth/login");
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toContain("accounts.google.com");
      // state が Cookie に保存される
      expect(res.headers.get("Set-Cookie")).toContain("oauth_state=");
    });

    it("POST /api/auth/logout はセッション Cookie を破棄", async () => {
      const res = await app.request("/api/auth/logout", {
        method: "POST",
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("Set-Cookie")).toMatch(/session=;|Max-Age=0/);
    });
  });
});
