/**
 * SetupWizard - OBS テキスト表示ツールの初回セットアップウィザード
 */
class SetupWizard {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.state = {
      currentStep: 0,
      answers: {},
      completed: false
    };
    this.steps = [
      { id: 'welcome', title: 'ようこそ！', render: () => this.renderWelcome() },
      { id: 'obs-check', title: 'OBSの確認', render: () => this.renderObsCheck() },
      { id: 'text-color', title: 'テキスト色', render: () => this.renderTextColor() },
      { id: 'background', title: '背景設定', render: () => this.renderBackground() },
      { id: 'complete', title: '設定完了', render: () => this.renderComplete() }
    ];
  }

  /**
   * ウィザードを表示すべきか判定
   */
  static shouldShow() {
    return !localStorage.getItem('wizard-completed');
  }

  /**
   * ウィザードを開始
   */
  start() {
    this.restoreState();
    this.createModal();
    this.renderStep(this.state.currentStep);
  }

  /**
   * モーダルHTMLを生成
   */
  createModal() {
    const modal = document.createElement('div');
    modal.className = 'wizard-modal active';
    modal.innerHTML = `
      <div class="wizard-content">
        <div class="wizard-progress">
          <div class="wizard-progress-bar" style="width: 0%"></div>
          <span class="wizard-progress-text">ステップ 1 / 5</span>
        </div>
        <div class="wizard-step-container"></div>
        <div class="wizard-nav">
          <button class="btn btn-secondary wizard-prev" disabled>戻る</button>
          <button class="btn btn-primary wizard-next">次へ</button>
          <button class="wizard-skip">スキップ</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modal = modal;
    this.attachEventListeners();
  }

  /**
   * ステップをレンダリング
   */
  renderStep(stepIndex) {
    const step = this.steps[stepIndex];
    const container = this.modal.querySelector('.wizard-step-container');
    container.innerHTML = step.render();

    // プログレスバー更新
    const progress = ((stepIndex + 1) / this.steps.length) * 100;
    this.modal.querySelector('.wizard-progress-bar').style.width = `${progress}%`;
    this.modal.querySelector('.wizard-progress-text').textContent = 
      `ステップ ${stepIndex + 1} / ${this.steps.length}`;

    // ナビゲーションボタンの状態更新
    const prevBtn = this.modal.querySelector('.wizard-prev');
    const nextBtn = this.modal.querySelector('.wizard-next');
    const skipBtn = this.modal.querySelector('.wizard-skip');

    prevBtn.disabled = stepIndex === 0;
    
    if (stepIndex === this.steps.length - 1) {
      nextBtn.textContent = '完了';
      skipBtn.style.display = 'none';
    } else {
      nextBtn.textContent = '次へ';
      skipBtn.style.display = 'block';
    }

    // ステップ固有のイベントリスナーを追加
    this.attachStepEventListeners(step.id);
  }

  /**
   * Step 0: ようこそ
   */
  renderWelcome() {
    return `
      <h2>ようこそ！OBSテキスト表示ツールへ</h2>
      <p>初めて使いますか？</p>
      <div class="wizard-options">
        <button class="wizard-option" data-value="yes">はい、初めてです</button>
        <button class="wizard-option" data-value="no">いいえ、使ったことがあります</button>
      </div>
    `;
  }

  /**
   * Step 1: OBS確認
   */
  renderObsCheck() {
    return `
      <h2>OBSの確認</h2>
      <p>OBS Studioは起動していますか？</p>
      <div class="wizard-options">
        <button class="wizard-option" data-value="yes">はい、起動しています</button>
        <button class="wizard-option" data-value="no">いいえ、まだです</button>
      </div>
      <div class="wizard-help" id="obs-help" style="display:none;">
        <p>⚠️ OBS Studioを起動してから、次のステップに進んでください。</p>
        <ol>
          <li>OBS Studioを起動</li>
          <li>ソースに「ブラウザ」を追加</li>
          <li>準備ができたら「次へ」をクリック</li>
        </ol>
      </div>
    `;
  }

  /**
   * Step 2: テキスト色
   */
  renderTextColor() {
    const currentColor = this.state.answers.textColor || '#ffffff';
    return `
      <h2>テキストの色を選んでください</h2>
      <div class="wizard-color-picker">
        <button class="wizard-color-preset" data-color="#ffffff">白</button>
        <button class="wizard-color-preset" data-color="#000000">黒</button>
        <button class="wizard-color-preset" data-color="#ff0000">赤</button>
        <button class="wizard-color-preset" data-color="#00ff00">緑</button>
        <button class="wizard-color-preset" data-color="#0000ff">青</button>
        <input type="color" class="wizard-color-custom" value="${currentColor}">
      </div>
      <div class="wizard-preview">
        <div id="wizard-preview-text" style="color: ${currentColor};">プレビュー表示</div>
      </div>
    `;
  }

  /**
   * Step 3: 背景設定
   */
  renderBackground() {
    return `
      <h2>背景設定</h2>
      <p>背景を透明にしますか？</p>
      <div class="wizard-options">
        <button class="wizard-option" data-value="transparent">
          透明にする（推奨）
          <small>OBSで透明背景として使用できます</small>
        </button>
        <button class="wizard-option" data-value="chromakey">
          クロマキー（緑背景）
          <small>OBSのクロマキーフィルターで抜けます</small>
        </button>
        <button class="wizard-option" data-value="color">
          色を付ける
          <small>背景色を指定します</small>
        </button>
      </div>
      <div id="background-color-picker" style="display:none; margin-top: 1rem;">
        <input type="color" class="wizard-bg-color" value="#000000">
      </div>
    `;
  }

  /**
   * Step 4: 完了
   */
  renderComplete() {
    const url = this.generateUrl();
    return `
      <h2>🎉 設定完了！</h2>
      <p>以下のURLをOBSのブラウザソースに貼り付けてください</p>
      <div class="wizard-url-display">
        <input type="text" readonly value="${url}" id="wizard-url">
        <button class="btn btn-secondary" id="wizard-copy-btn">コピー</button>
      </div>
      <div class="wizard-guide-section">
        <h3>OBSでの設定方法</h3>
        <ol>
          <li>OBS Studio で「ソース」パネルの「+」をクリック</li>
          <li>「ブラウザ」を選択</li>
          <li>上記URLを貼り付け</li>
          <li>幅: 1920、高さ: 1080 を設定</li>
          <li>「シャットダウン時にブラウザを更新する」にチェック</li>
        </ol>
        <button class="btn btn-primary" id="wizard-finish-btn">完了</button>
      </div>
    `;
  }

  /**
   * URLを生成
   */
  generateUrl() {
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', 'display.html');
    const params = new URLSearchParams();
    
    // セッションIDを生成または取得
    const sessionId = this.state.answers.sessionId || this.generateSessionId();
    params.set('session', sessionId);

    if (this.state.answers.textColor) {
      params.set('color', this.state.answers.textColor.replace('#', ''));
    }

    if (this.state.answers.background === 'chromakey') {
      params.set('bg', '00ff00');
    } else if (this.state.answers.backgroundColor) {
      params.set('bg', this.state.answers.backgroundColor.replace('#', ''));
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * セッションIDを生成
   */
  generateSessionId() {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 12);
  }

  /**
   * ステップ固有のイベントリスナーを追加
   */
  attachStepEventListeners(stepId) {
    const container = this.modal.querySelector('.wizard-step-container');

    switch (stepId) {
      case 'welcome':
        this.attachWelcomeListeners(container);
        break;
      case 'obs-check':
        this.attachObsCheckListeners(container);
        break;
      case 'text-color':
        this.attachTextColorListeners(container);
        break;
      case 'background':
        this.attachBackgroundListeners(container);
        break;
      case 'complete':
        this.attachCompleteListeners(container);
        break;
    }
  }

  /**
   * Welcome ステップのリスナー
   */
  attachWelcomeListeners(container) {
    const options = container.querySelectorAll('.wizard-option');
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        this.state.answers.firstTime = e.target.dataset.value;
        this.nextStep();
      });
    });
  }

  /**
   * OBS Check ステップのリスナー
   */
  attachObsCheckListeners(container) {
    const options = container.querySelectorAll('.wizard-option');
    const helpDiv = container.querySelector('#obs-help');

    options.forEach(option => {
      option.addEventListener('click', (e) => {
        const value = e.target.dataset.value;
        this.state.answers.obsReady = value;

        if (value === 'no') {
          helpDiv.style.display = 'block';
        } else {
          helpDiv.style.display = 'none';
          this.nextStep();
        }
      });
    });
  }

  /**
   * Text Color ステップのリスナー
   */
  attachTextColorListeners(container) {
    const presets = container.querySelectorAll('.wizard-color-preset');
    const customPicker = container.querySelector('.wizard-color-custom');
    const preview = container.querySelector('#wizard-preview-text');

    const updateColor = (color) => {
      this.state.answers.textColor = color;
      preview.style.color = color;
      this.saveState();
    };

    presets.forEach(preset => {
      preset.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        updateColor(color);
        customPicker.value = color;
      });
    });

    customPicker.addEventListener('input', (e) => {
      updateColor(e.target.value);
    });
  }

  /**
   * Background ステップのリスナー
   */
  attachBackgroundListeners(container) {
    const options = container.querySelectorAll('.wizard-option');
    const colorPicker = container.querySelector('#background-color-picker');

    options.forEach(option => {
      option.addEventListener('click', (e) => {
        const value = e.target.dataset.value;
        this.state.answers.background = value;

        if (value === 'color') {
          colorPicker.style.display = 'block';
        } else {
          colorPicker.style.display = 'none';
          this.nextStep();
        }
      });
    });

    if (colorPicker) {
      const bgColorInput = colorPicker.querySelector('.wizard-bg-color');
      bgColorInput?.addEventListener('input', (e) => {
        this.state.answers.backgroundColor = e.target.value;
        this.saveState();
      });
    }
  }

  /**
   * Complete ステップのリスナー
   */
  attachCompleteListeners(container) {
    const copyBtn = container.querySelector('#wizard-copy-btn');
    const finishBtn = container.querySelector('#wizard-finish-btn');
    const urlInput = container.querySelector('#wizard-url');

    copyBtn?.addEventListener('click', () => {
      urlInput.select();
      document.execCommand('copy');
      copyBtn.textContent = 'コピーしました！';
      setTimeout(() => {
        copyBtn.textContent = 'コピー';
      }, 2000);
    });

    finishBtn?.addEventListener('click', () => {
      this.complete();
    });
  }

  /**
   * ナビゲーションのイベントリスナーを追加
   */
  attachEventListeners() {
    const prevBtn = this.modal.querySelector('.wizard-prev');
    const nextBtn = this.modal.querySelector('.wizard-next');
    const skipBtn = this.modal.querySelector('.wizard-skip');

    prevBtn.addEventListener('click', () => this.prevStep());
    nextBtn.addEventListener('click', () => this.nextStep());
    skipBtn.addEventListener('click', () => this.skip());
  }

  /**
   * 次のステップへ
   */
  nextStep() {
    if (this.state.currentStep < this.steps.length - 1) {
      this.state.currentStep++;
      this.saveState();
      this.renderStep(this.state.currentStep);
    } else {
      this.complete();
    }
  }

  /**
   * 前のステップへ
   */
  prevStep() {
    if (this.state.currentStep > 0) {
      this.state.currentStep--;
      this.renderStep(this.state.currentStep);
    }
  }

  /**
   * スキップ
   */
  skip() {
    if (confirm('ウィザードをスキップしますか？\n後からでも設定を変更できます。')) {
      this.complete();
    }
  }

  /**
   * 完了
   */
  complete() {
    this.state.completed = true;
    localStorage.setItem('wizard-completed', 'true');
    this.modal.remove();
    if (this.onComplete) {
      this.onComplete(this.state.answers);
    }
  }

  /**
   * 状態を保存
   */
  saveState() {
    localStorage.setItem('wizard-state', JSON.stringify(this.state));
  }

  /**
   * 状態を復元
   */
  restoreState() {
    const saved = localStorage.getItem('wizard-state');
    if (saved) {
      try {
        this.state = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to restore wizard state:', e);
      }
    }
  }
}

export { SetupWizard };
