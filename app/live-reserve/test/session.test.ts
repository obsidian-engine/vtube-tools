import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "../src/worker/auth/session";

describe("signSession / verifySession", () => {
  const secret = "test-session-secret";

  it("署名→検証で userId が取り出せる", async () => {
    const token = await signSession("user-123", secret);
    expect(await verifySession(token, secret)).toBe("user-123");
  });

  it("改ざんされたトークン（payload差し替え）は null", async () => {
    const token = await signSession("user-123", secret);
    const otherToken = await signSession("user-999", secret);
    // user-999 の payload に user-123 の署名を付けたトークンは検証に失敗する
    const tampered = `${otherToken.split(".")[0]}.${token.split(".")[1]}`;
    expect(await verifySession(tampered, secret)).toBeNull();
  });

  it("異なるシークレットでは null", async () => {
    const token = await signSession("user-123", secret);
    expect(await verifySession(token, "other-secret")).toBeNull();
  });

  it("形式不正のトークンは null", async () => {
    expect(await verifySession("garbage", secret)).toBeNull();
    expect(await verifySession("", secret)).toBeNull();
  });
});
