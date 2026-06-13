// HMAC-SHA256 で署名したステートレスセッショントークン。
// 形式: base64url(userId) + "." + base64url(signature)

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(userId: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const payload = new TextEncoder().encode(userId);
  const sig = await crypto.subtle.sign("HMAC", key, payload);
  return `${toBase64Url(payload)}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySession(token: string, secret: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const payload = fromBase64Url(parts[0]);
    const sig = fromBase64Url(parts[1]);
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, sig as BufferSource, payload as BufferSource);
    return valid ? new TextDecoder().decode(payload) : null;
  } catch {
    return null;
  }
}
