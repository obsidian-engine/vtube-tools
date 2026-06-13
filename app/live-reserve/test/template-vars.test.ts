import { describe, it, expect } from "vitest";
import { expandTitle } from "../src/web/lib/template-vars";

// 2026-06-21 は日曜日
const sunday = new Date("2026-06-21T12:00:00Z");

describe("expandTitle", () => {
  it("{{date}} は YYYY/MM/DD", () => {
    expect(expandTitle("配信【{{date}}】", { date: sunday })).toBe("配信【2026/06/21】");
  });

  it("{{month}} {{day}} はゼロ埋めなしの数値", () => {
    expect(expandTitle("{{month}}月{{day}}日", { date: sunday })).toBe("6月21日");
  });

  it("{{weekday}} は日本語曜日", () => {
    expect(expandTitle("{{weekday}}曜配信", { date: sunday })).toBe("日曜配信");
    expect(expandTitle("{{weekday}}", { date: new Date("2026-06-22T12:00:00Z") })).toBe("月");
  });

  it("{{round}} は数値に置換", () => {
    expect(expandTitle("第{{round}}節", { date: sunday, round: 12 })).toBe("第12節");
  });

  it("複数変数を同時に置換", () => {
    expect(expandTitle("【ゲーム】第{{round}}節【{{date}}】", { date: sunday, round: 3 })).toBe(
      "【ゲーム】第3節【2026/06/21】",
    );
  });

  it("round 未指定で {{round}} は空文字に置換", () => {
    expect(expandTitle("第{{round}}節", { date: sunday })).toBe("第節");
  });

  it("未知の変数は素通し", () => {
    expect(expandTitle("{{unknown}}", { date: sunday })).toBe("{{unknown}}");
  });

  it("ローカルタイムゾーンの日付で評価する（UTC深夜の取り違えがない）", () => {
    // タイムゾーン依存を避けるため、ローカルの年月日が使われることだけ確認
    const d = new Date(2026, 5, 21, 21, 0); // ローカル 2026-06-21 21:00
    expect(expandTitle("{{date}}", { date: d })).toBe("2026/06/21");
  });
});
