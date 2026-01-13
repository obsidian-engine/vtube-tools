import { subscribeSettings } from "./firebase.js";

/**
 * DisplayApp - OBS表示画面アプリケーション
 * Firebaseからリアルタイムでテキストを取得して表示
 */
class DisplayApp {
  constructor() {
    this.elements = {};
    this.unsubscribe = null;
    this.lastData = null; // キャッシュ（障害時フォールバック用）
    this.currentEffect = null; // Phase 3-3: 現在のエフェクト
    this.lastText = null; // テキスト変更検出用

    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.bindElements();
    this.subscribeToSettings();
  }

  /**
   * DOM要素をキャッシュ
   */
  bindElements() {
    this.elements = {
      textDisplay: document.getElementById("text-display"),
      errorMessage: document.getElementById("error-message"),
    };
  }

  /**
   * Firebase設定をリアルタイム購読
   */
  subscribeToSettings() {
    this.unsubscribe = subscribeSettings((data) => {
      if (data) {
        this.updateDisplay(data);
        this.lastData = data; // キャッシュ更新
      } else {
        console.warn("[Display] No data received, using defaults");
        // 初回データがない場合はデフォルト表示
        this.updateDisplay({
          text: "",
          style: {
            fontFamily: "Noto Sans JP",
            fontSize: 48,
            fontWeight: 400,
            color: "#ffffff",
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
          },
        });
      }
    });
  }

  /**
   * 表示更新
   * XSS対策: textContent使用（innerHTML禁止）
   * @param {object} data - { text, style }
   */
  updateDisplay(data) {
    if (!this.elements.textDisplay) return;

    const { text, style, effect } = data;

    // テキスト変更検出
    const textChanged = this.lastText !== text;
    this.lastText = text;

    // XSS対策: textContentを使用（innerHTML禁止）
    this.elements.textDisplay.textContent = text || "";

    if (!style) return;

    // 基本スタイル
    const displayStyle = this.elements.textDisplay.style;
    displayStyle.fontFamily = style.fontFamily || "Noto Sans JP";
    displayStyle.fontSize = `${style.fontSize || 48}px`;
    displayStyle.fontWeight = style.fontWeight || 400;
    displayStyle.color = style.color || "#ffffff";

    // テキストシャドウ（新旧両対応）
    displayStyle.textShadow = this.getTextShadow(style);

    // テキストストローク
    this.applyStroke(displayStyle, style.stroke);

    // 位置調整
    this.applyPosition(displayStyle, style.position);

    // Phase 3-3: エフェクト適用（テキスト変更時のみ）
    if (effect && textChanged) {
      this.currentEffect = effect;
      this.triggerEffect(effect);
    }
  }

  /**
   * テキストシャドウを取得（後方互換性あり）
   */
  getTextShadow(style) {
    if (style.shadow) {
      const { color, blur, offsetX, offsetY } = style.shadow;
      return `${offsetX}px ${offsetY}px ${blur}px ${color}`;
    }
    return style.textShadow || "2px 2px 4px rgba(0, 0, 0, 0.8)";
  }

  /**
   * ストロークを適用
   */
  applyStroke(displayStyle, stroke) {
    if (stroke?.width > 0) {
      const strokeValue = `${stroke.width}px ${stroke.color}`;
      displayStyle.webkitTextStroke = strokeValue;
      displayStyle.textStroke = strokeValue;
    } else {
      displayStyle.webkitTextStroke = "";
      displayStyle.textStroke = "";
    }
  }

  /**
   * 位置を適用
   */
  applyPosition(displayStyle, position) {
    if (!position) return;

    displayStyle.left = `${position.x}%`;
    displayStyle.top = `${position.y}%`;
    displayStyle.textAlign = position.align || "center";

    const transforms = {
      center: "translate(-50%, -50%)",
      left: "translateY(-50%)",
      right: "translate(-100%, -50%)",
    };
    displayStyle.transform = transforms[position.align] || transforms.center;
  }

  /**
   * Phase 3-3: エフェクトをトリガー
   */
  triggerEffect(effect) {
    if (!effect || !effect.enabled || effect.type === "none") {
      this.removeEffect();
      return;
    }

    const element = this.elements.textDisplay;
    if (!element) return;

    // 既存のエフェクトクラスを削除
    this.removeEffect();

    // エフェクトクラスを構築
    let effectClass = `effect-${effect.type}`;

    // slideInの場合は方向を追加
    if (effect.type === "slideIn" && effect.config?.direction) {
      effectClass += `-${effect.config.direction}`;
    }

    // 共通クラス
    element.classList.add("text-effect");
    element.classList.add(effectClass);

    // 速度クラス
    const speed = effect.speed || 1.0;
    if (speed < 0.8) {
      element.classList.add("effect-speed-slow");
    } else if (speed > 1.2) {
      element.classList.add("effect-speed-fast");
    } else {
      element.classList.add("effect-speed-normal");
    }

    // Easingクラス
    const easing = effect.config?.easing || "ease";
    element.classList.add(`effect-easing-${easing}`);

    // アニメーション終了後にクラスを削除
    const handleAnimationEnd = () => {
      this.removeEffect();
      element.removeEventListener("animationend", handleAnimationEnd);
    };
    element.addEventListener("animationend", handleAnimationEnd);
  }

  /**
   * Phase 3-3: エフェクトクラスを削除
   */
  removeEffect() {
    const element = this.elements.textDisplay;
    if (!element) return;

    // エフェクト関連のクラスを全て削除
    const classesToRemove = Array.from(element.classList).filter(
      (cls) => cls.startsWith("effect-") || cls === "text-effect",
    );
    classesToRemove.forEach((cls) => element.classList.remove(cls));
  }

  /**
   * エラーメッセージ表示
   * @param {string} message - エラーメッセージ
   */
  showError(message) {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
      this.elements.errorMessage.style.display = "block";
    }

    if (this.elements.textDisplay) {
      this.elements.textDisplay.style.display = "none";
    }
  }

  /**
   * クリーンアップ（ページアンロード時）
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// DOMContentLoaded後に初期化
let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new DisplayApp();
});

// ページアンロード時にクリーンアップ
window.addEventListener("beforeunload", () => {
  if (app) {
    app.destroy();
  }
});
