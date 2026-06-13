import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret, generateKeyString } from "../src/worker/lib/crypto";

describe("encryptSecret / decryptSecret", () => {
  const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 32 bytes hex

  it("暗号化→復号で元の平文に戻る", async () => {
    const plaintext = "refresh-token-XYZ";
    const encrypted = await encryptSecret(plaintext, key);
    const decrypted = await decryptSecret(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it("暗号文に平文が含まれない", async () => {
    const plaintext = "refresh-token-XYZ";
    const encrypted = await encryptSecret(plaintext, key);
    expect(encrypted).not.toContain(plaintext);
  });

  it("同じ平文でも毎回異なる暗号文になる（ランダムIV）", async () => {
    const a = await encryptSecret("same-value", key);
    const b = await encryptSecret("same-value", key);
    expect(a).not.toBe(b);
  });

  it("改ざんされた暗号文は復号に失敗する", async () => {
    const encrypted = await encryptSecret("secret", key);
    const tampered = encrypted.slice(0, -4) + (encrypted.endsWith("AAAA") ? "BBBB" : "AAAA");
    await expect(decryptSecret(tampered, key)).rejects.toThrow();
  });

  it("異なる鍵では復号に失敗する", async () => {
    const otherKey = "f".repeat(64);
    const encrypted = await encryptSecret("secret", key);
    await expect(decryptSecret(encrypted, otherKey)).rejects.toThrow();
  });

  it("不正な長さの鍵はエラー", async () => {
    await expect(encryptSecret("x", "tooshort")).rejects.toThrow(/key/i);
  });

  it("generateKeyString は64文字のhexを返す", () => {
    const k = generateKeyString();
    expect(k).toMatch(/^[0-9a-f]{64}$/);
  });
});
