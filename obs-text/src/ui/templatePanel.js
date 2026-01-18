/**
 * TemplatePanel
 * テンプレート管理UI
 */
import { Template } from "../domain/template.js";
import { ExportService } from "../infrastructure/exportService.js";

export class TemplatePanel {
  constructor(repository, onApply) {
    this.repository = repository;
    this.onApply = onApply;
    this.panel = null;
  }

  /**
   * パネルHTMLを生成
   */
  render() {
    const templates = this.repository.getAll();

    return `
      <div class="customize-panel template-panel" role="dialog" aria-labelledby="template-panel-title">
        <div class="panel-header">
          <h2 id="template-panel-title">テンプレート</h2>
          <button class="panel-close" data-action="close" aria-label="閉じる">&times;</button>
        </div>

        <!-- C4: エラーメッセージ表示領域（aria-live） -->
        <div class="error-messages" aria-live="polite" aria-atomic="true" style="display: none;"></div>

        <!-- W1: カスタム削除確認モーダル -->
        <div class="delete-modal" style="display: none;" role="alertdialog" aria-labelledby="delete-modal-title" aria-describedby="delete-modal-description">
          <div class="delete-modal-content">
            <h3 id="delete-modal-title">削除確認</h3>
            <p id="delete-modal-description"></p>
            <div class="delete-modal-actions">
              <button class="btn btn-danger" data-action="confirm-delete" style="background-color: #dc3545; color: white;">削除</button>
              <button class="btn btn-secondary" data-action="cancel-delete">キャンセル</button>
            </div>
          </div>
        </div>

        <div class="panel-body">
          <!-- 保存済みテンプレート一覧 -->
          <section class="template-section">
            <h3>保存済みテンプレート</h3>

            ${
              templates.length === 0
                ? '<p class="empty-message">保存されたテンプレートはありません</p>'
                : `
              <div class="template-list">
                ${templates
                  .map(
                    (template) => `
                  <div class="template-item" data-id="${template.id}">
                    <div class="template-info">
                      <div class="template-name">${template.name}</div>
                      <div class="template-meta">
                        <small>${new Date(template.updatedAt).toLocaleDateString()}</small>
                      </div>
                    </div>
                    <div class="template-actions">
                      <button class="btn btn-secondary btn-sm" data-action="load" data-id="${template.id}">
                        読込
                      </button>
                      <button class="btn btn-danger btn-sm" data-action="delete" data-id="${template.id}" aria-label="${template.name}を削除">
                        削除
                      </button>
                    </div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            `
            }
          </section>

          <!-- 新規保存 -->
          <section class="template-section">
            <h3>現在のスタイルを保存</h3>
            <div class="form-group">
              <label for="template-name" class="form-label">テンプレート名</label>
              <input
                type="text"
                id="template-name"
                class="form-input"
                placeholder="例: マイスタイル"
                maxlength="50"
                aria-required="true"
              >
            </div>
            <button class="btn btn-primary" data-action="save">
              💾 保存
            </button>
          </section>

          <!-- プリセット -->
          <section class="template-section">
            <h3>プリセット</h3>
            <div class="preset-grid">
              ${Object.keys(Template.presets)
                .map(
                  (key) => `
                <button class="preset-btn" data-preset="${key}">
                  ${Template.presets[key].name}
                </button>
              `,
                )
                .join("")}
            </div>
          </section>

          <!-- Phase 3-4: エクスポート/インポート -->
          <section class="template-section">
            <h3>バックアップ</h3>
            <div class="export-import-actions">
              <button class="btn btn-secondary" data-action="export">
                📤 エクスポート
              </button>
              <button class="btn btn-secondary" data-action="import">
                📥 インポート
              </button>
            </div>
            <small class="form-hint">
              エクスポート: テンプレートをファイルに保存<br>
              インポート: ファイルからテンプレートを読み込み
            </small>
          </section>
        </div>
      </div>
    `;
  }

  /**
   * パネルをマウント
   */
  mount(container) {
    container.innerHTML = this.render();
    this.panel = container.querySelector(".template-panel");
    this.attachEventListeners();
  }

  /**
   * イベントリスナー登録
   */
  attachEventListeners() {
    if (!this.panel) return;

    this.panel.addEventListener("click", (e) => {
      const action = e.target.dataset.action;

      switch (action) {
        case "close":
          this.hide();
          break;
        case "save":
          this.handleSave();
          break;
        case "load":
          this.handleLoad(e.target.dataset.id);
          break;
        case "delete":
          this.handleDelete(e.target.dataset.id);
          break;
        case "confirm-delete":
          this.confirmDelete();
          break;
        case "cancel-delete":
          this.cancelDelete();
          break;
        case "export":
          this.handleExport();
          break;
        case "import":
          this.handleImport();
          break;
      }

      // プリセット
      if (e.target.classList.contains("preset-btn")) {
        const preset = e.target.dataset.preset;
        this.handlePreset(preset);
      }
    });

    // W3: キーボードナビゲーション設定
    this.setupKeyboardNavigation();
  }

  /**
   * 保存処理
   */
  handleSave() {
    const nameInput = this.panel.querySelector("#template-name");
    const name = nameInput.value.trim();

    if (!name) {
      this.showError("テンプレート名を入力してください");
      nameInput.focus();
      return;
    }

    // 現在のスタイルを取得（外部から渡される想定）
    if (!this.onApply) {
      this.showError("スタイル情報を取得できませんでした");
      return;
    }

    // コールバックで現在のスタイルを保存
    // main.jsで実装
    if (this.onSaveRequest) {
      const uniqueName = this.repository.getUniqueName(name);
      this.onSaveRequest(uniqueName);
      nameInput.value = "";
      this.refresh();
    }
  }

  /**
   * 読込処理
   */
  handleLoad(templateId) {
    const template = this.repository.getById(templateId);
    if (!template) {
      this.showError("テンプレートが見つかりませんでした");
      return;
    }

    this.onApply(template);
    this.hide();
  }

  /**
   * 削除処理
   */
  handleDelete(templateId) {
    const template = this.repository.getById(templateId);
    if (!template) return;

    // W1: カスタムモーダルで削除確認
    this.showDeleteModal(template);
  }

  /**
   * W1: 削除モーダル表示
   */
  showDeleteModal(template) {
    this.deleteTargetId = template.id;
    
    const modal = this.panel.querySelector(".delete-modal");
    const description = modal.querySelector("#delete-modal-description");
    
    description.textContent = `「${template.name}」を削除しますか？`;
    modal.style.display = "flex";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "10000";

    // モーダル内の削除ボタンにフォーカス
    const deleteBtn = modal.querySelector('[data-action="confirm-delete"]');
    setTimeout(() => deleteBtn.focus(), 100);
  }

  /**
   * W1: 削除実行
   */
  confirmDelete() {
    if (!this.deleteTargetId) return;

    if (this.repository.delete(this.deleteTargetId)) {
      this.refresh();
      this.showSuccess("テンプレートを削除しました");
    }

    this.cancelDelete();
  }

  /**
   * W1: 削除キャンセル
   */
  cancelDelete() {
    const modal = this.panel.querySelector(".delete-modal");
    modal.style.display = "none";
    this.deleteTargetId = null;
  }

  /**
   * C4: エラーメッセージ表示（aria-live使用）
   */
  showError(message) {
    const errorContainer = this.panel.querySelector(".error-messages");
    if (!errorContainer) return;

    errorContainer.textContent = message;
    errorContainer.style.display = "block";
    errorContainer.style.padding = "10px";
    errorContainer.style.marginBottom = "10px";
    errorContainer.style.backgroundColor = "#f8d7da";
    errorContainer.style.border = "1px solid #dc3545";
    errorContainer.style.borderRadius = "4px";
    errorContainer.style.color = "#721c24";

    setTimeout(() => {
      errorContainer.style.display = "none";
      errorContainer.textContent = "";
    }, 5000);
  }

  /**
   * C4: 成功メッセージ表示（aria-live使用）
   */
  showSuccess(message) {
    const errorContainer = this.panel.querySelector(".error-messages");
    if (!errorContainer) return;

    errorContainer.textContent = message;
    errorContainer.style.display = "block";
    errorContainer.style.padding = "10px";
    errorContainer.style.marginBottom = "10px";
    errorContainer.style.backgroundColor = "#d4edda";
    errorContainer.style.border = "1px solid #28a745";
    errorContainer.style.borderRadius = "4px";
    errorContainer.style.color = "#155724";

    setTimeout(() => {
      errorContainer.style.display = "none";
      errorContainer.textContent = "";
    }, 3000);
  }

  /**
   * W3: キーボードナビゲーション設定
   */
  setupKeyboardNavigation() {
    const panel = this.panel;
    if (!panel) return;

    // ESCキーでパネルを閉じる
    panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // モーダル表示中ならモーダルを閉じる
        const modal = panel.querySelector(".delete-modal");
        if (modal && modal.style.display === "flex") {
          this.cancelDelete();
        } else {
          this.hide();
        }
      }
    });

    // フォーカストラップ（Tab循環）
    const focusableElements = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    panel.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          // Shift+Tab: 最初の要素から戻る場合は最後の要素へ
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: 最後の要素から進む場合は最初の要素へ
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    });

    // 初期フォーカス設定
    this.setInitialFocus();
  }

  /**
   * W3: 初期フォーカス設定
   */
  setInitialFocus() {
    const panel = this.panel;
    if (!panel) return;

    // パネル表示時に最初のフォーカス可能要素にフォーカス
    const firstFocusable = panel.querySelector(
      'button:not(.panel-close), [href], input, select, textarea'
    );
    
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 100);
    }
  }

  /**
   * プリセット読込
   */
  handlePreset(presetName) {
    try {
      const template = Template.fromPreset(presetName);
      this.onApply(template);
      this.hide();
    } catch (error) {
      console.error("Failed to load preset:", error);
      this.showError("プリセットの読み込みに失敗しました");
    }
  }

  /**
   * Phase 3-4: エクスポート処理
   */
  handleExport() {
    try {
      const templates = this.repository.getAll();

      if (templates.length === 0) {
        this.showError("エクスポートするテンプレートがありません");
        return;
      }

      const jsonString = ExportService.exportTemplates(templates);
      ExportService.downloadAsFile(
        jsonString,
        `obs-text-templates-${Date.now()}.json`,
      );

      this.showSuccess(`${templates.length}件のテンプレートをエクスポートしました`);
    } catch (error) {
      console.error("Export failed:", error);
      this.showError(error.message || "エクスポートに失敗しました");
    }
  }

  /**
   * Phase 3-4: インポート処理
   */
  async handleImport() {
    try {
      const jsonString = await ExportService.selectFileAndRead();

      // バリデーション
      const validation = ExportService.validateTemplateJSON(jsonString);
      if (!validation.valid) {
        this.showError(`無効なファイル形式です: ${validation.error}`);
        return;
      }

      const data = ExportService.importTemplates(jsonString);

      // W1: カスタム確認モーダルの代わりに標準confirm（インポート用）
      const confirmed = confirm(
        `${data.length}件のテンプレートをインポートしますか?\n既存の同じIDのテンプレートは上書きされます。`,
      );

      if (!confirmed) return;

      // インポート実行
      let successCount = 0;
      for (const item of data) {
        const template = Template.fromFirestore(item);
        if (this.repository.save(template)) {
          successCount++;
        }
      }

      this.showSuccess(`${successCount}件のテンプレートをインポートしました`);
      this.refresh();
    } catch (error) {
      console.error("Import failed:", error);
      this.showError(error.message || "インポートに失敗しました");
    }
  }

  /**
   * パネルを表示
   */
  show() {
    if (this.panel) {
      this.refresh();
      this.panel.parentElement.style.display = "block";
      this.setInitialFocus();
    }
  }

  /**
   * パネルを非表示
   */
  hide() {
    if (this.panel) {
      this.panel.parentElement.style.display = "none";
    }
  }

  /**
   * パネルを再描画
   */
  refresh() {
    const container = this.panel.parentElement;
    this.mount(container);
  }

  /**
   * 保存リクエストコールバック設定
   */
  setOnSaveRequest(callback) {
    this.onSaveRequest = callback;
  }
}
