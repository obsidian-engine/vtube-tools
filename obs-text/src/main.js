import { saveSettings, subscribeSettings } from "./firebase.js";
import { SetupWizard } from "./wizard.js";
import { CustomizePanel } from "./ui/customizePanel.js";
import { ExtendedStyle } from "./domain/style.js";
import { Template } from "./domain/template.js";

/**
 * TextEditorApp - OBSテキスト編集画面アプリケーション
 * discord-cssのClass構造パターンを踏襲
 */
class TextEditorApp {
  constructor() {
    this.elements = {};
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
    this.extendedStyle = null; // Phase 3-1: 拡張スタイルモデル
    this.customizePanel = null; // Phase 3-1: カスタマイズパネル
    this.debounceTimer = null;
    this.unsubscribe = null;
    this.isLoadingSettings = false;

    this.init();
  }

  /**
   * 初期化
   */
  async init() {
    // ウィザード表示判定
    if (SetupWizard.shouldShow()) {
      const wizard = new SetupWizard((settings) => {
        this.applyWizardSettings(settings);
        this.continueInit();
      });
      wizard.start();
      return;
    }

    this.continueInit();
  }

  /**
   * ウィザード完了後、または通常の初期化
   */
  async continueInit() {
    this.bindElements();
    this.initCustomizePanel(); // Phase 3-1: カスタマイズパネル初期化
    this.attachEventListeners();
    await this.loadSettings();
    this.updatePreview();
    this.updateDisplayUrl();
    this.setConnectionStatus("connected");
  }

  /**
   * ウィザード設定を適用
   */
  applyWizardSettings(settings) {
    if (settings.textColor) {
      this.settings.style.color = settings.textColor;
    }
    if (settings.background === "chromakey") {
      this.settings.style.backgroundColor = "#00ff00";
    } else if (settings.backgroundColor) {
      this.settings.style.backgroundColor = settings.backgroundColor;
    }
  }

  /**
   * 設定を読み込む（localStorage → Firebase）
   */
  async loadSettings() {
    this.isLoadingSettings = true;

    try {
      // 1. localStorageから復元（オフライン対応）
      const localKey = "obs-text-settings";
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
      this.unsubscribe = subscribeSettings((data) => {
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
      showGuideBtn: document.getElementById("show-guide-btn"),
      // スタイル設定UI
      fontSelect: document.getElementById("font-select"),
      colorPicker: document.getElementById("color-picker"),
      colorText: document.getElementById("color-text"),
      weightSelect: document.getElementById("weight-select"),
      sizeSlider: document.getElementById("size-slider"),
      sizeValue: document.getElementById("size-value"),
      // Phase 3-1: カスタマイズパネル用
      customizePanelContainer: document.getElementById(
        "customize-panel-container",
      ),
      customizeBtn: document.getElementById("customize-btn"),
    };
  }

  /**
   * Phase 3-1: カスタマイズパネルの初期化
   */
  initCustomizePanel() {
    if (!this.elements.customizePanelContainer) {
      console.warn("Customize panel container not found");
      return;
    }

    // 既存の設定から ExtendedStyle を作成（マイグレーション）
    this.extendedStyle = new ExtendedStyle({
      fontFamily: this.settings.style.fontFamily,
      fontSize: this.settings.style.fontSize,
      color: this.settings.style.color,
      backgroundColor:
        this.settings.style.backgroundColor === "transparent"
          ? null
          : this.settings.style.backgroundColor,
      shadow: ExtendedStyle.parseTextShadow(this.settings.style.textShadow),
    });

    // カスタマイズパネル作成
    this.customizePanel = new CustomizePanel(
      this.elements.customizePanelContainer,
      {
        onStyleChange: (style) => {
          this.onExtendedStyleChange(style);
        },
        onTemplateSelect: (template) => {
          this.onTemplateSelect(template);
        },
      },
    );

    // 初期パネルは非表示
    this.customizePanel.hide();
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

    // ガイドボタン
    if (this.elements.showGuideBtn) {
      this.elements.showGuideBtn.addEventListener("click", () => {
        this.showGuideModal();
      });
    }

    // Phase 3-1: カスタマイズボタン
    if (this.elements.customizeBtn) {
      this.elements.customizeBtn.addEventListener("click", () => {
        if (this.customizePanel) {
          this.customizePanel.toggle();
        }
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

    // ExtendedStyleがある場合はそちらを優先
    if (this.extendedStyle) {
      this.updatePreviewWithExtendedStyle(this.extendedStyle);
      return;
    }

    // XSS対策: textContentを使用
    this.elements.preview.textContent = this.settings.text || "プレビュー表示";

    // 基本スタイル適用
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

    // シンプルなURL（パラメータなし）
    const url = `${base}${path}`;

    this.elements.displayUrl.value = url;
  }

  /**
   * Firebaseに同期（+ localStorage保存）
   */
  async syncToFirebase() {
    try {
      // Firebase保存
      await saveSettings(this.settings);

      // localStorage保存（オフライン対応）
      const localKey = "obs-text-settings";
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

  /**
   * OBS設定ガイドモーダルを表示
   */
  showGuideModal() {
    // モーダルを動的に作成
    const modal = document.createElement("div");
    modal.className = "guide-modal active";
    modal.innerHTML = this.getGuideContent();

    // body に追加
    document.body.appendChild(modal);

    // 閉じるボタン・背景クリックでモーダルを削除
    const closeBtn = modal.querySelector(".guide-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.remove();
      });
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // ESCキーで閉じる
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        modal.remove();
        document.removeEventListener("keydown", handleEsc);
      }
    };
    document.addEventListener("keydown", handleEsc);
  }

  /**
   * ガイドコンテンツHTML生成
   */
  getGuideContent() {
    return `
      <div class="guide-modal-content">
        <div class="guide-modal-header">
          <h2 class="guide-modal-title">OBS設定ガイド</h2>
          <button class="guide-modal-close" aria-label="閉じる">&times;</button>
        </div>

        <div class="guide-steps">
          <div class="guide-step">
            <h3>ステップ1: ブラウザソースを追加</h3>
            <ol>
              <li>OBSで「ソース」の「+」をクリック</li>
              <li>「ブラウザ」を選択</li>
              <li>名前を「テロップ」にして「OK」</li>
            </ol>
          </div>

          <div class="guide-step">
            <h3>ステップ2: URLを貼り付け</h3>
            <ol>
              <li>「URL」の欄に、上でコピーしたURLを貼り付け</li>
              <li>幅: 1920、高さ: 1080</li>
              <li>「OK」をクリック</li>
            </ol>
          </div>

          <div class="guide-step">
            <h3>ステップ3: 背景を透明にする</h3>
            <ol>
              <li>追加した「テロップ」を右クリック → 「フィルタ」</li>
              <li>「+」→「クロマキー」を選択</li>
              <li>キーカラータイプ: 緑</li>
              <li>そのまま「閉じる」</li>
            </ol>
          </div>

          <div class="guide-complete">
            <p><strong>✅ 完了！</strong></p>
            <p>編集画面でテキストを変更すると、OBSに自動反映されます。</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Phase 3-1: 拡張スタイル変更時の処理
   */
  onExtendedStyleChange(style) {
    this.extendedStyle = style;

    // settings.styleを新形式で更新（shadow/stroke/position含む）
    const firestoreData = style.toFirestore();
    this.settings.style = {
      ...firestoreData,
      // 後方互換性のためtextShadowも残す
      textShadow: style.getTextShadowCSS(),
    };

    // プレビュー更新
    this.updatePreviewWithExtendedStyle(style);

    // Firebase同期
    this.syncToFirebase();
  }

  /**
   * Phase 3-1: テンプレート選択時の処理
   */
  onTemplateSelect(template) {
    this.extendedStyle = template.style;

    // settings.styleを新形式で更新（shadow/stroke/position含む）
    const firestoreData = template.style.toFirestore();
    this.settings.style = {
      ...firestoreData,
      // 後方互換性のためtextShadowも残す
      textShadow: template.style.getTextShadowCSS(),
    };

    // プレビュー更新
    this.updatePreviewWithExtendedStyle(template.style);

    // Firebase同期
    this.syncToFirebase();
  }

  /**
   * Phase 3-1: ExtendedStyleを使ったプレビュー更新
   */
  updatePreviewWithExtendedStyle(style) {
    if (!this.elements.preview) return;

    // XSS対策: textContentを使用
    this.elements.preview.textContent = this.settings.text || "プレビュー表示";

    // ExtendedStyleのCSS適用
    const cssStyle = style.toCSS();
    Object.assign(this.elements.preview.style, cssStyle);
  }
}

// DOMContentLoaded後に初期化
document.addEventListener("DOMContentLoaded", () => {
  new TextEditorApp();
});
