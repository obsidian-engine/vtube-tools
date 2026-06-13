// Google OAuth 2.0 フロー。refresh_token を確実に得るため
// access_type=offline + prompt=consent を付与する（Design-Doc §5.1）。

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SCOPES = ["https://www.googleapis.com/auth/youtube", "openid", "email", "profile"];

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

export function buildAuthUrl(config: GoogleOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUrl,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

function decodeIdToken(idToken: string): { sub: string; email: string; name: string | null } {
  const payloadPart = idToken.split(".")[1] ?? "";
  const b64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const payload = JSON.parse(json) as { sub: string; email: string; name?: string };
  return { sub: payload.sub, email: payload.email, name: payload.name ?? null };
}

export async function exchangeCode(
  config: GoogleOAuthConfig,
  code: string,
): Promise<{ refreshToken: string | null; sub: string; email: string; name: string | null }> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUrl,
      grant_type: "authorization_code",
      code,
    }),
  });
  const body = (await res.json()) as TokenResponse;
  if (!res.ok || !body.id_token) {
    throw new Error(`トークン交換に失敗しました: ${body.error_description ?? body.error ?? res.status}`);
  }
  const identity = decodeIdToken(body.id_token);
  return { refreshToken: body.refresh_token ?? null, ...identity };
}

export async function refreshAccessToken(
  config: GoogleOAuthConfig,
  refreshToken: string,
): Promise<string> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const body = (await res.json()) as TokenResponse;
  if (!res.ok || !body.access_token) {
    throw new Error(
      `アクセストークンの更新に失敗しました。再ログインしてください: ${body.error_description ?? body.error ?? res.status}`,
    );
  }
  return body.access_token;
}
