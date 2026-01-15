/**
 * CustomizePanel UI Component
 * スタイルカスタマイズパネルのUI管理
 */
import { ExtendedStyle } from "../domain/style.js";
import { Effect } from "../domain/effect.js";
import { Template } from "../domain/template.js";

export class CustomizePanel {
  constructor(
    container,
    { onStyleChange, onEffectChange, onTemplateSelect } = {},
  ) {
    this.container = container;
    this.onStyleChange = onStyleChange || (() => {});
    this.onEffectChange = onEffectChange || (() => {});
    this.onTemplateSelect = onTemplateSelect || (() => {});

    this.currentStyle = new ExtendedStyle();
    this.currentEffect = new Effect();

    this.render();
    this.attachEventListeners();
  }

  /**
   * パネルのHTMLを生成
   */
  render() {
    this.container.innerHTML = `
      <div class="customize-panel">
        <div class="panel-header">
          <h3>スタイルカスタマイズ</h3>
          <button class="panel-close" aria-label="閉じる">×</button>
        </div>

        <div class="panel-content">
          <section class="panel-section">
            <h4>プリセット</h4>
            <div class="template-grid">
              ${this.renderTemplateButtons()}
            </div>
          </section>

          <section class="panel-section">
            <h4>フォント</h4>
            <div class="form-group">
              <label>フォントファミリー</label>
              <select id="fontFamily" class="form-control">
                <option value="Arial">Arial</option>
                <option value="Arial Black">Arial Black</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Yu Gothic">Yu Gothic</option>
                <option value="Meiryo">Meiryo</option>
                <option value="MS Gothic">MS Gothic</option>
              </select>
            </div>
            <div class="form-group">
              <label>フォントサイズ: <span id="fontSizeValue">48</span>px</label>
              <input type="range" id="fontSize" class="form-control" min="12" max="120" value="48">
            </div>
            <div class="form-group">
              <label>文字色</label>
              <input type="color" id="color" class="form-control" value="#FFFFFF">
            </div>
          </section>

          <section class="panel-section">
            <h4>
              <label>
                <input type="checkbox" id="shadowEnabled"> シャドウ
                <span class="tooltip-icon" title="テキストに影をつけて読みやすくします">ⓘ</span>
              </label>
            </h4>
            <div id="shadowControls" class="sub-controls">
              <div class="form-group">
                <label>色</label>
                <input type="color" id="shadowColor" class="form-control" value="#000000">
              </div>
              <div class="form-group">
                <label>ぼかし: <span id="shadowBlurValue">4</span>px</label>
                <input type="range" id="shadowBlur" class="form-control" min="0" max="20" value="4">
              </div>
              <div class="form-group">
                <label>X方向: <span id="shadowXValue">2</span>px</label>
                <input type="range" id="shadowX" class="form-control" min="-20" max="20" value="2">
              </div>
              <div class="form-group">
                <label>Y方向: <span id="shadowYValue">2</span>px</label>
                <input type="range" id="shadowY" class="form-control" min="-20" max="20" value="2">
              </div>
            </div>
          </section>

          <section class="panel-section">
            <h4>
              <label>
                <input type="checkbox" id="strokeEnabled"> 縁取り
                <span class="tooltip-icon" title="テキストの周りに枠線を追加して目立たせます">ⓘ</span>
              </label>
            </h4>
            <div id="strokeControls" class="sub-controls">
              <div class="form-group">
                <label>色</label>
                <input type="color" id="strokeColor" class="form-control" value="#000000">
              </div>
              <div class="form-group">
                <label>太さ: <span id="strokeWidthValue">2</span>px</label>
                <input type="range" id="strokeWidth" class="form-control" min="1" max="10" value="2">
              </div>
            </div>
          </section>

          <section class="panel-section">
            <h4>位置</h4>
            <div class="form-group">
              <label>水平位置: <span id="posXValue">50</span>%</label>
              <input type="range" id="posX" class="form-control" min="0" max="100" value="50">
            </div>
            <div class="form-group">
              <label>垂直位置: <span id="posYValue">50</span>%</label>
              <input type="range" id="posY" class="form-control" min="0" max="100" value="50">
            </div>
            <div class="form-group">
              <label>揃え</label>
              <select id="posAlign" class="form-control">
                <option value="left">左揃え</option>
                <option value="center" selected>中央揃え</option>
                <option value="right">右揃え</option>
              </select>
            </div>
          </section>

          <section class="panel-section" style="display: none;">
            <h4>
              <label>
                <input type="checkbox" id="effectEnabled"> エフェクト
              </label>
            </h4>
            <div id="effectControls" class="sub-controls">
              <div class="form-group">
                <label>タイプ</label>
                <select id="effectType" class="form-control">
                  <option value="none">なし</option>
                  <option value="fadeIn">フェードイン</option>
                  <option value="slideIn">スライドイン</option>
                  <option value="typewriter">タイプライター</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <div class="panel-footer">
          <button class="btn btn-primary" id="applyBtn">適用</button>
          <button class="btn btn-secondary" id="resetBtn">リセット</button>
        </div>
      </div>
    `;
  }

  /**
   * テンプレートボタンを生成
   */
  renderTemplateButtons() {
    return Object.keys(Template.presets)
      .map((key) => {
        const preset = Template.presets[key];
        return `
        <button class="template-btn" data-template="${key}">
          ${preset.name}
        </button>
      `;
      })
      .join("");
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

    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;

    if (max === min) return false;

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

    return h >= 0.25 && h <= 0.42 && s > 0.4;
  }

  /**
   * 緑色を安全な色に変換
   * @param {string} hexColor - #RRGGBB形式の色
   * @returns {string}
   */
  convertFromGreen(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    const newR = r;
    const newG = Math.floor(g * 0.7);
    const newB = Math.min(255, b + Math.floor(g * 0.3));

    return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
  }

  /**
   * イベントリスナーを設定
   */
  attachEventListeners() {
    // 閉じるボタン
    this.container
      .querySelector(".panel-close")
      .addEventListener("click", () => {
        this.hide();
      });

    // テンプレート選択
    this.container.querySelectorAll(".template-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const templateName = btn.dataset.template;
        this.applyTemplate(templateName);
      });
    });

    // リアルタイム更新用のinputイベント
    const inputs = this.container.querySelectorAll("input, select");
    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        // 色入力の場合は緑色チェック
        if (input.type === "color" && this.isChromaKeyGreen(input.value)) {
          const safeColor = this.convertFromGreen(input.value);
          alert(
            `⚠️ クロマキー警告\n\n緑系統の色はOBSのクロマキーで透明化されます。\n自動的に安全な色（${safeColor}）に変換しました。`,
          );
          input.value = safeColor;
        }
        this.updatePreview();
      });
    });

    // チェックボックスでコントロールの表示/非表示
    this.container
      .querySelector("#shadowEnabled")
      .addEventListener("change", (e) => {
        this.container.querySelector("#shadowControls").style.display = e.target
          .checked
          ? "block"
          : "none";
        this.updatePreview();
      });

    this.container
      .querySelector("#strokeEnabled")
      .addEventListener("change", (e) => {
        this.container.querySelector("#strokeControls").style.display = e.target
          .checked
          ? "block"
          : "none";
        this.updatePreview();
      });

    // スライダーの値表示更新
    this.setupRangeValueDisplay("#fontSize", "#fontSizeValue");
    this.setupRangeValueDisplay("#shadowBlur", "#shadowBlurValue");
    this.setupRangeValueDisplay("#shadowX", "#shadowXValue");
    this.setupRangeValueDisplay("#shadowY", "#shadowYValue");
    this.setupRangeValueDisplay("#strokeWidth", "#strokeWidthValue");
    this.setupRangeValueDisplay("#posX", "#posXValue");
    this.setupRangeValueDisplay("#posY", "#posYValue");

    // 適用ボタン
    this.container.querySelector("#applyBtn").addEventListener("click", () => {
      this.apply();
    });

    // リセットボタン
    this.container.querySelector("#resetBtn").addEventListener("click", () => {
      this.reset();
    });
  }

  /**
   * レンジスライダーの値表示を設定
   */
  setupRangeValueDisplay(rangeId, valueId) {
    const range = this.container.querySelector(rangeId);
    const valueSpan = this.container.querySelector(valueId);
    range.addEventListener("input", () => {
      valueSpan.textContent = range.value;
    });
  }

  /**
   * プレビュー更新
   */
  updatePreview() {
    const style = this.getStyleFromForm();
    this.currentStyle = style;
    this.onStyleChange(style);
  }

  /**
   * フォームから現在のスタイルを取得
   */
  getStyleFromForm() {
    const shadowEnabled =
      this.container.querySelector("#shadowEnabled").checked;
    const strokeEnabled =
      this.container.querySelector("#strokeEnabled").checked;

    return new ExtendedStyle({
      fontFamily: this.container.querySelector("#fontFamily").value,
      fontSize: parseInt(this.container.querySelector("#fontSize").value),
      color: this.container.querySelector("#color").value,
      shadow: shadowEnabled
        ? {
            color: this.container.querySelector("#shadowColor").value,
            blur: parseInt(this.container.querySelector("#shadowBlur").value),
            offsetX: parseInt(this.container.querySelector("#shadowX").value),
            offsetY: parseInt(this.container.querySelector("#shadowY").value),
          }
        : null,
      stroke: strokeEnabled
        ? {
            color: this.container.querySelector("#strokeColor").value,
            width: parseInt(this.container.querySelector("#strokeWidth").value),
          }
        : null,
      position: {
        x: parseInt(this.container.querySelector("#posX").value),
        y: parseInt(this.container.querySelector("#posY").value),
        align: this.container.querySelector("#posAlign").value,
      },
    });
  }

  /**
   * スタイルをフォームに反映
   */
  setStyleToForm(style) {
    this.container.querySelector("#fontFamily").value = style.fontFamily;
    this.container.querySelector("#fontSize").value = style.fontSize;
    this.container.querySelector("#fontSizeValue").textContent = style.fontSize;
    this.container.querySelector("#color").value = style.color;

    // シャドウ
    if (style.shadow) {
      this.container.querySelector("#shadowEnabled").checked = true;
      this.container.querySelector("#shadowControls").style.display = "block";
      this.container.querySelector("#shadowColor").value = style.shadow.color;
      this.container.querySelector("#shadowBlur").value = style.shadow.blur;
      this.container.querySelector("#shadowBlurValue").textContent =
        style.shadow.blur;
      this.container.querySelector("#shadowX").value = style.shadow.offsetX;
      this.container.querySelector("#shadowXValue").textContent =
        style.shadow.offsetX;
      this.container.querySelector("#shadowY").value = style.shadow.offsetY;
      this.container.querySelector("#shadowYValue").textContent =
        style.shadow.offsetY;
    } else {
      this.container.querySelector("#shadowEnabled").checked = false;
      this.container.querySelector("#shadowControls").style.display = "none";
    }

    // ストローク
    if (style.stroke) {
      this.container.querySelector("#strokeEnabled").checked = true;
      this.container.querySelector("#strokeControls").style.display = "block";
      this.container.querySelector("#strokeColor").value = style.stroke.color;
      this.container.querySelector("#strokeWidth").value = style.stroke.width;
      this.container.querySelector("#strokeWidthValue").textContent =
        style.stroke.width;
    } else {
      this.container.querySelector("#strokeEnabled").checked = false;
      this.container.querySelector("#strokeControls").style.display = "none";
    }

    // 位置
    this.container.querySelector("#posX").value = style.position.x;
    this.container.querySelector("#posXValue").textContent = style.position.x;
    this.container.querySelector("#posY").value = style.position.y;
    this.container.querySelector("#posYValue").textContent = style.position.y;
    this.container.querySelector("#posAlign").value = style.position.align;
  }

  /**
   * テンプレートを適用
   */
  applyTemplate(templateName) {
    const template = Template.fromPreset(templateName);
    this.currentStyle = template.style;
    this.currentEffect = template.effect;

    this.setStyleToForm(template.style);
    this.onTemplateSelect(template);
  }

  /**
   * 適用
   */
  apply() {
    const style = this.getStyleFromForm();
    this.onStyleChange(style);
  }

  /**
   * リセット
   */
  reset() {
    this.currentStyle = new ExtendedStyle();
    this.setStyleToForm(this.currentStyle);
    this.onStyleChange(this.currentStyle);
  }

  /**
   * パネルを表示
   */
  show() {
    this.container.style.display = "block";
  }

  /**
   * パネルを非表示
   */
  hide() {
    this.container.style.display = "none";
  }

  /**
   * パネルの表示/非表示を切り替え
   */
  toggle() {
    if (this.container.style.display === "none") {
      this.show();
    } else {
      this.hide();
    }
  }
}
