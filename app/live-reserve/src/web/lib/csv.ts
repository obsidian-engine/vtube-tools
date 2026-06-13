/** RFC4180準拠の最小CSVパーサ。ダブルクォート・フィールド内カンマ/改行/"" エスケープに対応。 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const row: string[] = [];

    while (i < len) {
      let field = "";

      if (text[i] === '"') {
        // クォートフィールド
        i++;
        while (i < len) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              // "" エスケープ
              field += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
      } else {
        // 非クォートフィールド: カンマ・改行まで読む
        while (i < len && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i];
          i++;
        }
      }

      row.push(field);

      if (i < len && text[i] === ",") {
        i++;
        continue;
      }
      break;
    }

    // 行末のCRLF/LFを消費
    if (i < len && text[i] === "\r") i++;
    if (i < len && text[i] === "\n") i++;

    // 空行スキップ（フィールドが1つで空文字の場合）
    if (row.length === 1 && row[0] === "") continue;

    rows.push(row);
  }

  return rows;
}

export interface CsvTemplateRow {
  lineNumber: number;
  ok: boolean;
  value?: {
    name: string;
    title: string;
    description: string;
    privacy: "public" | "unlisted" | "private";
    defaultTime: string | null;
  };
  error?: string;
}

const VALID_PRIVACY = new Set<string>(["public", "unlisted", "private"]);

// "HH:MM"（00:00〜23:59）なら正規化、空欄・不正は null。
function parseCsvTime(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** ヘッダー行を検証し、各データ行をテンプレート入力に変換する。 */
export function parseTemplateCsv(text: string): { headerError?: string; rows: CsvTemplateRow[] } {
  const all = parseCsv(text);
  if (all.length === 0) return { rows: [] };

  const [headerRow, ...dataRows] = all;
  if (!headerRow) return { rows: [] };

  // 先頭4列は固定。5列目 time は任意（あれば各行の既定配信時刻として読む）。
  const requiredHeader = ["name", "title", "description", "privacy"];
  const actualHeader = headerRow.map((h) => h.trim());
  const hasTimeColumn = actualHeader.length === 5 && actualHeader[4] === "time";

  if (
    (actualHeader.length !== 4 && !hasTimeColumn) ||
    requiredHeader.some((h, i) => h !== actualHeader[i])
  ) {
    return {
      headerError: `ヘッダーが正しくありません。expected: ${requiredHeader.join(",")}（末尾に任意で ,time）`,
      rows: [],
    };
  }

  const rows: CsvTemplateRow[] = dataRows.map((cols, idx) => {
    const lineNumber = idx + 2; // ヘッダーが1行目
    const [rawName = "", rawTitle = "", rawDescription = "", rawPrivacy = "", rawTime = ""] = cols;

    const title = rawTitle.trim();
    if (!title) {
      return { lineNumber, ok: false, error: "title は必須です" };
    }

    const privacyRaw = rawPrivacy.trim();
    const privacy = privacyRaw === "" ? "private" : privacyRaw;
    if (!VALID_PRIVACY.has(privacy)) {
      return {
        lineNumber,
        ok: false,
        error: "privacy は public / unlisted / private のいずれかです",
      };
    }

    const name = rawName.trim() || title;
    const description = rawDescription; // 空文字もそのまま許容
    const defaultTime = hasTimeColumn ? parseCsvTime(rawTime) : null;

    return {
      lineNumber,
      ok: true,
      value: {
        name,
        title,
        description,
        privacy: privacy as "public" | "unlisted" | "private",
        defaultTime,
      },
    };
  });

  return { rows };
}
