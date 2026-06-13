import { describe, it, expect } from "vitest";
import {
  startOfWeekMonday,
  addDays,
  toISODate,
  weekDays,
  monthMatrix,
} from "../src/web/lib/calendar";

describe("calendar utils", () => {
  it("startOfWeekMonday: 日曜は前の月曜に丸める", () => {
    // 2026-06-21 は日曜 → 週開始は 2026-06-15(月)
    expect(toISODate(startOfWeekMonday(new Date(2026, 5, 21)))).toBe("2026-06-15");
    // 2026-06-15 は月曜 → そのまま
    expect(toISODate(startOfWeekMonday(new Date(2026, 5, 15)))).toBe("2026-06-15");
    // 2026-06-17 は水曜 → 2026-06-15
    expect(toISODate(startOfWeekMonday(new Date(2026, 5, 17)))).toBe("2026-06-15");
  });

  it("addDays: 月跨ぎ", () => {
    expect(toISODate(addDays(new Date(2026, 5, 30), 1))).toBe("2026-07-01");
  });

  it("toISODate: ローカル年月日でゼロ埋め", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("weekDays: 月曜開始の7日", () => {
    const days = weekDays("2026-06-15");
    expect(days.map(toISODate)).toEqual([
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21",
    ]);
  });

  it("monthMatrix: 月を含む週(月曜開始)の行列を返す", () => {
    // 2026年6月: 1日(月)〜30日(火)
    const weeks = monthMatrix(2026, 5);
    expect(weeks[0]!.map(toISODate)[0]).toBe("2026-06-01"); // 最初の週の月曜=6/1
    // 全週7日
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // 6/30 を含む
    const flat = weeks.flat().map(toISODate);
    expect(flat).toContain("2026-06-30");
  });
});
