// 一括予約の下書きを localStorage に永続化する。画面を閉じても復元できる。
// サムネ実体は R2 staging 側にあり、ここでは key/id 参照のみ保持する。

import type { PrivacyStatus } from "../../worker/youtube/client";

const STORAGE_KEY = "livereserve:bulk-draft:v1";
const VERSION = 1;

export interface DraftCard {
  localId: string;
  templateId: string;
  dateISO: string; // YYYY-MM-DD
  time: string; // HH:mm
  title: string;
  description: string;
  privacy: PrivacyStatus;
  thumbnailKey: string | null; // staging/{userId}/{id} or テンプレ既定 or null
  thumbnailId: string | null; // staging id（プレビュー取得用）
}

export interface BulkDraft {
  weekStartISO: string; // YYYY-MM-DD（週の開始＝月曜）
  startRound: number;
  defaultTime: string; // HH:mm
  cards: DraftCard[];
}

export function saveDraft(draft: BulkDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, draft }));
  } catch {
    // 容量超過等は黙って無視（下書きはベストエフォート）
  }
}

export function loadDraft(): BulkDraft | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { version?: number; draft?: BulkDraft };
    if (parsed.version !== VERSION || !parsed.draft) return null;
    return parsed.draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  localStorage.removeItem(STORAGE_KEY);
}
