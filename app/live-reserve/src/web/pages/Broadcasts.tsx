import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import MonthCalendar from "../components/MonthCalendar";

interface Broadcast {
  id: string;
  title: string;
  scheduledAt: string;
  watchUrl: string;
  privacy: "public" | "unlisted" | "private";
}

const PRIVACY_LABELS = { public: "公開", unlisted: "限定公開", private: "非公開" } as const;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Broadcasts() {
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const { data: broadcasts = [], isLoading, error } = useQuery({
    queryKey: ["broadcasts"],
    queryFn: async () => (await apiFetch<Broadcast[]>("/api/broadcasts")) ?? [],
  });

  const toggleClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm transition-colors ${
      active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
    }`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">配信一覧</h2>
        <div className="flex gap-1 rounded-full bg-neutral-100 p-1">
          <button onClick={() => setView("calendar")} className={toggleClass(view === "calendar")}>
            カレンダー
          </button>
          <button onClick={() => setView("list")} className={toggleClass(view === "list")}>
            リスト
          </button>
        </div>
      </div>
      {error instanceof Error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error.message}</p>
      )}
      {isLoading ? (
        <p className="mt-4 text-sm text-neutral-400">読み込み中…</p>
      ) : view === "calendar" ? (
        <div className="mt-4">
          <MonthCalendar broadcasts={broadcasts ?? []} />
        </div>
      ) : broadcasts?.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">まだ配信予約がありません。</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {(broadcasts ?? []).map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{b.title}</p>
                <p className="mt-0.5 text-sm text-neutral-500">{formatDateTime(b.scheduledAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500">
                  {PRIVACY_LABELS[b.privacy]}
                </span>
                <a
                  href={b.watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  開く
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
