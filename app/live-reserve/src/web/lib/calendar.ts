// 週ボード・月カレンダー共通の日付ユーティリティ（すべてローカルタイムゾーン基準）。

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// 月曜始まりの週開始日に丸める。
export function startOfWeekMonday(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = r.getDay(); // 0=日..6=土
  const diff = (dow + 6) % 7; // 月曜からの経過日数
  return addDays(r, -diff);
}

// 週開始(YYYY-MM-DD, 月曜)から7日分。
export function weekDays(weekStartISO: string): Date[] {
  const start = fromISODate(weekStartISO);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// 指定月を含む、月曜始まりの週の配列（各週7日）。
export function monthMatrix(year: number, month0: number): Date[][] {
  const first = new Date(year, month0, 1);
  const gridStart = startOfWeekMonday(first);
  const weeks: Date[][] = [];
  let cursor = gridStart;
  // 月末を超える週まで埋める
  while (true) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
    weeks.push(week);
    const last = week[6]!;
    cursor = addDays(cursor, 7);
    if (last.getMonth() !== month0 && last > new Date(year, month0 + 1, 0)) break;
  }
  return weeks;
}
