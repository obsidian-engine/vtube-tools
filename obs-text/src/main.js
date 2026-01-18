import { saveSettings, subscribeSettings } from "./firebase.js";
import { SetupWizard } from "./wizard.js";
import { CustomizePanel } from "./ui/customizePanel.js";
import { TemplatePanel } from "./ui/templatePanel.js";
import { EffectPanel } from "./ui/effectPanel.js";
import { ExtendedStyle } from "./domain/style.js";
import { Template } from "./domain/template.js";
import { Effect } from "./domain/effect.js";
import { TemplateRepository } from "./infrastructure/templateRepository.js";

/**
 * TextEditorApp - OBSテキスト編集画面アプリケーション
 * discord-cssのClass構造パターンを踏襲
 */
/**
 * W2: Undo機能を提供するマネージャークラス
 */
class UndoManager {
  constructor(maxHistorySize = 10) {
    this.history = [];
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * 現在の状態を履歴に追加
   * @param {Object} state - 保存する状態（text, style等）
   */
  push(state) {
    // 最新の状態と同じ場合は追加しない
    if (this.history.length > 0) {
      const lastState = this.history[this.history.length - 1];
      if (JSON.stringify(lastState) === JSON.stringify(state)) {
        return;
      }
    }

    this.history.push(JSON.parse(JSON.stringify(state))); // Deep copy

    // 履歴サイズ制限
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * 1つ前の状態に戻す
   * @returns {Object|null} - 復元する状態、履歴がない場合はnull
   */
  undo() {
    if (this.history.length <= 1) {
      return null; // 最初の状態までしかない場合は何もしない
    }

    // 現在の状態を削除し、1つ前の状態を返す
    this.history.pop();
    return JSON.parse(JSON.stringify(this.history[this.history.length - 1]));
  }

  /**
   * Undo可能かどうか
   * @returns {boolean}
   */
  canUndo() {
    return this.history.length > 1;
  }

  /**
   * 履歴をクリア
   */
  clear() {
    this.history = [];
  }
}

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
    this.templateRepository = null; // Phase 3-2: テンプレートリポジトリ
    this.templatePanel = null; // Phase 3-2: テンプレートパネル
    this.effect = new Effect(); // Phase 3-3: エフェクト
    this.effectPanel = null; // Phase 3-3: エフェクトパネル
    this.debounceTimer = null;
    this.unsubscribe = null;
    this.isLoadingSettings = false;

    // W2: Undo機能
    this.undoManager = new UndoManager(10);

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
    this.initTemplatePanel(); // Phase 3-2: テンプレートパネル初期化
    this.initEffectPanel(); // Phase 3-3: エフェクトパネル初期化
    this.attachEventListeners();
    this.setupUndoShortcut(); // W2: Undoショートカット設定
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

      // W2: 初期状態をUndo履歴に保存
      this.saveStateToHistory();
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

    // Phase 3-3: エフェクトを復元
    if (data.effect) {
      this.effect = Effect.fromFirestore(data.effect);
      if (this.effectPanel) {
        this.effectPanel.loadEffect(this.effect);
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
      // Phase 3-2: テンプレートパネル用
      templatePanelContainer: document.getElementById(
        "template-panel-container",
      ),
      templateBtn: document.getElementById("template-btn"),
      // Phase 3-3: エフェクトパネル用
      effectPanelContainer: document.getElementById("effect-panel-container"),
      effectBtn: document.getElementById("effect-btn"),
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
   * Phase 3-2: テンプレートパネルの初期化
   */
  initTemplatePanel() {
    if (!this.elements.templatePanelContainer) {
      console.warn("Template panel container not found");
      return;
    }

    // リポジトリとパネルを作成
    this.templateRepository = new TemplateRepository();
    this.templatePanel = new TemplatePanel(
      this.templateRepository,
      (template) => this.applyTemplate(template),
    );

    // 保存リクエストハンドラーを設定
    this.templatePanel.setOnSaveRequest((name) => {
      this.saveCurrentAsTemplate(name);
    });

    // パネルをマウント
    this.templatePanel.mount(this.elements.templatePanelContainer);

    // 初期パネルは非表示
    this.templatePanel.hide();
  }

  /**
   * Phase 3-3: エフェクトパネルの初期化
   */
  initEffectPanel() {
    if (!this.elements.effectPanelContainer) {
      console.warn("Effect panel container not found");
      return;
    }

    // エフェクトパネル作成
    this.effectPanel = new EffectPanel((effect, isPreview) =>
      this.onEffectChange(effect, isPreview),
    );

    // パネルをマウント
    this.effectPanel.mount(this.elements.effectPanelContainer);

    // 初期パネルは非表示
    this.effectPanel.hide();
  }

  /**
   * 緑色（クロマキー）かどうか判定
   * @param {string} hexColor - #RRGGBB形式の色
   * @returns {boolean}
   */
  isChromaKeyGreen(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // HSL変換
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;

    if (max === min) return false; // グレースケールは除外

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    if (max === r / 255) {
      h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g / 255) {
      h = ((b / 255 - r / 255) / d + 2) / 6;
    } else {
      h = ((r / 255 - g / 255) / d + 4) / 6;
    }

    // 緑の範囲: 色相 90-150度（0.25-0.42）、彩度 > 0.4
    return h >= 0.25 && h <= 0.42 && s > 0.4;
  }

  /**
   * 緑色を安全な色に変換
   * @param {string} hexColor - #RRGGBB形式の色
   * @returns {string} - 変換後の色
   */
  convertFromGreen(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // 緑成分を青に移動（シアン寄りに）
    const newR = r;
    const newG = Math.floor(g * 0.7);
    const newB = Math.min(255, b + Math.floor(g * 0.3));

    return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
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
        let color = e.target.value;

        // 緑色チェック
        if (this.isChromaKeyGreen(color)) {
          const safeColor = this.convertFromGreen(color);
          alert(
            `⚠️ クロマキー警告\n\n緑系統の色はOBSのクロマキーで透明化されます。\n自動的に安全な色（${safeColor}）に変換しました。`,
          );
          color = safeColor;
          this.elements.colorPicker.value = color;
        }

        this.elements.colorText.value = color;
        this.onStyleChange();
      });
    }

    // カラーテキスト入力
    if (this.elements.colorText) {
      this.elements.colorText.addEventListener("input", (e) => {
        let value = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
          // 緑色チェック
          if (this.isChromaKeyGreen(value)) {
            const safeColor = this.convertFromGreen(value);
            alert(
              `⚠️ クロマキー警告\n\n緑系統の色はOBSのクロマキーで透明化されます。\n自動的に安全な色（${safeColor}）に変換しました。`,
            );
            value = safeColor;
            this.elements.colorText.value = value;
          }

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

    // Phase 3-2: テンプレートボタン
    if (this.elements.templateBtn) {
      this.elements.templateBtn.addEventListener("click", () => {
        if (this.templatePanel) {
          this.templatePanel.show();
        }
      });
    }

    // Phase 3-3: エフェクトボタン
    if (this.elements.effectBtn) {
      this.elements.effectBtn.addEventListener("click", () => {
        if (this.effectPanel) {
          this.effectPanel.show();
        }
      });
    }
  }


  /**
   * W2: Undo機能のキーボードショートカット設定
   */
  setupUndoShortcut() {
    document.addEventListener("keydown", (e) => {
      // Ctrl+Z (Windows/Linux) または Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        this.performUndo();
      }
    });
  }

  /**
   * W2: Undo実行
   */
  performUndo() {
    if (!this.undoManager.canUndo()) {
      this.showToast("これ以上戻せません", "info");
      return;
    }

    const previousState = this.undoManager.undo();
    if (previousState) {
      // 状態を復元
      this.applySettings(previousState);
      this.showToast("元に戻しました", "success");
    }
  }

  /**
   * W2: 現在の状態をUndo履歴に保存
   */
  saveStateToHistory() {
    const currentState = {
      text: this.settings.text,
      style: { ...this.settings.style },
      effect: this.effect ? this.effect.toFirestore() : null,
    };
    this.undoManager.push(currentState);
  }

  /**
   * W4: トースト通知を表示
   * @param {string} message - 表示するメッセージ
   * @param {string} type - 通知タイプ ('success', 'error', 'info')
   */
  showToast(message, type = "info") {
    // 既存のトーストを削除
    const existingToast = document.querySelector(".toast-notification");
    if (existingToast) {
      existingToast.remove();
    }

    // トースト要素を作成
    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;

    // bodyに追加
    document.body.appendChild(toast);

    // アニメーション用にクラスを追加
    setTimeout(() => {
      toast.classList.add("toast-show");
    }, 10);

    // 2秒後に削除
    setTimeout(() => {
      toast.classList.remove("toast-show");
      setTimeout(() => {
        toast.remove();
      }, 300); // フェードアウトアニメーション時間
    }, 2000);
  }

  /**
   * テキスト変更時の処理（デバウンス300ms）
   */
  onTextChange() {
    // W2: 変更前の状態を保存
    this.saveStateToHistory();

    // テキスト更新
    this.settings.text = this.elements.textInput.value;

    // 文字数カウンター更新
    const charCount = this.settings.text.length;
    const charCountEl = document.getElementById("char-count");
    if (charCountEl) {
      charCountEl.textContent = charCount;
      // 1000文字超過時に警告表示
      if (charCount > 1000) {
        charCountEl.style.color = "var(--error-color)";
      } else {
        charCountEl.style.color = "";
      }
    }

    // プレビューは即座に更新
    this.updatePreview();

    // Firebase同期はデバウンス
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      await this.syncToFirebase();
    }, 300);
  }

  /**
   * スタイル変更時の処理（デバウンス300ms）
   */
  onStyleChange() {
    // W2: 変更前の状態を保存
    this.saveStateToHistory();

    // settings.styleを更新
    this.settings.style.fontFamily = this.elements.fontSelect.value;
    this.settings.style.color = this.elements.colorPicker.value;
    this.settings.style.fontWeight = parseInt(this.elements.weightSelect.value);
    this.settings.style.fontSize = parseInt(this.elements.sizeSlider.value);

    // 基本スタイルが変更された場合、ExtendedStyleをリセット
    // （カスタマイズパネルから変更する場合は onExtendedStyleChange が呼ばれる）
    this.extendedStyle = null;

    // プレビューは即座に更新
    this.updatePreview();

    // Firebase同期はデバウンス
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
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

    // プレビューを画面に収める
    this.scalePreviewToFit();
  }

  /**
   * プレビューテキストをコンテナに収まるようにスケール調整
   */
  scalePreviewToFit() {
    if (!this.elements.preview) return;

    const container = this.elements.preview.parentElement;
    if (!container) return;

    // 一度スケールをリセット
    this.elements.preview.style.transform = "scale(1)";

    // 次のフレームでサイズを測定（DOMが更新された後）
    requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const previewRect = this.elements.preview.getBoundingClientRect();

      // パディングを考慮
      const maxWidth = containerRect.width - 32; // 左右16pxずつ
      const maxHeight = containerRect.height - 32; // 上下16pxずつ

      // スケール計算
      const scaleX =
        previewRect.width > maxWidth ? maxWidth / previewRect.width : 1;
      const scaleY =
        previewRect.height > maxHeight ? maxHeight / previewRect.height : 1;
      const scale = Math.min(scaleX, scaleY, 1); // 1を超えないように

      // スケール適用
      if (scale < 1) {
        this.elements.preview.style.transform = `scale(${scale})`;
      }
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
    // C3: ボタンをloading状態にする（存在する場合）
    const syncButton = document.getElementById("sync-btn");
    if (syncButton) {
      syncButton.classList.add("btn-loading");
      syncButton.disabled = true;
    }

    try {
      // Phase 3-3: effectを含める
      const dataToSave = {
        ...this.settings,
        effect: this.effect ? this.effect.toFirestore() : null,
      };

      // Firebase保存
      await saveSettings(dataToSave);

      // localStorage保存（オフライン対応）
      const localKey = "obs-text-settings";
      localStorage.setItem(localKey, JSON.stringify(dataToSave));

      this.setConnectionStatus("connected");

      // C3: 成功状態を表示
      if (syncButton) {
        syncButton.classList.remove("btn-loading");
        syncButton.classList.add("btn-success");
        setTimeout(() => {
          syncButton.classList.remove("btn-success");
          syncButton.disabled = false;
        }, 2000);
      }

      // W4: 成功トースト表示
      this.showToast("保存しました", "success");
    } catch (error) {
      console.error("Firebase sync error:", error);
      this.setConnectionStatus("error");

      // C3: エラー状態を表示
      if (syncButton) {
        syncButton.classList.remove("btn-loading");
        syncButton.classList.add("btn-error");
        setTimeout(() => {
          syncButton.classList.remove("btn-error");
          syncButton.disabled = false;
        }, 2000);
      }

      // W4: エラートースト表示
      this.showToast("保存に失敗しました", "error");
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

      // W4: 成功トースト表示
      this.showToast("URLをコピーしました", "success");
    } catch (error) {
      console.error("Copy error:", error);
      this.elements.copyUrlBtn.textContent = "コピー失敗";
      setTimeout(() => {
        this.elements.copyUrlBtn.textContent = "コピー";
      }, 2000);

      // W4: エラートースト表示
      this.showToast("コピーに失敗しました", "error");
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

    // プレビューを画面に収める
    this.scalePreviewToFit();
  }

  /**
   * Phase 3-2: テンプレートを適用
   */
  applyTemplate(template) {
    // ExtendedStyleを更新
    this.extendedStyle = template.style;

    // settings.styleを更新
    const firestoreData = template.style.toFirestore();
    this.settings.style = {
      ...firestoreData,
      textShadow: template.style.getTextShadowCSS(),
    };

    // Phase 3-3: Effectを更新
    if (template.effect) {
      this.effect = template.effect;
      if (this.effectPanel) {
        this.effectPanel.loadEffect(this.effect);
      }
    }

    // プレビュー更新
    this.updatePreviewWithExtendedStyle(template.style);

    // Firebase同期
    this.syncToFirebase();

    // W4: 成功通知
    this.showToast(`テンプレート「${template.name}」を適用しました`, "success");
  }

  /**
   * Phase 3-2: 現在のスタイルをテンプレートとして保存
   */
  saveCurrentAsTemplate(name) {
    if (!this.extendedStyle) {
      alert("保存するスタイルがありません");
      return;
    }

    try {
      const template = new Template({
        name,
        style: this.extendedStyle,
        effect: this.effect,
      });

      if (this.templateRepository.save(template)) {
        alert(`テンプレート「${name}」を保存しました`);
        this.templatePanel.refresh();
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("テンプレートの保存に失敗しました");
    }
  }

  /**
   * Phase 3-3: エフェクト変更時の処理
   */
  onEffectChange(effect, isPreview = false) {
    this.effect = effect;

    if (isPreview) {
      // プレビューモード: プレビュー要素にエフェクトを適用
      this.previewEffect(effect);
    } else {
      // 通常モード: Firebase同期
      this.syncToFirebase();
    }
  }

  /**
   * Phase 3-3: プレビュー要素にエフェクトを適用
   */
  previewEffect(effect) {
    const preview = this.elements.preview;
    if (!preview) return;

    // 既存のエフェクトクラスを削除
    const classesToRemove = Array.from(preview.classList).filter(
      (cls) => cls.startsWith("effect-") || cls === "text-effect",
    );
    classesToRemove.forEach((cls) => preview.classList.remove(cls));

    if (!effect || !effect.enabled || effect.type === "none") {
      return;
    }

    // エフェクトクラスを追加
    let effectClass = `effect-${effect.type}`;
    if (effect.type === "slideIn" && effect.config?.direction) {
      effectClass += `-${effect.config.direction}`;
    }

    preview.classList.add("text-effect");
    preview.classList.add(effectClass);

    // 速度クラス
    const speed = effect.speed || 1.0;
    if (speed < 0.8) {
      preview.classList.add("effect-speed-slow");
    } else if (speed > 1.2) {
      preview.classList.add("effect-speed-fast");
    } else {
      preview.classList.add("effect-speed-normal");
    }

    // Easingクラス
    const easing = effect.config?.easing || "ease";
    preview.classList.add(`effect-easing-${easing}`);

    // アニメーション終了後にクラスを削除
    const handleAnimationEnd = () => {
      classesToRemove.forEach((cls) => preview.classList.remove(cls));
      preview.removeEventListener("animationend", handleAnimationEnd);
    };
    preview.addEventListener("animationend", handleAnimationEnd);
  }
}

// DOMContentLoaded後に初期化
document.addEventListener("DOMContentLoaded", () => {
  new TextEditorApp();
});
