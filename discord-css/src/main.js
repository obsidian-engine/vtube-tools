/**
 * Discord立ち絵CSS生成ツール - メインJavaScript
 * シェルスクリプトのロジックをWebアプリ化
 */

// ==========================================
// アプリケーション状態管理
// ==========================================
class CSSGeneratorApp {
    constructor() {
        this.elements = {};
        this.settings = {
            userId: '',
            imageUrl: '',
            width: 400,
            height: 600,
            bounceHeight: 15,
            filename: ''
        };
        
        this.init();
    }

    /**
     * アプリケーション初期化
     */
    init() {
        this.bindElements();
        this.attachEventListeners();
        this.loadSettings();
        this.updateRangeValues();
        
        console.log('🚀 Discord立ち絵CSS生成ツール開始');
    }

    /**
     * DOM要素の取得・バインド
     */
    bindElements() {
        this.elements = {
            // フォーム要素
            userIdInput: document.getElementById('user-id'),
            imageUrlInput: document.getElementById('image-url'),
            widthRange: document.getElementById('image-width'),
            heightRange: document.getElementById('image-height'),
            bounceRange: document.getElementById('bounce-height'),
            presetSelect: document.getElementById('preset'),
            filenameInput: document.getElementById('filename'),
            
            // 値表示
            widthValue: document.getElementById('width-value'),
            heightValue: document.getElementById('height-value'),
            bounceValue: document.getElementById('bounce-value'),
            
            // ボタン
            generateBtn: document.getElementById('generate-btn'),
            resetBtn: document.getElementById('reset-btn'),
            copyBtn: document.getElementById('copy-btn'),
            downloadBtn: document.getElementById('download-btn'),
            
            // 出力
            cssFilename: document.getElementById('css-filename'),
            cssOutput: document.getElementById('css-output'),
            
            // 通知
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toast-message')
        };
    }

    /**
     * イベントリスナーの設定
     */
    attachEventListeners() {
        // フォーム入力の監視
        this.elements.userIdInput.addEventListener('input', () => this.updateSettings());
        this.elements.imageUrlInput.addEventListener('input', () => this.updateSettings());
        this.elements.filenameInput.addEventListener('input', () => this.updateSettings());
        
        // レンジスライダーの監視
        this.elements.widthRange.addEventListener('input', () => this.updateRangeValue('width'));
        this.elements.heightRange.addEventListener('input', () => this.updateRangeValue('height'));
        this.elements.bounceRange.addEventListener('input', () => this.updateRangeValue('bounce'));
        
        // プリセット選択
        this.elements.presetSelect.addEventListener('change', () => this.applyPreset());
        
        // ボタンクリック
        this.elements.generateBtn.addEventListener('click', () => this.generateCSS());
        this.elements.resetBtn.addEventListener('click', () => this.resetForm());
        this.elements.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.elements.downloadBtn.addEventListener('click', () => this.downloadCSS());
        
        // リアルタイムプレビュー（入力時に自動生成）
        document.addEventListener('input', (e) => {
            if (e.target.closest('.form-card')) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    if (this.isFormValid()) {
                        this.generateCSS();
                    }
                }, 500);
            }
        });
    }

    /**
     * レンジ値の更新
     */
    updateRangeValue(type) {
        const values = {
            width: { range: this.elements.widthRange, display: this.elements.widthValue },
            height: { range: this.elements.heightRange, display: this.elements.heightValue },
            bounce: { range: this.elements.bounceRange, display: this.elements.bounceValue }
        };
        
        const { range, display } = values[type];
        const value = range.value;
        display.textContent = value;
        
        // 設定に反映
        if (type === 'width') this.settings.width = parseInt(value);
        if (type === 'height') this.settings.height = parseInt(value);
        if (type === 'bounce') this.settings.bounceHeight = parseInt(value);
        
        this.saveSettings();
    }

    /**
     * すべてのレンジ値を初期化時に更新
     */
    updateRangeValues() {
        this.updateRangeValue('width');
        this.updateRangeValue('height');
        this.updateRangeValue('bounce');
    }

    /**
     * フォーム設定の更新
     */
    updateSettings() {
        this.settings.userId = this.elements.userIdInput.value.trim();
        this.settings.imageUrl = this.elements.imageUrlInput.value.trim();
        this.settings.filename = this.elements.filenameInput.value.trim();
        this.saveSettings();
        
        // ファイル名を更新
        const finalFilename = this.validateFilename(this.settings.filename, this.settings.userId);
        this.elements.cssFilename.textContent = finalFilename;
    }

    /**
     * プリセット適用
     */
    applyPreset() {
        const preset = this.elements.presetSelect.value;
        const presets = {
            small: { width: 300, height: 450 },
            medium: { width: 400, height: 600 },
            large: { width: 500, height: 750 },
            wide: { width: 600, height: 400 }
        };
        
        if (preset && presets[preset]) {
            const { width, height } = presets[preset];
            
            this.elements.widthRange.value = width;
            this.elements.heightRange.value = height;
            
            this.settings.width = width;
            this.settings.height = height;
            
            this.updateRangeValues();
            this.saveSettings();
            
            this.showToast(`📐 プリセット「${preset}」を適用しました`, 'success');
        }
    }

    /**
     * フォームバリデーション
     */
    isFormValid() {
        const userId = this.settings.userId;
        const imageUrl = this.settings.imageUrl;
        
        // ユーザーID: 数値のみ、必須
        const userIdValid = userId && /^[0-9]+$/.test(userId);
        
        // 画像URL: URL形式、必須
        const imageUrlValid = imageUrl && this.isValidUrl(imageUrl);
        
        return userIdValid && imageUrlValid;
    }

    /**
     * URL妥当性チェック
     */
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * ファイル名をバリデーションして安全な名前を返す
     * @param {string} filename - 入力されたファイル名
     * @param {string} userId - ユーザーID（デフォルト名用）
     * @returns {string} - バリデーション済みファイル名
     */
    validateFilename(filename, userId) {
        // 無効な文字を除去
        const invalidChars = /[\\/:"*?<>|]/g;
        let cleanName = filename.replace(invalidChars, '').trim();
        
        // 空白や無効な名前の場合はデフォルト名を使用
        if (!cleanName) {
            return `discord_tachie_${userId || 'user'}.css`;
        }
        
        // 拡張子がない場合は追加
        if (!cleanName.endsWith('.css')) {
            cleanName += '.css';
        }
        
        return cleanName;
    }

    /**
     * CSS生成（シェルスクリプトロジック移植）
     */
    generateCSS() {
        if (!this.isFormValid()) {
            this.elements.cssOutput.textContent = '/* フォームを正しく入力してください */';
            return;
        }

        const { userId, imageUrl, width, height, bounceHeight } = this.settings;
        const timestamp = new Date().toLocaleString('ja-JP');

        const cssContent = `/* Discord立ち絵CSS - ユーザーID: ${userId} */
/* 生成日時: ${timestamp} */

/* 背景透過 */
body {
    background-color: rgba(0, 0, 0, 0);
    overflow: hidden;
}

/* 自分以外を非表示 */
li:not([data-userid="${userId}"]) {
    display: none !important;
}

/* 元のアバターを透明化 */
img[class*="Voice_avatar"] {
    opacity: 0 !important;
}

/* 立ち絵を常に表示 */
li[data-userid="${userId}"] {
    display: block !important;
    position: fixed;
    top: 15px;
    left: 0;
    right: 0;
    width: ${width}px !important;
    height: ${height}px !important;
    margin: 0 auto;
    background-image: url('${imageUrl}');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: brightness(100%);
    transition: filter 0.3s ease;
}

/* 発話時の設定 - 跳ね続ける + 光る */
li[data-userid="${userId}"].wrapper_speaking {
    filter: brightness(100%) drop-shadow(0 0 10px rgba(255, 255, 255, 0.8)) !important;
    animation:
        speak-bounce 500ms ease-in-out infinite,
        speak-glow 1500ms ease-in-out infinite !important;
}

/* 話している時の跳ねるアニメーション */
@keyframes speak-bounce {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-${bounceHeight}px);
    }
}

/* 話している時の光るアニメーション */
@keyframes speak-glow {
    0%, 100% {
        filter: brightness(100%) drop-shadow(0 0 10px rgba(255, 255, 255, 0.8));
    }
    50% {
        filter: brightness(120%) drop-shadow(0 0 20px rgba(255, 255, 255, 1));
    }
}

/* 名前を非表示 */
div[class*='Voice_user'] {
    display: none !important;
}`;

        this.elements.cssOutput.textContent = cssContent;
        this.showToast('✨ CSS生成完了！', 'success');
        
        console.log('✅ CSS生成完了', {
            userId,
            imageUrl,
            dimensions: `${width}x${height}`,
            bounceHeight
        });
    }

    /**
     * フォームリセット
     */
    resetForm() {
        // デフォルト値にリセット
        this.elements.userIdInput.value = '';
        this.elements.imageUrlInput.value = '';
        this.elements.widthRange.value = 400;
        this.elements.heightRange.value = 600;
        this.elements.bounceRange.value = 15;
        this.elements.presetSelect.value = '';
        this.elements.filenameInput.value = '';
        
        // 設定リセット
        this.settings = {
            userId: '',
            imageUrl: '',
            width: 400,
            height: 600,
            bounceHeight: 15,
            filename: ''
        };
        
        this.updateRangeValues();
        this.elements.cssOutput.textContent = '/* CSS生成ボタンをクリックしてください */';
        this.elements.cssFilename.textContent = 'discord_tachie.css';
        
        this.clearSettings();
        this.showToast('🔄 フォームをリセットしました', 'success');
    }

    /**
     * クリップボードにコピー
     */
    async copyToClipboard() {
        const cssContent = this.elements.cssOutput.textContent;
        
        if (cssContent.includes('CSS生成ボタンをクリック') || cssContent.includes('フォームを正しく入力')) {
            this.showToast('❌ 生成されたCSSがありません', 'error');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(cssContent);
            this.showToast('📋 クリップボードにコピーしました！', 'success');
        } catch (error) {
            console.error('クリップボードコピーエラー:', error);
            
            // フォールバック: テキスト選択
            const range = document.createRange();
            range.selectNode(this.elements.cssOutput);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            
            this.showToast('📋 テキストが選択されました。Ctrl+Cでコピーしてください', 'success');
        }
    }

    /**
     * CSSファイルダウンロード
     */
    downloadCSS() {
        const cssContent = this.elements.cssOutput.textContent;
        
        if (cssContent.includes('CSS生成ボタンをクリック') || cssContent.includes('フォームを正しく入力')) {
            this.showToast('❌ 生成されたCSSがありません', 'error');
            return;
        }
        
        const filename = this.elements.cssFilename.textContent;
        const blob = new Blob([cssContent], { type: 'text/css' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('💾 CSSファイルをダウンロードしました！', 'success');
    }

    /**
     * トースト通知表示
     */
    showToast(message, type = 'success') {
        this.elements.toastMessage.textContent = message;
        this.elements.toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 3000);
    }

    /**
     * 設定の保存（localStorage）
     */
    saveSettings() {
        try {
            localStorage.setItem('discord-css-generator-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('設定保存エラー:', error);
        }
    }

    /**
     * 設定の読み込み（localStorage）
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('discord-css-generator-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                
                // フォームに設定値を復元
                this.elements.userIdInput.value = settings.userId || '';
                this.elements.imageUrlInput.value = settings.imageUrl || '';
                this.elements.widthRange.value = settings.width || 400;
                this.elements.heightRange.value = settings.height || 600;
                this.elements.bounceRange.value = settings.bounceHeight || 15;
                this.elements.filenameInput.value = settings.filename || '';
                
                // 内部設定更新
                Object.assign(this.settings, settings);
                
                console.log('📂 設定を復元しました', settings);
            }
        } catch (error) {
            console.warn('設定読み込みエラー:', error);
        }
    }

    /**
     * 設定の削除
     */
    clearSettings() {
        try {
            localStorage.removeItem('discord-css-generator-settings');
        } catch (error) {
            console.warn('設定削除エラー:', error);
        }
    }
}

// ==========================================
// アプリケーション開始
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    new CSSGeneratorApp();
});

// ==========================================
// PWA対応（将来拡張用）
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('🔧 ServiceWorker registered'))
            .catch(error => console.log('ServiceWorker registration failed:', error));
    });
}