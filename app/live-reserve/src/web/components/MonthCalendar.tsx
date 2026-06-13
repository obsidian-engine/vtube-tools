import { useState } from "react";
import { monthMatrix, toISODate } from "../lib/calendar";

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

export interface CalendarBroadcast {
  id: string;
  title: string;
  scheduledAt: string;
  watchUrl: string;
}

export default function MonthCalendar({ broadcasts }: { broadcasts: CalendarBroadcast[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month0, setMonth0] = useState(today.getMonth());
  const [selectedISO, setSelectedISO] = useState<string | null>(null);

  const byDay = new Map<string, CalendarBroadcast[]>();
  for (const b of broadcasts) {
    const iso = toISODate(new Date(b.scheduledAt));
    const arr = byDay.get(iso) ?? [];
    arr.push(b);
    byDay.set(iso, arr);
  }

  const weeks = monthMatrix(year, month0);
  const todayISO = toISODate(today);

  function shift(delta: number) {
    const m = month0 + delta;
    const d = new Date(year, m, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
    setSelectedISO(null);
  }

  const selected = selectedISO ? (byDay.get(selectedISO) ?? []) : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} className="rounded-full px-3 py-1.5 text-sm hover:bg-neutral-100">
          ← 前月
        </button>
        <span className="text-sm font-medium">
          {year}年{month0 + 1}月
        </span>
        <button onClick={() => shift(1)} className="rounded-full px-3 py-1.5 text-sm hover:bg-neutral-100">
          翌月 →
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="bg-neutral-50 py-1.5 text-xs text-neutral-400">
            {w}
          </div>
        ))}
        {weeks.flat().map((d) => {
          const iso = toISODate(d);
          const items = byDay.get(iso) ?? [];
          const inMonth = d.getMonth() === month0;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelectedISO(iso)}
              className={`flex min-h-16 flex-col items-stretch gap-0.5 p-1 text-left ${
                inMonth ? "bg-white" : "bg-neutral-50"
              } ${selectedISO === iso ? "ring-2 ring-neutral-900 ring-inset" : ""}`}
            >
              <span
                className={`text-[11px] ${
                  iso === todayISO
                    ? "font-bold text-neutral-900"
                    : inMonth
                      ? "text-neutral-500"
                      : "text-neutral-300"
                }`}
              >
                {d.getDate()}
              </span>
              {items.slice(0, 2).map((b) => (
                <span
                  key={b.id}
                  className="truncate rounded bg-neutral-900 px-1 py-0.5 text-[9px] leading-tight text-white"
                >
                  {b.title}
                </span>
              ))}
              {items.length > 2 && <span className="text-[9px] text-neutral-400">+{items.length - 2}</span>}
            </button>
          );
        })}
      </div>

      {selectedISO && (
        <div className="mt-4">
          <p className="text-sm font-medium">{selectedISO}</p>
          {selected.length === 0 ? (
            <p className="mt-1 text-sm text-neutral-400">この日の予約はありません。</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {selected.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <p className="text-xs text-neutral-400">
                      {new Date(b.scheduledAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <a href={b.watchUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                    開く
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
