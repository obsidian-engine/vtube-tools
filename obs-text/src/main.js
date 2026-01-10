import {
  saveSession,
  generateSessionId,
  subscribeSession,
} from "./firebase.js";

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
        fontWeight: 400,
        color: "#ffffff",
        backgroundColor: "transparent",
        textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
      },
    };
    this.debounceTimer = null;
    this.unsubscribe = null;
    this.isLoadingSettings = false;

    this.init();
  }

  /**
   * 初期化
   */
  async init() {
    this.initSession();
    this.bindElements();
    this.attachEventListeners();
    await this.loadSettings();
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
   * 設定を読み込む（localStorage → Firebase）
   */
  async loadSettings() {
    this.isLoadingSettings = true;

    try {
      // 1. localStorageから復元（オフライン対応）
      const localKey = `obs-text-settings-${this.sessionId}`;
      const localData = localStorage.getItem(localKey);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          this.applySettings(parsed);
        } catch (error) {
          console.error("localStorage parse error:", error);
        }
      }

      // 2. Firebaseから復元（優先）
      this.unsubscribe = subscribeSession(this.sessionId, (data) => {
        if (data && !this.isLoadingSettings) {
          this.applySettings(data);
        }
      });

      // 初回ロード完了
      this.isLoadingSettings = false;
    } catch (error) {
      console.error("Settings load error:", error);
      this.isLoadingSettings = false;
    }
  }

  /**
   * 設定を適用（内部状態 + UI更新）
   */
  applySettings(data) {
    // 設定を更新
    if (data.text !== undefined) {
      this.settings.text = data.text;
      if (this.elements.textInput) {
        this.elements.textInput.value = data.text;
      }
    }

    if (data.style) {
      this.settings.style = { ...this.settings.style, ...data.style };

      // UI要素に反映
      if (this.elements.fontSelect && data.style.fontFamily) {
        this.elements.fontSelect.value = data.style.fontFamily;
      }
      if (this.elements.colorPicker && data.style.color) {
        this.elements.colorPicker.value = data.style.color;
        this.elements.colorText.value = data.style.color;
      }
      if (this.elements.weightSelect && data.style.fontWeight) {
        this.elements.weightSelect.value = data.style.fontWeight.toString();
      }
      if (this.elements.sizeSlider && data.style.fontSize) {
        this.elements.sizeSlider.value = data.style.fontSize.toString();
        this.elements.sizeValue.textContent = data.style.fontSize.toString();
      }
    }

    // プレビュー更新
    this.updatePreview();
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
      // スタイル設定UI
      fontSelect: document.getElementById("font-select"),
      colorPicker: document.getElementById("color-picker"),
      colorText: document.getElementById("color-text"),
      weightSelect: document.getElementById("weight-select"),
      sizeSlider: document.getElementById("size-slider"),
      sizeValue: document.getElementById("size-value"),
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

    // フォント選択
    if (this.elements.fontSelect) {
      this.elements.fontSelect.addEventListener("change", () => {
        this.onStyleChange();
      });
    }

    // カラーピッカー
    if (this.elements.colorPicker) {
      this.elements.colorPicker.addEventListener("input", (e) => {
        this.elements.colorText.value = e.target.value;
        this.onStyleChange();
      });
    }

    // カラーテキスト入力
    if (this.elements.colorText) {
      this.elements.colorText.addEventListener("input", (e) => {
        const value = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
          this.elements.colorPicker.value = value;
          this.onStyleChange();
        }
      });
    }

    // 文字太さ選択
    if (this.elements.weightSelect) {
      this.elements.weightSelect.addEventListener("change", () => {
        this.onStyleChange();
      });
    }

    // 文字サイズスライダー
    if (this.elements.sizeSlider) {
      this.elements.sizeSlider.addEventListener("input", (e) => {
        this.elements.sizeValue.textContent = e.target.value;
        this.onStyleChange();
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
   * スタイル変更時の処理（デバウンス300ms）
   */
  onStyleChange() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      // settings.styleを更新
      this.settings.style.fontFamily = this.elements.fontSelect.value;
      this.settings.style.color = this.elements.colorPicker.value;
      this.settings.style.fontWeight = parseInt(
        this.elements.weightSelect.value,
      );
      this.settings.style.fontSize = parseInt(this.elements.sizeSlider.value);

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
      fontWeight: this.settings.style.fontWeight,
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
   * Firebaseに同期（+ localStorage保存）
   */
  async syncToFirebase() {
    try {
      // Firebase保存
      await saveSession(this.sessionId, this.settings);

      // localStorage保存（オフライン対応）
      const localKey = `obs-text-settings-${this.sessionId}`;
      localStorage.setItem(localKey, JSON.stringify(this.settings));

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
      this.elements.copyUrlBtn.textContent = "コピーしました";

      setTimeout(() => {
        this.elements.copyUrlBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error("Copy error:", error);
      this.elements.copyUrlBtn.textContent = "コピー失敗";
      setTimeout(() => {
        this.elements.copyUrlBtn.textContent = "コピー";
      }, 2000);
    }
  }
}

// DOMContentLoaded後に初期化
document.addEventListener("DOMContentLoaded", () => {
  new TextEditorApp();
});
