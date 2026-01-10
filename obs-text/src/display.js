import { subscribeSession } from "./firebase.js";

/**
 * DisplayApp - OBS表示画面アプリケーション
 * Firebaseからリアルタイムでテキストを取得して表示
 */
class DisplayApp {
  constructor() {
    this.elements = {};
    this.sessionId = null;
    this.unsubscribe = null;
    this.lastData = null; // キャッシュ（障害時フォールバック用）

    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.extractSessionId();
    this.bindElements();

    if (this.sessionId) {
      this.subscribeToSession();
    } else {
      this.showError("セッションIDが指定されていません");
      console.error("No session ID specified");
    }
  }

  /**
   * URLパラメータからセッションID取得
   */
  extractSessionId() {
    const params = new URLSearchParams(window.location.search);
    this.sessionId = params.get("session");
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
   * Firebaseセッションをリアルタイム購読
   */
  subscribeToSession() {
    this.unsubscribe = subscribeSession(this.sessionId, (data) => {
      if (data) {
        this.updateDisplay(data);
        this.lastData = data; // キャッシュ更新
      } else {
        // 初回データがない場合はデフォルト表示
        this.updateDisplay({
          text: "",
          style: {
            fontFamily: "Noto Sans JP",
            fontSize: 48,
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

    const { text, style } = data;

    // XSS対策: textContentを使用（innerHTML禁止）
    this.elements.textDisplay.textContent = text || "";

    // スタイル適用
    if (style) {
      Object.assign(this.elements.textDisplay.style, {
        fontFamily: style.fontFamily || "Noto Sans JP",
        fontSize: `${style.fontSize || 48}px`,
        color: style.color || "#ffffff",
        textShadow: style.textShadow || "2px 2px 4px rgba(0, 0, 0, 0.8)",
        backgroundColor: "transparent", // テキスト部分は透過（bodyのグリーンバックが表示される）
      });
    }
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
