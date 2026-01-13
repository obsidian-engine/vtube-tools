/**
 * ExportService
 * テンプレートのエクスポート/インポート機能
 */

export class ExportService {
  /**
   * テンプレート配列をJSON文字列に変換
   */
  static exportTemplates(templates) {
    try {
      const data = templates.map((t) => t.toFirestore());
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error("Export error:", error);
      throw new Error("テンプレートのエクスポートに失敗しました");
    }
  }

  /**
   * JSON文字列をテンプレート配列に変換
   */
  static importTemplates(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      if (!Array.isArray(data)) {
        throw new Error("無効な形式です（配列である必要があります）");
      }

      return data;
    } catch (error) {
      console.error("Import error:", error);
      if (error instanceof SyntaxError) {
        throw new Error("無効なJSON形式です");
      }
      throw error;
    }
  }

  /**
   * JSONをファイルとしてダウンロード
   */
  static downloadAsFile(jsonString, filename = "obs-text-templates.json") {
    try {
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      throw new Error("ファイルのダウンロードに失敗しました");
    }
  }

  /**
   * ファイルアップロードUIを表示してJSONを読み込む
   */
  static selectFileAndRead() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error("ファイルが選択されていません"));
          return;
        }

        try {
          const text = await file.text();
          resolve(text);
        } catch (error) {
          console.error("File read error:", error);
          reject(new Error("ファイルの読み込みに失敗しました"));
        }
      };

      input.click();
    });
  }

  /**
   * JSONバリデーション
   */
  static validateTemplateJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      if (!Array.isArray(data)) {
        return { valid: false, error: "配列形式である必要があります" };
      }

      // 各テンプレートのバリデーション
      for (const item of data) {
        if (!item.id || !item.name || !item.style) {
          return {
            valid: false,
            error: "必須フィールド（id, name, style）が不足しています",
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: "無効なJSON形式です" };
    }
  }
}
