import { useDroppable } from "@dnd-kit/core";
import type { DraftCard } from "../lib/draft";
import { weekDays, toISODate } from "../lib/calendar";

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function DayCell({
  dateISO,
  label,
  dayNum,
  cards,
  onTapDay,
  onCardClick,
}: {
  dateISO: string;
  label: string;
  dayNum: number;
  cards: DraftCard[];
  onTapDay: (dateISO: string) => void;
  onCardClick: (localId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dateISO}`, data: { type: "day", dateISO } });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onTapDay(dateISO)}
      className={`flex min-h-36 flex-col gap-1.5 rounded-xl border p-2 transition-colors ${
        isOver ? "border-neutral-900 bg-neutral-100" : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <div className="flex items-baseline justify-between px-0.5">
        <span className="text-xs text-neutral-400">{label}</span>
        <span className="text-sm font-medium text-neutral-600">{dayNum}</span>
      </div>
      {cards.map((card) => (
        <button
          key={card.localId}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCardClick(card.localId);
          }}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-left hover:border-neutral-400"
        >
          <p className="truncate text-xs font-medium">{card.title || "（無題）"}</p>
          <p className="text-[10px] text-neutral-400">{card.time}</p>
        </button>
      ))}
    </div>
  );
}

export default function WeekBoard({
  weekStartISO,
  cards,
  onTapDay,
  onCardClick,
}: {
  weekStartISO: string;
  cards: DraftCard[];
  onTapDay: (dateISO: string) => void;
  onCardClick: (localId: string) => void;
}) {
  const days = weekDays(weekStartISO);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {days.map((d, i) => {
        const iso = toISODate(d);
        return (
          <DayCell
            key={iso}
            dateISO={iso}
            label={WEEKDAY_LABELS[i]!}
            dayNum={d.getDate()}
            cards={cards.filter((c) => c.dateISO === iso)}
            onTapDay={onTapDay}
            onCardClick={onCardClick}
          />
        );
      })}
    </div>
  );
}
