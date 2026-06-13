import { describe, it, expect } from "vitest";
import { parseCsv, parseTemplateCsv } from "../src/web/lib/csv";

describe("parseCsv", () => {
  it("基本的な3行をparseする", () => {
    const input = "a,b,c\n1,2,3\n4,5,6";
    expect(parseCsv(input)).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("ダブルクォート内のカンマを無視する", () => {
    const input = `"hello, world",b,c`;
    expect(parseCsv(input)).toEqual([["hello, world", "b", "c"]]);
  });

  it("ダブルクォート内の改行を保持する", () => {
    const input = `"line1\nline2",b`;
    expect(parseCsv(input)).toEqual([["line1\nline2", "b"]]);
  });

  it('ダブルクォートのエスケープ("" → ")を処理する', () => {
    const input = `"say ""hello""",b`;
    expect(parseCsv(input)).toEqual([['say "hello"', "b"]]);
  });

  it("CRLFとLFを混在させてもparseできる", () => {
    const input = "a,b\r\n1,2\n3,4";
    expect(parseCsv(input)).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("末尾改行をスキップする", () => {
    const input = "a,b\n1,2\n";
    expect(parseCsv(input)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("空行をスキップする", () => {
    const input = "a,b\n\n1,2\n\n3,4";
    expect(parseCsv(input)).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("空文字列は空配列を返す", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseTemplateCsv", () => {
  const validHeader = "name,title,description,privacy";

  it("正常な行をparseする", () => {
    const input = `${validHeader}\nmy-template,My Title,概要,public`;
    const { headerError, rows } = parseTemplateCsv(input);
    expect(headerError).toBeUndefined();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row).toBeDefined();
    expect(row!.ok).toBe(true);
    expect(row!.value).toEqual({
      name: "my-template",
      title: "My Title",
      description: "概要",
      privacy: "public",
    });
    expect(row!.lineNumber).toBe(2);
  });

  it("ヘッダー不一致はheaderErrorを返しrowsは空", () => {
    const input = "wrong,header,cols,here\nval1,val2,val3,val4";
    const { headerError, rows } = parseTemplateCsv(input);
    expect(headerError).toBeDefined();
    expect(rows).toHaveLength(0);
  });

  it("ヘッダーの前後空白をtrimする", () => {
    const input = " name , title , description , privacy \n,My Title,,private";
    const { headerError } = parseTemplateCsv(input);
    expect(headerError).toBeUndefined();
  });

  it("title空欄の行はerrorを持つ", () => {
    const input = `${validHeader}\nmy-name,,概要,public`;
    const { rows } = parseTemplateCsv(input);
    const row = rows[0];
    expect(row).toBeDefined();
    expect(row!.ok).toBe(false);
    expect(row!.error).toContain("title");
  });

  it("privacy不正値の行はerrorを持つ", () => {
    const input = `${validHeader}\nmy-name,My Title,概要,secret`;
    const { rows } = parseTemplateCsv(input);
    const row = rows[0];
    expect(row).toBeDefined();
    expect(row!.ok).toBe(false);
    expect(row!.error).toContain("privacy");
  });

  it("privacy空欄はprivateをデフォルトにする", () => {
    const input = `${validHeader}\nmy-name,My Title,概要,`;
    const { rows } = parseTemplateCsv(input);
    const row = rows[0];
    expect(row).toBeDefined();
    expect(row!.ok).toBe(true);
    expect(row!.value?.privacy).toBe("private");
  });

  it("name空欄はtitleで代用する", () => {
    const input = `${validHeader}\n,My Title,概要,public`;
    const { rows } = parseTemplateCsv(input);
    const row = rows[0];
    expect(row).toBeDefined();
    expect(row!.ok).toBe(true);
    expect(row!.value?.name).toBe("My Title");
  });

  it("description空欄は空文字になる", () => {
    const input = `${validHeader}\nmy-name,My Title,,public`;
    const { rows } = parseTemplateCsv(input);
    const row = rows[0];
    expect(row).toBeDefined();
    expect(row!.ok).toBe(true);
    expect(row!.value?.description).toBe("");
  });

  it("データ0行はrows空でheaderErrorなし", () => {
    const input = validHeader;
    const { headerError, rows } = parseTemplateCsv(input);
    expect(headerError).toBeUndefined();
    expect(rows).toHaveLength(0);
  });

  it("複数行で一部失敗がpartialになる", () => {
    const input = `${validHeader}\ngood,Good Title,desc,public\nbad,,desc,public`;
    const { rows } = parseTemplateCsv(input);
    expect(rows).toHaveLength(2);
    const first = rows[0];
    const second = rows[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first!.ok).toBe(true);
    expect(second!.ok).toBe(false);
    expect(second!.lineNumber).toBe(3);
  });

  it("unlisted / privateも有効なprivacy値として扱う", () => {
    const input = `${validHeader}\nn1,T1,d,unlisted\nn2,T2,d,private`;
    const { rows } = parseTemplateCsv(input);
    const first = rows[0];
    const second = rows[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first!.value?.privacy).toBe("unlisted");
    expect(second!.value?.privacy).toBe("private");
  });
});
