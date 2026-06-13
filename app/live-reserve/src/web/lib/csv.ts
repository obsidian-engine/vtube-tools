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
  };
  error?: string;
}

const VALID_PRIVACY = new Set<string>(["public", "unlisted", "private"]);

/** ヘッダー行を検証し、各データ行をテンプレート入力に変換する。 */
export function parseTemplateCsv(text: string): { headerError?: string; rows: CsvTemplateRow[] } {
  const all = parseCsv(text);
  if (all.length === 0) return { rows: [] };

  const [headerRow, ...dataRows] = all;
  if (!headerRow) return { rows: [] };

  const expectedHeader = ["name", "title", "description", "privacy"];
  const actualHeader = headerRow.map((h) => h.trim());

  if (
    actualHeader.length !== expectedHeader.length ||
    actualHeader.some((h, i) => h !== expectedHeader[i])
  ) {
    return {
      headerError: `ヘッダーが正しくありません。expected: ${expectedHeader.join(",")}`,
      rows: [],
    };
  }

  const rows: CsvTemplateRow[] = dataRows.map((cols, idx) => {
    const lineNumber = idx + 2; // ヘッダーが1行目
    const [rawName = "", rawTitle = "", rawDescription = "", rawPrivacy = ""] = cols;

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

    return {
      lineNumber,
      ok: true,
      value: {
        name,
        title,
        description,
        privacy: privacy as "public" | "unlisted" | "private",
      },
    };
  });

  return { rows };
}
