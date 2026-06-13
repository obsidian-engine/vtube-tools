import { describe, it, expect, vi, afterEach } from "vitest";
import { apiFetch, ApiError } from "../src/web/lib/api";

describe("apiFetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("JSON を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: "t1" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const data = await apiFetch<{ id: string }[]>("/api/templates");
    expect(data).toEqual([{ id: "t1" }]);
  });

  it("204 は null を返す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    expect(await apiFetch("/api/templates/t1", { method: "DELETE" })).toBeNull();
  });

  it("エラー時はサーバの error メッセージ付き ApiError を投げる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "テンプレートが見つかりません" }), { status: 404 }),
      ),
    );
    const err = await apiFetch("/api/templates/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).message).toBe("テンプレートが見つかりません");
  });

  it("401 は isUnauthorized が true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "ログインが必要です" }), { status: 401 }),
      ),
    );
    const err = await apiFetch("/api/me").catch((e: unknown) => e);
    expect((err as ApiError).isUnauthorized).toBe(true);
  });

  it("JSON ボディ指定時は Content-Type と stringify を行う", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/templates", { method: "POST", json: { title: "t" } });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ title: "t" }));
  });
});
