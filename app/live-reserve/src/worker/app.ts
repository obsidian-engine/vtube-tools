// Hono アプリ本体。依存（リポジトリ・YouTube クライアント・OAuth）は注入可能にし、
// テストではフェイクを使う（Design-Doc §5.3 テスト方針）。
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { signSession, verifySession } from "./auth/session";
import { createBroadcastWithStream } from "./broadcast/orchestrator";
import type { YouTubeClient, PrivacyStatus } from "./youtube/client";
import { YouTubeApiError } from "./youtube/client";
import type { BroadcastRepo, TemplateRepo, ThumbnailStore, User, UserRepo } from "./types";

export interface OAuthDeps {
  clientId: string;
  redirectUrl: string;
  buildAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<{
    refreshToken: string | null;
    sub: string;
    email: string;
    name: string | null;
  }>;
}

export interface AppDeps {
  repos: { users: UserRepo; templates: TemplateRepo; broadcasts: BroadcastRepo };
  thumbnails: ThumbnailStore;
  sessionSecret: string;
  getAccessToken(user: User): Promise<string>;
  youtubeClientFactory(accessToken: string): YouTubeClient;
  oauth: OAuthDeps;
}

type Vars = { user: User };

const PRIVACY_VALUES: PrivacyStatus[] = ["public", "unlisted", "private"];

function isPrivacy(v: unknown): v is PrivacyStatus {
  return typeof v === "string" && (PRIVACY_VALUES as string[]).includes(v);
}

export function createApp(deps: AppDeps) {
  const app = new Hono<{ Variables: Vars }>();

  // --- 認証ルート（ガード不要） ---

  app.get("/api/auth/login", (c) => {
    const state = crypto.randomUUID();
    setCookie(c, "oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 600,
    });
    return c.redirect(deps.oauth.buildAuthUrl(state));
  });

  app.get("/api/auth/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const savedState = getCookie(c, "oauth_state");
    if (!code || !state || !savedState || state !== savedState) {
      return c.json({ error: "OAuth state の検証に失敗しました" }, 400);
    }
    deleteCookie(c, "oauth_state", { path: "/" });

    const result = await deps.oauth.exchangeCode(code);
    if (!result.refreshToken) {
      return c.json(
        { error: "refresh_token が取得できませんでした。再度ログインしてください" },
        400,
      );
    }

    const user = await deps.repos.users.upsert({
      id: crypto.randomUUID(),
      googleSub: result.sub,
      email: result.email,
      displayName: result.name,
      encryptedRefreshToken: result.refreshToken, // 呼び出し側で暗号化済みの値を渡す
    });

    setCookie(c, "session", await signSession(user.id, deps.sessionSecret), {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return c.redirect("/");
  });

  app.post("/api/auth/logout", (c) => {
    deleteCookie(c, "session", { path: "/" });
    return c.json({ ok: true });
  });

  // --- 認証ミドルウェア ---

  app.use("/api/*", async (c, next) => {
    const token = getCookie(c, "session");
    const userId = token ? await verifySession(token, deps.sessionSecret) : null;
    const user = userId ? await deps.repos.users.findById(userId) : null;
    if (!user) return c.json({ error: "ログインが必要です" }, 401);
    c.set("user", user);
    await next();
  });

  app.get("/api/me", (c) => {
    const user = c.get("user");
    return c.json({ id: user.id, email: user.email, displayName: user.displayName });
  });

  // --- テンプレート CRUD ---

  app.get("/api/templates", async (c) => {
    return c.json(await deps.repos.templates.listByUser(c.get("user").id));
  });

  app.post("/api/templates", async (c) => {
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!body || typeof body.title !== "string" || !body.title.trim()) {
      return c.json({ error: "title は必須です" }, 400);
    }
    if (!isPrivacy(body.privacy)) {
      return c.json({ error: "privacy は public / unlisted / private のいずれかです" }, 400);
    }
    const template = await deps.repos.templates.create({
      userId: c.get("user").id,
      name: typeof body.name === "string" && body.name.trim() ? body.name : body.title,
      title: body.title,
      description: typeof body.description === "string" ? body.description : "",
      privacy: body.privacy,
    });
    return c.json(template, 201);
  });

  app.put("/api/templates/:id", async (c) => {
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!body) return c.json({ error: "リクエストボディが不正です" }, 400);
    if (body.privacy !== undefined && !isPrivacy(body.privacy)) {
      return c.json({ error: "privacy は public / unlisted / private のいずれかです" }, 400);
    }
    const updated = await deps.repos.templates.update(c.req.param("id"), c.get("user").id, {
      ...(typeof body.name === "string" ? { name: body.name } : {}),
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      ...(typeof body.description === "string" ? { description: body.description } : {}),
      ...(isPrivacy(body.privacy) ? { privacy: body.privacy } : {}),
    });
    if (!updated) return c.json({ error: "テンプレートが見つかりません" }, 404);
    return c.json(updated);
  });

  app.delete("/api/templates/:id", async (c) => {
    const ok = await deps.repos.templates.delete(c.req.param("id"), c.get("user").id);
    if (!ok) return c.json({ error: "テンプレートが見つかりません" }, 404);
    return c.body(null, 204);
  });

  app.post("/api/templates/:id/thumbnail", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const template = await deps.repos.templates.findById(id, user.id);
    if (!template) return c.json({ error: "テンプレートが見つかりません" }, 404);

    const contentType = c.req.header("Content-Type") ?? "";
    if (!contentType.startsWith("image/")) {
      return c.json({ error: "画像ファイルをアップロードしてください" }, 400);
    }
    const data = await c.req.arrayBuffer();
    const key = `thumbnails/${user.id}/${id}`;
    await deps.thumbnails.put(key, data, contentType);
    const updated = await deps.repos.templates.update(id, user.id, { thumbnailKey: key });
    return c.json(updated);
  });

  // --- 配信予約 ---

  app.get("/api/broadcasts", async (c) => {
    return c.json(await deps.repos.broadcasts.listByUser(c.get("user").id));
  });

  app.post("/api/broadcasts", async (c) => {
    const user = c.get("user");
    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!body || typeof body.scheduledAt !== "string" || !body.scheduledAt) {
      return c.json({ error: "scheduledAt は必須です" }, 400);
    }
    if (typeof body.templateId !== "string" || !body.templateId) {
      return c.json({ error: "templateId は必須です" }, 400);
    }
    const template = await deps.repos.templates.findById(body.templateId, user.id);
    if (!template) return c.json({ error: "テンプレートが見つかりません" }, 404);

    const thumbnail = template.thumbnailKey
      ? await deps.thumbnails.get(template.thumbnailKey)
      : null;

    try {
      const accessToken = await deps.getAccessToken(user);
      const yt = deps.youtubeClientFactory(accessToken);
      const result = await createBroadcastWithStream(yt, {
        title: template.title,
        description: template.description,
        privacyStatus: template.privacy,
        scheduledStartTime: body.scheduledAt,
        ...(thumbnail ? { thumbnail: { data: thumbnail.data, contentType: thumbnail.contentType } } : {}),
      });

      const record = await deps.repos.broadcasts.create({
        userId: user.id,
        templateId: template.id,
        videoId: result.videoId,
        broadcastId: result.broadcastId,
        streamId: result.streamId,
        title: template.title,
        scheduledAt: body.scheduledAt,
        privacy: template.privacy,
        watchUrl: result.watchUrl,
        status: "created",
      });

      return c.json({ ...result, id: record.id }, 201);
    } catch (err) {
      const message =
        err instanceof YouTubeApiError || err instanceof Error ? err.message : String(err);
      console.error("broadcast creation failed", { userId: user.id, error: message });
      return c.json({ error: `配信予約の作成に失敗しました: ${message}` }, 502);
    }
  });

  return app;
}
