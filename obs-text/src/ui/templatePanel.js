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
      <div class="customize-panel template-panel">
        <div class="panel-header">
          <h2>📁 テンプレート</h2>
          <button class="panel-close" data-action="close">&times;</button>
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
                      <button class="btn btn-danger btn-sm" data-action="delete" data-id="${template.id}">
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
  }

  /**
   * 保存処理
   */
  handleSave() {
    const nameInput = this.panel.querySelector("#template-name");
    const name = nameInput.value.trim();

    if (!name) {
      alert("テンプレート名を入力してください");
      return;
    }

    // 現在のスタイルを取得（外部から渡される想定）
    if (!this.onApply) {
      alert("スタイル情報を取得できませんでした");
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
      alert("テンプレートが見つかりませんでした");
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

    if (!confirm(`「${template.name}」を削除しますか？`)) {
      return;
    }

    if (this.repository.delete(templateId)) {
      this.refresh();
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
      alert("プリセットの読み込みに失敗しました");
    }
  }

  /**
   * Phase 3-4: エクスポート処理
   */
  handleExport() {
    try {
      const templates = this.repository.getAll();

      if (templates.length === 0) {
        alert("エクスポートするテンプレートがありません");
        return;
      }

      const jsonString = ExportService.exportTemplates(templates);
      ExportService.downloadAsFile(
        jsonString,
        `obs-text-templates-${Date.now()}.json`,
      );

      alert(`${templates.length}件のテンプレートをエクスポートしました`);
    } catch (error) {
      console.error("Export failed:", error);
      alert(error.message || "エクスポートに失敗しました");
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
        alert(`無効なファイル形式です: ${validation.error}`);
        return;
      }

      const data = ExportService.importTemplates(jsonString);

      // 確認
      const confirmed = confirm(
        `${data.length}件のテンプレートをインポートしますか？\n既存の同じIDのテンプレートは上書きされます。`,
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

      alert(`${successCount}件のテンプレートをインポートしました`);
      this.refresh();
    } catch (error) {
      console.error("Import failed:", error);
      alert(error.message || "インポートに失敗しました");
    }
  }

  /**
   * パネルを表示
   */
  show() {
    if (this.panel) {
      this.refresh();
      this.panel.parentElement.style.display = "block";
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
