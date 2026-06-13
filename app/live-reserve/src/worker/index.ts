// Workers エントリポイント。env のバインディングから依存を組み立てて Hono アプリへ渡す。
import { createApp, type AppDeps } from "./app";
import { createDb, createUserRepo, createTemplateRepo, createBroadcastRepo } from "./db/repos";
import { createR2ThumbnailStore } from "./lib/r2";
import { encryptSecret, decryptSecret } from "./lib/crypto";
import { buildAuthUrl, exchangeCode, refreshAccessToken, type GoogleOAuthConfig } from "./auth/google";
import { createYouTubeClient } from "./youtube/client";

export interface Env {
  DB: D1Database;
  THUMBNAILS: R2Bucket;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  OAUTH_REDIRECT_URL: string;
  APP_ENCRYPTION_KEY: string;
  SESSION_SECRET: string;
}

function buildDeps(env: Env): AppDeps {
  const db = createDb(env.DB);
  const oauthConfig: GoogleOAuthConfig = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUrl: env.OAUTH_REDIRECT_URL,
  };

  return {
    repos: {
      users: createUserRepo(db),
      templates: createTemplateRepo(db),
      broadcasts: createBroadcastRepo(db),
    },
    thumbnails: createR2ThumbnailStore(env.THUMBNAILS),
    sessionSecret: env.SESSION_SECRET,
    async getAccessToken(user) {
      const refreshToken = await decryptSecret(user.encryptedRefreshToken, env.APP_ENCRYPTION_KEY);
      return refreshAccessToken(oauthConfig, refreshToken);
    },
    youtubeClientFactory: (accessToken) => createYouTubeClient(accessToken),
    oauth: {
      clientId: env.GOOGLE_CLIENT_ID,
      redirectUrl: env.OAUTH_REDIRECT_URL,
      buildAuthUrl: (state) => buildAuthUrl(oauthConfig, state),
      async exchangeCode(code) {
        const result = await exchangeCode(oauthConfig, code);
        return {
          ...result,
          refreshToken: result.refreshToken
            ? await encryptSecret(result.refreshToken, env.APP_ENCRYPTION_KEY)
            : null,
        };
      },
    },
  };
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const app = createApp(buildDeps(env));
    return app.fetch(request, env, ctx);
  },
};
