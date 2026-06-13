// タイトルの変数展開（PRD 将来機能）。カード配置時にクライアント側で展開し、
// 確定したタイトルをサーバへ送る。
//
// 対応変数:
//   {{date}}    → YYYY/MM/DD
//   {{month}}   → 月（ゼロ埋めなし）
//   {{day}}     → 日（ゼロ埋めなし）
//   {{weekday}} → 日本語曜日（日〜土）
//   {{round}}   → 節数（未指定なら空文字）
// 未知の変数はそのまま残す。

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

export interface TitleContext {
  date: Date;
  round?: number;
}

export function expandTitle(template: string, ctx: TitleContext): string {
  const y = ctx.date.getFullYear();
  const m = ctx.date.getMonth() + 1;
  const d = ctx.date.getDate();
  const pad = (n: number) => String(n).padStart(2, "0");

  const values: Record<string, string> = {
    date: `${y}/${pad(m)}/${pad(d)}`,
    month: String(m),
    day: String(d),
    weekday: WEEKDAYS_JA[ctx.date.getDay()]!,
    round: ctx.round !== undefined ? String(ctx.round) : "",
  };

  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
    name in values ? values[name]! : whole,
  );
}
