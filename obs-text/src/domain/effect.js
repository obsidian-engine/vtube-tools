/**
 * Effect Value Object
 * テキストエフェクトを管理するドメインモデル
 */
export class Effect {
  constructor({
    type = "none",
    speed = 1.0,
    enabled = false,
    config = {},
  } = {}) {
    this.type = type;
    this.speed = speed;
    this.enabled = enabled;
    this.config = config;
  }

  /**
   * エフェクトを有効化
   */
  enable() {
    return new Effect({ ...this, enabled: true });
  }

  /**
   * エフェクトを無効化
   */
  disable() {
    return new Effect({ ...this, enabled: false });
  }

  /**
   * 速度を変更
   */
  withSpeed(speed) {
    return new Effect({ ...this, speed });
  }

  /**
   * エフェクト設定を更新
   */
  withConfig(config) {
    return new Effect({ ...this, config: { ...this.config, ...config } });
  }

  /**
   * Firebaseに保存する形式に変換
   */
  toFirestore() {
    return {
      type: this.type,
      speed: this.speed,
      enabled: this.enabled,
      config: this.config,
    };
  }

  /**
   * Firestoreデータから復元
   */
  static fromFirestore(data) {
    if (!data) return new Effect();
    return new Effect(data);
  }

  /**
   * エフェクトタイプ別のプリセット
   */
  static presets = {
    none: {
      type: "none",
      speed: 1.0,
      enabled: false,
      config: {},
    },
    fadeIn: {
      type: "fadeIn",
      speed: 1.0,
      enabled: true,
      config: { duration: 500 },
    },
    slideIn: {
      type: "slideIn",
      speed: 1.0,
      enabled: true,
      config: { direction: "left", distance: 100 },
    },
    typewriter: {
      type: "typewriter",
      speed: 1.0,
      enabled: true,
      config: { charDelay: 50 },
    },
  };

  /**
   * プリセットから作成
   */
  static fromPreset(presetName) {
    const preset = Effect.presets[presetName];
    if (!preset) {
      throw new Error(`Unknown effect preset: ${presetName}`);
    }
    return new Effect(preset);
  }
}
