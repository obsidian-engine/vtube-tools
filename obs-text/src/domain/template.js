/**
 * Template Value Object
 * スタイルテンプレートを管理するドメインモデル
 */
import { ExtendedStyle } from "./style.js";
import { Effect } from "./effect.js";

export class Template {
  constructor({
    id = null,
    name = "カスタム",
    style = null,
    effect = null,
    createdAt = null,
    updatedAt = null,
  } = {}) {
    this.id = id || `template_${Date.now()}`;
    this.name = name;
    this.style = style || new ExtendedStyle();
    this.effect = effect || new Effect();
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * テンプレートを更新（新しいインスタンスを返す）
   */
  update({ name, style, effect }) {
    return new Template({
      ...this,
      name: name !== undefined ? name : this.name,
      style: style !== undefined ? style : this.style,
      effect: effect !== undefined ? effect : this.effect,
      updatedAt: new Date(),
    });
  }

  /**
   * Firebaseに保存する形式に変換
   */
  toFirestore() {
    return {
      id: this.id,
      name: this.name,
      style: this.style.toFirestore(),
      effect: this.effect.toFirestore(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Firestoreデータから復元
   */
  static fromFirestore(data) {
    if (!data) return new Template();
    return new Template({
      ...data,
      style: ExtendedStyle.fromFirestore(data.style),
      effect: Effect.fromFirestore(data.effect),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    });
  }

  /**
   * プリセットテンプレート
   */
  static presets = {
    default: {
      name: "デフォルト",
      style: new ExtendedStyle({
        fontFamily: "Arial",
        fontSize: 48,
        color: "#FFFFFF",
        shadow: {
          color: "rgba(0, 0, 0, 0.8)",
          blur: 4,
          offsetX: 2,
          offsetY: 2,
        },
      }),
      effect: new Effect({ type: "none" }),
    },
    gaming: {
      name: "ゲーミング",
      style: new ExtendedStyle({
        fontFamily: "Arial Black",
        fontSize: 56,
        color: "#00FF00",
        stroke: { color: "#000000", width: 3 },
        shadow: {
          color: "rgba(0, 255, 0, 0.5)",
          blur: 8,
          offsetX: 0,
          offsetY: 0,
        },
      }),
      effect: new Effect({ type: "fadeIn", enabled: true }),
    },
    minimal: {
      name: "ミニマル",
      style: new ExtendedStyle({
        fontFamily: "Helvetica",
        fontSize: 36,
        color: "#333333",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        shadow: null,
      }),
      effect: new Effect({ type: "slideIn", enabled: true }),
    },
    subtitle: {
      name: "字幕",
      style: new ExtendedStyle({
        fontFamily: "Yu Gothic",
        fontSize: 42,
        color: "#FFFFFF",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        position: { x: 50, y: 85, align: "center" },
      }),
      effect: new Effect({ type: "typewriter", enabled: true }),
    },
  };

  /**
   * プリセットから作成
   */
  static fromPreset(presetName) {
    const preset = Template.presets[presetName];
    if (!preset) {
      throw new Error(`Unknown template preset: ${presetName}`);
    }
    return new Template({
      name: preset.name,
      style: preset.style,
      effect: preset.effect,
    });
  }

  /**
   * 既存のsettingsオブジェクトから移行（マイグレーション用）
   */
  static fromLegacySettings(settings) {
    const style = new ExtendedStyle({
      fontFamily: settings.style?.fontFamily || "Arial",
      fontSize: settings.style?.fontSize || 48,
      color: settings.style?.color || "#FFFFFF",
      backgroundColor: settings.style?.backgroundColor || null,
      shadow: ExtendedStyle.parseTextShadow(settings.style?.textShadow),
      position: {
        x: 50,
        y: 50,
        align: "center",
      },
    });

    return new Template({
      name: "カスタム",
      style,
      effect: new Effect(),
    });
  }
}
