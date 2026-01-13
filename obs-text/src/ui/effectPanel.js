/**
 * EffectPanel
 * テキストエフェクト設定UI
 */
import { Effect } from "../domain/effect.js";

export class EffectPanel {
  constructor(onEffectChange) {
    this.onEffectChange = onEffectChange;
    this.panel = null;
    this.currentEffect = new Effect();
  }

  /**
   * パネルHTMLを生成
   */
  render() {
    return `
      <div class="customize-panel effect-panel">
        <div class="panel-header">
          <h2>✨ エフェクト設定</h2>
          <button class="panel-close" data-action="close">&times;</button>
        </div>

        <div class="panel-body">
          <!-- エフェクトタイプ選択 -->
          <section class="effect-section">
            <h3>エフェクトタイプ</h3>
            <div class="form-group">
              <select id="effect-type" class="form-select">
                <option value="none">なし</option>
                <option value="fadeIn">フェードイン</option>
                <option value="fadeOut">フェードアウト</option>
                <option value="slideIn">スライドイン</option>
                <option value="typewriter">タイプライター</option>
                <option value="bounce">バウンス</option>
                <option value="scaleIn">スケールイン</option>
              </select>
            </div>
          </section>

          <!-- スライド方向（slideInのみ） -->
          <section class="effect-section" id="slide-direction-section" style="display: none;">
            <h3>スライド方向</h3>
            <div class="form-group">
              <select id="slide-direction" class="form-select">
                <option value="left">左から</option>
                <option value="right">右から</option>
                <option value="top">上から</option>
                <option value="bottom">下から</option>
              </select>
            </div>
          </section>

          <!-- 速度設定 -->
          <section class="effect-section">
            <h3>アニメーション速度</h3>
            <div class="form-group">
              <label for="effect-speed" class="form-label">
                速度: <span id="effect-speed-value">1.0x</span>
              </label>
              <input
                type="range"
                id="effect-speed"
                class="form-range"
                min="0.5"
                max="2.0"
                step="0.1"
                value="1.0"
              >
              <small class="form-hint">0.5x (遅い) ～ 2.0x (速い)</small>
            </div>
          </section>

          <!-- Easing -->
          <section class="effect-section">
            <h3>イージング</h3>
            <div class="form-group">
              <select id="effect-easing" class="form-select">
                <option value="ease">ease (標準)</option>
                <option value="linear">linear (等速)</option>
                <option value="ease-in">ease-in (加速)</option>
                <option value="ease-out">ease-out (減速)</option>
                <option value="ease-in-out">ease-in-out (加減速)</option>
              </select>
            </div>
          </section>

          <!-- プレビューボタン -->
          <section class="effect-section">
            <button id="effect-preview-btn" class="btn btn-primary">
              🎬 プレビュー
            </button>
          </section>

          <!-- 適用ボタン -->
          <section class="effect-section">
            <button id="effect-apply-btn" class="btn btn-success">
              ✅ 適用
            </button>
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
    this.panel = container.querySelector(".effect-panel");
    this.attachEventListeners();
  }

  /**
   * イベントリスナー登録
   */
  attachEventListeners() {
    if (!this.panel) return;

    // エフェクトタイプ変更
    const typeSelect = this.panel.querySelector("#effect-type");
    const slideDirectionSection = this.panel.querySelector(
      "#slide-direction-section",
    );

    typeSelect?.addEventListener("change", (e) => {
      const type = e.target.value;

      // slideInの場合のみ方向選択を表示
      if (type === "slideIn") {
        slideDirectionSection.style.display = "block";
      } else {
        slideDirectionSection.style.display = "none";
      }

      this.updateCurrentEffect();
    });

    // スライド方向変更
    const slideDirectionSelect = this.panel.querySelector("#slide-direction");
    slideDirectionSelect?.addEventListener("change", () => {
      this.updateCurrentEffect();
    });

    // 速度変更
    const speedSlider = this.panel.querySelector("#effect-speed");
    const speedValue = this.panel.querySelector("#effect-speed-value");
    speedSlider?.addEventListener("input", (e) => {
      speedValue.textContent = `${e.target.value}x`;
      this.updateCurrentEffect();
    });

    // Easing変更
    const easingSelect = this.panel.querySelector("#effect-easing");
    easingSelect?.addEventListener("change", () => {
      this.updateCurrentEffect();
    });

    // プレビューボタン
    const previewBtn = this.panel.querySelector("#effect-preview-btn");
    previewBtn?.addEventListener("click", () => {
      this.previewEffect();
    });

    // 適用ボタン
    const applyBtn = this.panel.querySelector("#effect-apply-btn");
    applyBtn?.addEventListener("click", () => {
      this.applyEffect();
    });

    // 閉じるボタン
    const closeBtn = this.panel.querySelector('[data-action="close"]');
    closeBtn?.addEventListener("click", () => {
      this.hide();
    });
  }

  /**
   * 現在のUI値からEffectを更新
   */
  updateCurrentEffect() {
    const type = this.panel.querySelector("#effect-type")?.value || "none";
    const speed = parseFloat(
      this.panel.querySelector("#effect-speed")?.value || "1.0",
    );
    const easing = this.panel.querySelector("#effect-easing")?.value || "ease";
    const direction =
      this.panel.querySelector("#slide-direction")?.value || "left";

    this.currentEffect = new Effect({
      type,
      speed,
      enabled: type !== "none",
      config: {
        easing,
        direction,
      },
    });
  }

  /**
   * エフェクトをプレビュー
   */
  previewEffect() {
    this.updateCurrentEffect();

    if (this.currentEffect.type === "none") {
      alert("エフェクトが選択されていません");
      return;
    }

    // コールバックで外部にプレビュー依頼
    if (this.onEffectChange) {
      this.onEffectChange(this.currentEffect, true); // 第2引数: プレビューフラグ
    }
  }

  /**
   * エフェクトを適用
   */
  applyEffect() {
    this.updateCurrentEffect();

    if (this.onEffectChange) {
      this.onEffectChange(this.currentEffect, false);
    }

    this.hide();
  }

  /**
   * パネルを表示
   */
  show() {
    if (this.panel) {
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
   * 既存のエフェクトをロード
   */
  loadEffect(effect) {
    this.currentEffect = effect;

    // UI反映
    const typeSelect = this.panel?.querySelector("#effect-type");
    const speedSlider = this.panel?.querySelector("#effect-speed");
    const speedValue = this.panel?.querySelector("#effect-speed-value");
    const easingSelect = this.panel?.querySelector("#effect-easing");
    const directionSelect = this.panel?.querySelector("#slide-direction");
    const slideDirectionSection = this.panel?.querySelector(
      "#slide-direction-section",
    );

    if (typeSelect) typeSelect.value = effect.type;
    if (speedSlider) speedSlider.value = effect.speed.toString();
    if (speedValue) speedValue.textContent = `${effect.speed}x`;
    if (easingSelect) easingSelect.value = effect.config.easing || "ease";
    if (directionSelect)
      directionSelect.value = effect.config.direction || "left";

    // slideInの場合のみ方向選択を表示
    if (slideDirectionSection) {
      slideDirectionSection.style.display =
        effect.type === "slideIn" ? "block" : "none";
    }
  }
}
