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

// YouTube のサムネイル上限は 2MB。これを超えるボディは YouTube に渡す前に弾く。
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

// 一括作成の上限。Workers 無料枠の subrequest 上限(50/req)に収める。
// サムネ付き1配信あたりの subrequest（D1/R2 のバインディング I/O も上限にカウントされる）:
//   YouTube fetch 4回（insertBroadcast/insertStream/bind/setThumbnail）
//   + D1 findById 1 + R2 get 1 + D1 create 1 + R2 staging delete 1 = 8回。
// バッチ全体で getAccessToken のトークン更新 1回。8×6+1=49 ≤ 50。
const MAX_BULK_ITEMS = 6;

function isPrivacy(v: unknown): v is PrivacyStatus {
  return typeof v === "string" && (PRIVACY_VALUES as string[]).includes(v);
}

// 1配信の仕様（テンプレを既定にしつつ item で上書き可能）。
interface BroadcastSpec {
  templateId: string;
  scheduledAt: string;
  title: string;
  description: string;
  privacy: PrivacyStatus;
  thumbnail: { data: ArrayBuffer; contentType: string } | null;
}

interface OneBroadcastSuccess {
  ok: true;
  id: string;
  videoId: string;
  broadcastId: string;
  streamId: string;
  watchUrl: string;
  streamKey: string;
  ingestionAddress: string;
  thumbnailWarning?: string;
}

// 配信枠作成→DB保存→DB失敗時ロールバックの共通処理（単発・一括で共用）。
async function createOneBroadcast(
  deps: AppDeps,
  user: User,
  yt: YouTubeClient,
  spec: BroadcastSpec,
): Promise<OneBroadcastSuccess> {
  const result = await createBroadcastWithStream(yt, {
    title: spec.title,
    description: spec.description,
    privacyStatus: spec.privacy,
    scheduledStartTime: spec.scheduledAt,
    ...(spec.thumbnail ? { thumbnail: spec.thumbnail } : {}),
  });

  try {
    const record = await deps.repos.broadcasts.create({
      userId: user.id,
      templateId: spec.templateId,
      videoId: result.videoId,
      broadcastId: result.broadcastId,
      streamId: result.streamId,
      title: spec.title,
      scheduledAt: spec.scheduledAt,
      privacy: spec.privacy,
      watchUrl: result.watchUrl,
      status: "created",
    });
    return { ok: true, id: record.id, ...result };
  } catch (dbErr) {
    // YouTube 側は作成済みだが DB 記録に失敗した。枠が Studio にゴミとして残るため削除する。
    try {
      await yt.deleteBroadcast(result.broadcastId);
    } catch {
      // 元の DB エラーを優先して握りつぶす
    }
    throw dbErr;
  }
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
    const declaredLength = Number(c.req.header("Content-Length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_THUMBNAIL_BYTES) {
      return c.json({ error: "サムネイルは 2MB 以下にしてください" }, 400);
    }
    const data = await c.req.arrayBuffer();
    if (data.byteLength > MAX_THUMBNAIL_BYTES) {
      return c.json({ error: "サムネイルは 2MB 以下にしてください" }, 400);
    }
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
      const { ok: _ok, ...rest } = await createOneBroadcast(deps, user, yt, {
        templateId: template.id,
        scheduledAt: body.scheduledAt,
        title: template.title,
        description: template.description,
        privacy: template.privacy,
        thumbnail,
      });
      return c.json(rest, 201);
    } catch (err) {
      const message =
        err instanceof YouTubeApiError || err instanceof Error ? err.message : String(err);
      console.error("broadcast creation failed", { userId: user.id, error: message });
      return c.json({ error: `配信予約の作成に失敗しました: ${message}` }, 502);
    }
  });

  // --- 一括予約 ---

  app.post("/api/broadcasts/bulk", async (c) => {
    const user = c.get("user");
    const body = await c.req.json<{ items?: unknown }>().catch(() => null);
    const items = body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: "items は1件以上必要です" }, 400);
    }
    if (items.length > MAX_BULK_ITEMS) {
      return c.json({ error: `一度に作成できるのは ${MAX_BULK_ITEMS} 件までです` }, 400);
    }

    // 事前バリデーション: thumbnailKey の所有ガード（他ユーザーのオブジェクト読み出しを防ぐ）。
    for (const raw of items as Record<string, unknown>[]) {
      const key = raw.thumbnailKey;
      if (key !== undefined && key !== null) {
        if (typeof key !== "string" || !isOwnedThumbnailKey(key, user.id)) {
          return c.json({ error: "サムネイルの参照が不正です" }, 400);
        }
      }
    }

    const accessToken = await deps.getAccessToken(user);
    const yt = deps.youtubeClientFactory(accessToken);
    const consumedStagingKeys: string[] = [];

    const results = [];
    for (let index = 0; index < items.length; index++) {
      const raw = items[index] as Record<string, unknown>;
      try {
        if (typeof raw.templateId !== "string" || !raw.templateId) {
          throw new Error("templateId は必須です");
        }
        if (typeof raw.scheduledAt !== "string" || !raw.scheduledAt) {
          throw new Error("scheduledAt は必須です");
        }
        const template = await deps.repos.templates.findById(raw.templateId, user.id);
        if (!template) throw new Error("テンプレートが見つかりません");
        if (raw.privacy !== undefined && !isPrivacy(raw.privacy)) {
          throw new Error("privacy が不正です");
        }

        const thumbnailKey =
          typeof raw.thumbnailKey === "string" && raw.thumbnailKey
            ? raw.thumbnailKey
            : template.thumbnailKey;
        const thumbnail = thumbnailKey ? await deps.thumbnails.get(thumbnailKey) : null;
        if (thumbnailKey && thumbnailKey.startsWith("staging/")) {
          consumedStagingKeys.push(thumbnailKey);
        }

        const created = await createOneBroadcast(deps, user, yt, {
          templateId: template.id,
          scheduledAt: raw.scheduledAt,
          title: typeof raw.title === "string" && raw.title.trim() ? raw.title : template.title,
          description: typeof raw.description === "string" ? raw.description : template.description,
          privacy: isPrivacy(raw.privacy) ? raw.privacy : template.privacy,
          thumbnail,
        });
        const { ok: _ok, ...rest } = created;
        results.push({ index, ok: true, ...rest });
      } catch (err) {
        const message =
          err instanceof YouTubeApiError || err instanceof Error ? err.message : String(err);
        console.error("bulk broadcast item failed", { userId: user.id, index, error: message });
        results.push({ index, ok: false, error: message });
      }
    }

    // 消費済みの staging サムネはベストエフォートで削除（既に YouTube へ反映済み）。
    for (const key of consumedStagingKeys) {
      try {
        await deps.thumbnails.delete(key);
      } catch {
        // 孤児は R2 ライフサイクルで回収する想定
      }
    }

    return c.json({ results });
  });

  // --- サムネイル ステージング（一括予約の行ごとサムネ用） ---

  app.post("/api/thumbnails/staging", async (c) => {
    const user = c.get("user");
    const contentType = c.req.header("Content-Type") ?? "";
    if (!contentType.startsWith("image/")) {
      return c.json({ error: "画像ファイルをアップロードしてください" }, 400);
    }
    const declaredLength = Number(c.req.header("Content-Length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_THUMBNAIL_BYTES) {
      return c.json({ error: "サムネイルは 2MB 以下にしてください" }, 400);
    }
    const data = await c.req.arrayBuffer();
    if (data.byteLength > MAX_THUMBNAIL_BYTES) {
      return c.json({ error: "サムネイルは 2MB 以下にしてください" }, 400);
    }
    const id = crypto.randomUUID();
    const key = `staging/${user.id}/${id}`;
    await deps.thumbnails.put(key, data, contentType);
    return c.json({ id, key }, 201);
  });

  app.get("/api/thumbnails/staging/:id", async (c) => {
    const user = c.get("user");
    const key = `staging/${user.id}/${c.req.param("id")}`;
    const obj = await deps.thumbnails.get(key);
    if (!obj) return c.json({ error: "サムネイルが見つかりません" }, 404);
    return c.body(obj.data, 200, { "Content-Type": obj.contentType });
  });

  return app;
}

// thumbnailKey が当該ユーザーの所有領域（テンプレ or staging）かを検証する。
function isOwnedThumbnailKey(key: string, userId: string): boolean {
  return key.startsWith(`thumbnails/${userId}/`) || key.startsWith(`staging/${userId}/`);
}
