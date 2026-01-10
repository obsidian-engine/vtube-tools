import { saveSession, generateSessionId } from "./firebase.js";

/**
 * TextEditorApp - OBSテキスト編集画面アプリケーション
 * discord-cssのClass構造パターンを踏襲
 */
class TextEditorApp {
  constructor() {
    this.elements = {};
    this.sessionId = null;
    this.settings = {
      text: "",
      style: {
        fontFamily: "Noto Sans JP",
        fontSize: 48,
        color: "#ffffff",
        backgroundColor: "transparent",
        textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
      },
    };
    this.debounceTimer = null;

    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.initSession();
    this.bindElements();
    this.attachEventListeners();
    this.updatePreview();
    this.updateDisplayUrl();
    this.setConnectionStatus("connected");
  }

  /**
   * セッションID初期化
   * URLパラメータから取得、なければ新規生成
   */
  initSession() {
    const params = new URLSearchParams(window.location.search);
    this.sessionId = params.get("session") || generateSessionId();

    // URLに反映（履歴置換）
    const newUrl = `${window.location.pathname}?session=${this.sessionId}`;
    window.history.replaceState({}, "", newUrl);
  }

  /**
   * DOM要素をキャッシュ
   */
  bindElements() {
    this.elements = {
      textInput: document.getElementById("text-input"),
      preview: document.getElementById("preview"),
      displayUrl: document.getElementById("display-url"),
      copyUrlBtn: document.getElementById("copy-url-btn"),
      connectionStatus: document.getElementById("connection-status"),
      sessionIdDisplay: document.getElementById("session-id"),
    };

    // セッションID表示
    if (this.elements.sessionIdDisplay) {
      this.elements.sessionIdDisplay.textContent = this.sessionId;
    }
  }

  /**
   * イベントリスナーを登録
   */
  attachEventListeners() {
    // テキスト入力（デバウンス付き）
    if (this.elements.textInput) {
      this.elements.textInput.addEventListener("input", () => {
        this.onTextChange();
      });
    }

    // URLコピーボタン
    if (this.elements.copyUrlBtn) {
      this.elements.copyUrlBtn.addEventListener("click", () => {
        this.copyDisplayUrl();
      });
    }
  }

  /**
   * テキスト変更時の処理（デバウンス300ms）
   */
  onTextChange() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      this.settings.text = this.elements.textInput.value;
      this.updatePreview();
      await this.syncToFirebase();
    }, 300);
  }

  /**
   * プレビュー更新
   * XSS対策: textContent使用（innerHTML禁止）
   */
  updatePreview() {
    if (!this.elements.preview) return;

    // XSS対策: textContentを使用
    this.elements.preview.textContent = this.settings.text || "プレビュー表示";

    // スタイル適用
    Object.assign(this.elements.preview.style, {
      fontFamily: this.settings.style.fontFamily,
      fontSize: `${this.settings.style.fontSize}px`,
      color: this.settings.style.color,
      textShadow: this.settings.style.textShadow,
    });
  }

  /**
   * OBS用URL更新
   */
  updateDisplayUrl() {
    if (!this.elements.displayUrl) return;

    const base = window.location.origin;
    const pathParts = window.location.pathname.split("/");
    pathParts[pathParts.length - 1] = "display.html";
    const path = pathParts.join("/");
    const url = `${base}${path}?session=${this.sessionId}`;

    this.elements.displayUrl.value = url;
  }

  /**
   * Firebaseに同期
   */
  async syncToFirebase() {
    try {
      await saveSession(this.sessionId, this.settings);
      this.setConnectionStatus("connected");
    } catch (error) {
      console.error("Firebase sync error:", error);
      this.setConnectionStatus("error");
    }
  }

  /**
   * 接続ステータス表示更新
   * @param {string} status - 'connected' or 'error'
   */
  setConnectionStatus(status) {
    if (!this.elements.connectionStatus) return;

    this.elements.connectionStatus.className = `connection-status ${status}`;
    this.elements.connectionStatus.textContent =
      status === "connected" ? "接続中" : "エラー";
  }

  /**
   * OBS用URLをクリップボードにコピー
   */
  async copyDisplayUrl() {
    if (!this.elements.displayUrl) return;

    try {
      await navigator.clipboard.writeText(this.elements.displayUrl.value);

      // ボタンテキスト変更（フィードバック）
      const originalText = this.elements.copyUrlBtn.textContent;
      this.elements.copyUrlBtn.textContent = "✅ コピー完了！";

      setTimeout(() => {
        this.elements.copyUrlBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error("Copy error:", error);
      this.elements.copyUrlBtn.textContent = "❌ コピー失敗";
      setTimeout(() => {
        this.elements.copyUrlBtn.textContent = "📋 コピー";
      }, 2000);
    }
  }
}

// DOMContentLoaded後に初期化
document.addEventListener("DOMContentLoaded", () => {
  new TextEditorApp();
});
