import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadDraft, saveDraft, clearDraft, type BulkDraft } from "../src/web/lib/draft";

// jsdom 無しの node 環境用に localStorage を最小スタブ
class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

const sampleDraft: BulkDraft = {
  weekStartISO: "2026-06-22",
  startRound: 1,
  defaultTime: "21:00",
  cards: [
    {
      localId: "c1",
      templateId: "tpl-1",
      dateISO: "2026-06-22",
      time: "21:00",
      title: "第1節",
      description: "概要",
      privacy: "private",
      thumbnailKey: null,
      thumbnailId: null,
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
});

describe("draft（下書き永続化）", () => {
  it("保存→読込で往復する", () => {
    saveDraft(sampleDraft);
    expect(loadDraft()).toEqual(sampleDraft);
  });

  it("未保存なら null", () => {
    expect(loadDraft()).toBeNull();
  });

  it("clearDraft で消える", () => {
    saveDraft(sampleDraft);
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it("不正なJSONは null（壊れたデータを無視）", () => {
    localStorage.setItem("livereserve:bulk-draft:v1", "{not json");
    expect(loadDraft()).toBeNull();
  });

  it("バージョン不一致は null", () => {
    localStorage.setItem(
      "livereserve:bulk-draft:v1",
      JSON.stringify({ version: 999, draft: sampleDraft }),
    );
    expect(loadDraft()).toBeNull();
  });
});
