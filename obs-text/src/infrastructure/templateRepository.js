/**
 * TemplateRepository
 * テンプレートのlocalStorage永続化を担当
 */
import { Template } from "../domain/template.js";

export class TemplateRepository {
  constructor() {
    this.storageKey = "obs-text-templates";
  }

  /**
   * 全テンプレートを取得
   */
  getAll() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];

      const parsed = JSON.parse(data);
      return parsed.map((item) => Template.fromFirestore(item));
    } catch (error) {
      console.error("Failed to load templates:", error);
      return [];
    }
  }

  /**
   * ID指定でテンプレートを取得
   */
  getById(id) {
    const templates = this.getAll();
    return templates.find((t) => t.id === id) || null;
  }

  /**
   * テンプレートを保存
   */
  save(template) {
    try {
      const templates = this.getAll();

      // 重複チェック
      const existingIndex = templates.findIndex((t) => t.id === template.id);

      if (existingIndex >= 0) {
        // 更新
        templates[existingIndex] = template;
      } else {
        // 新規追加
        templates.push(template);
      }

      // 保存
      const data = templates.map((t) => t.toFirestore());
      localStorage.setItem(this.storageKey, JSON.stringify(data));

      return true;
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("テンプレートの保存に失敗しました");
      return false;
    }
  }

  /**
   * テンプレートを削除
   */
  delete(id) {
    try {
      const templates = this.getAll();
      const filtered = templates.filter((t) => t.id !== id);

      const data = filtered.map((t) => t.toFirestore());
      localStorage.setItem(this.storageKey, JSON.stringify(data));

      return true;
    } catch (error) {
      console.error("Failed to delete template:", error);
      alert("テンプレートの削除に失敗しました");
      return false;
    }
  }

  /**
   * 全テンプレートをクリア
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error("Failed to clear templates:", error);
      return false;
    }
  }

  /**
   * 名前の重複を回避
   */
  getUniqueName(baseName) {
    const templates = this.getAll();
    const names = templates.map((t) => t.name);

    if (!names.includes(baseName)) {
      return baseName;
    }

    let counter = 2;
    while (names.includes(`${baseName} (${counter})`)) {
      counter++;
    }

    return `${baseName} (${counter})`;
  }
}
