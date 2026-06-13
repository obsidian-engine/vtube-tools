import { useState } from "react";
import type { DraftCard } from "../lib/draft";
import { apiFetch } from "../lib/api";

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-neutral-400 focus:outline-none";

export default function CardEditor({
  card,
  onChange,
  onClose,
  onRemove,
}: {
  card: DraftCard;
  onChange: (patch: Partial<DraftCard>) => void;
  onClose: () => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleThumbnail(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const res = await apiFetch<{ id: string; key: string }>("/api/thumbnails/staging", {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (res) onChange({ thumbnailKey: res.key, thumbnailId: res.id });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold tracking-tight">配信カードを編集</h3>
          <button onClick={onClose} className="text-sm text-neutral-400 hover:text-neutral-700">
            閉じる
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-neutral-400">タイトル</label>
            <input className={inputClass} value={card.title} onChange={(e) => onChange({ title: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-neutral-400">概要欄</label>
            <textarea
              className={`${inputClass} min-h-24`}
              value={card.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-neutral-400">日付</label>
              <input
                type="date"
                className={inputClass}
                value={card.dateISO}
                onChange={(e) => onChange({ dateISO: e.target.value })}
              />
            </div>
            <div className="w-28">
              <label className="text-xs text-neutral-400">時刻</label>
              <input
                type="time"
                className={inputClass}
                value={card.time}
                onChange={(e) => onChange({ time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-400">公開範囲</label>
            <select
              className={inputClass}
              value={card.privacy}
              onChange={(e) => onChange({ privacy: e.target.value as DraftCard["privacy"] })}
            >
              <option value="private">非公開</option>
              <option value="unlisted">限定公開</option>
              <option value="public">公開</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-neutral-400">サムネイル</label>
            <div className="mt-1 flex items-center gap-3">
              {card.thumbnailId ? (
                <img
                  src={`/api/thumbnails/staging/${card.thumbnailId}`}
                  alt="サムネイル"
                  className="h-14 w-24 rounded-lg border border-neutral-200 object-cover"
                />
              ) : (
                <span className="text-xs text-neutral-400">未設定（テンプレートのサムネを使用）</span>
              )}
              <label className="cursor-pointer rounded-full border border-neutral-200 px-3 py-1.5 text-xs hover:border-neutral-400">
                {uploading ? "アップロード中…" : "画像を選択"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleThumbnail(f);
                  }}
                />
              </label>
              {card.thumbnailId && (
                <button
                  type="button"
                  onClick={() => onChange({ thumbnailKey: null, thumbnailId: null })}
                  className="text-xs text-neutral-400 hover:text-neutral-700"
                >
                  解除
                </button>
              )}
            </div>
            {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button onClick={onRemove} className="rounded-full px-4 py-2 text-sm text-red-500 hover:bg-red-50">
            このカードを削除
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-neutral-900 px-6 py-2 text-sm text-white hover:opacity-80"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
}
