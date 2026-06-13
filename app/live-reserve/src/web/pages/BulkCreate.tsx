import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { apiFetch } from "../lib/api";
import type { Template } from "./Templates";
import { loadDraft, saveDraft, clearDraft, type BulkDraft, type DraftCard } from "../lib/draft";
import { expandTitle } from "../lib/template-vars";
import { startOfWeekMonday, toISODate, addDays, fromISODate } from "../lib/calendar";
import TemplatePalette from "../components/TemplatePalette";
import WeekBoard from "../components/WeekBoard";
import CardEditor from "../components/CardEditor";

// バックエンドの MAX_BULK_ITEMS (worker/app.ts) と一致させる。
// 超過するとバッチ全体が 400 になるため、UI 側で追加を抑止する。
const MAX_BULK = 6;

function emptyDraft(): BulkDraft {
  return {
    weekStartISO: toISODate(startOfWeekMonday(new Date())),
    startRound: 1,
    defaultTime: "21:00",
    cards: [],
  };
}

interface ItemResult {
  index: number;
  ok: boolean;
  watchUrl?: string;
  error?: string;
}

export default function BulkCreate() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<BulkDraft>(() => loadDraft() ?? emptyDraft());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ItemResult[] | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await apiFetch<Template[]>("/api/templates")) ?? [],
  });

  // デバウンス自動保存
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft(draft);
      setSavedAt(Date.now());
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );

  function templateById(id: string): Template | undefined {
    return templates.find((t) => t.id === id);
  }

  function placeCard(templateId: string, dateISO: string) {
    const template = templateById(templateId);
    if (!template) return;
    if (draft.cards.length >= MAX_BULK) return;
    const round = draft.startRound + draft.cards.length;
    const date = fromISODate(dateISO);
    const card: DraftCard = {
      localId: crypto.randomUUID(),
      templateId,
      dateISO,
      // テンプレに既定時刻があれば優先。無ければボード既定にフォールバック。
      time: template.defaultTime ?? draft.defaultTime,
      title: expandTitle(template.title, { date, round }),
      description: template.description,
      privacy: template.privacy,
      thumbnailKey: null,
      thumbnailId: null,
    };
    setDraft((d) => ({ ...d, cards: [...d.cards, card] }));
  }

  function handleDragEnd(e: DragEndEvent) {
    const activeData = e.active.data.current;
    const overData = e.over?.data.current;
    if (activeData?.type === "template" && overData?.type === "day") {
      placeCard(activeData.templateId as string, overData.dateISO as string);
    }
  }

  function handleTapDay(dateISO: string) {
    if (!selectedTemplateId) return;
    placeCard(selectedTemplateId, dateISO);
  }

  function updateCard(localId: string, patch: Partial<DraftCard>) {
    setDraft((d) => ({
      ...d,
      cards: d.cards.map((c) => (c.localId === localId ? { ...c, ...patch } : c)),
    }));
  }

  function removeCard(localId: string) {
    setDraft((d) => ({ ...d, cards: d.cards.filter((c) => c.localId !== localId) }));
    setEditingId(null);
  }

  function shiftWeek(deltaWeeks: number) {
    setDraft((d) => ({
      ...d,
      weekStartISO: toISODate(addDays(fromISODate(d.weekStartISO), deltaWeeks * 7)),
    }));
  }

  async function submit() {
    setSubmitting(true);
    setResults(null);
    try {
      const items = draft.cards.map((c) => ({
        templateId: c.templateId,
        scheduledAt: new Date(`${c.dateISO}T${c.time}:00`).toISOString(),
        title: c.title,
        description: c.description,
        privacy: c.privacy,
        ...(c.thumbnailKey ? { thumbnailKey: c.thumbnailKey } : {}),
      }));
      const res = await apiFetch<{ results: ItemResult[] }>("/api/broadcasts/bulk", {
        method: "POST",
        json: { items },
      });
      const r = res?.results ?? [];
      setResults(r);
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });

      // 成功分は下書きから除去。失敗分は残して再実行可能にする。
      const failedIdx = new Set(r.filter((x) => !x.ok).map((x) => x.index));
      setDraft((d) => {
        const remaining = d.cards.filter((_, i) => failedIdx.has(i));
        const next = { ...d, cards: remaining };
        if (remaining.length === 0) clearDraft();
        else saveDraft(next);
        return next;
      });
    } catch (e) {
      setResults([{ index: -1, ok: false, error: e instanceof Error ? e.message : String(e) }]);
    } finally {
      setSubmitting(false);
    }
  }

  function discard() {
    clearDraft();
    setDraft(emptyDraft());
    setResults(null);
  }

  const editingCard = draft.cards.find((c) => c.localId === editingId) ?? null;
  const inputClass =
    "rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">一括予約</h2>
          <p className="mt-1 text-sm text-neutral-500">テンプレートを曜日に配置して1週間分まとめて作成。</p>
        </div>
        {savedAt && <span className="text-xs text-neutral-400">下書き保存済み</span>}
      </div>

      {/* 設定バー */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftWeek(-1)} className="rounded-full px-3 py-1.5 text-sm hover:bg-neutral-100">
            ← 前週
          </button>
          <span className="text-sm font-medium">{draft.weekStartISO} の週</span>
          <button onClick={() => shiftWeek(1)} className="rounded-full px-3 py-1.5 text-sm hover:bg-neutral-100">
            翌週 →
          </button>
        </div>
        <label className="flex flex-col text-xs text-neutral-400">
          既定時刻
          <input
            type="time"
            className={inputClass}
            value={draft.defaultTime}
            onChange={(e) => setDraft((d) => ({ ...d, defaultTime: e.target.value }))}
          />
        </label>
        <label className="flex flex-col text-xs text-neutral-400">
          開始の節数 {"{{round}}"}
          <input
            type="number"
            className={`${inputClass} w-24`}
            value={draft.startRound}
            onChange={(e) => setDraft((d) => ({ ...d, startRound: Number(e.target.value) || 0 }))}
          />
        </label>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <TemplatePalette
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId}
          />
          <WeekBoard
            weekStartISO={draft.weekStartISO}
            cards={draft.cards}
            onTapDay={handleTapDay}
            onCardClick={setEditingId}
          />
        </div>
      </DndContext>

      {/* 送信バー */}
      <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm text-neutral-500">
          {draft.cards.length} 件
          {draft.cards.length >= MAX_BULK && (
            <span className="ml-2 text-amber-600">（一度に作成できるのは {MAX_BULK} 件まで）</span>
          )}
        </div>
        <div className="flex gap-2">
          {draft.cards.length > 0 && (
            <button onClick={discard} className="rounded-full px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100">
              下書きを破棄
            </button>
          )}
          <button
            onClick={submit}
            disabled={submitting || draft.cards.length === 0}
            className="rounded-full bg-neutral-900 px-6 py-2 text-sm text-white hover:opacity-80 disabled:opacity-40"
          >
            {submitting ? "作成中…" : `${draft.cards.length} 件を予約作成`}
          </button>
        </div>
      </div>

      {results && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="font-medium">作成結果</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {results.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                {r.ok ? (
                  <>
                    <span className="text-green-600">✓</span>
                    {r.watchUrl && (
                      <a href={r.watchUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {r.watchUrl}
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-red-500">✗</span>
                    <span className="text-red-600">{r.error}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          {results.some((r) => !r.ok) && (
            <p className="mt-3 text-xs text-neutral-400">失敗した分は下書きに残っています。修正して再実行できます。</p>
          )}
        </section>
      )}

      {editingCard && (
        <CardEditor
          card={editingCard}
          onChange={(patch) => updateCard(editingCard.localId, patch)}
          onClose={() => setEditingId(null)}
          onRemove={() => removeCard(editingCard.localId)}
        />
      )}
    </div>
  );
}
