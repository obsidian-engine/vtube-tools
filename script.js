// Obsidian Engine - Main Landing Page Interactive Scripts

document.addEventListener('DOMContentLoaded', function() {
    // スムーズスクロール機能
    const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
    smoothScrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ツールカードの軽微なホバー効果
    const toolCards = document.querySelectorAll('.tool-card');
    
    toolCards.forEach(card => {
        // シンプルなホバー効果のみ（CSS側で制御）
        card.addEventListener('mouseenter', function() {
            card.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', function() {
            card.style.transform = 'translateY(0)';
        });
    });

    // レスポンシブナビゲーション（将来の拡張用）
    function handleResponsiveNav() {
        const nav = document.querySelector('nav');
        if (nav) {
            const mediaQuery = window.matchMedia('(max-width: 768px)');
            if (mediaQuery.matches) {
                nav.style.flexDirection = 'column';
            } else {
                nav.style.flexDirection = 'row';
            }
        }
    }
    
    window.addEventListener('resize', handleResponsiveNav);
    handleResponsiveNav();

    // スクロール時のヘッダー背景変化
    function handleScrollHeader() {
        const header = document.querySelector('.hero');
        const scrollPosition = window.scrollY;
        
        if (header && scrollPosition > 100) {
            document.body.style.setProperty('--hero-opacity', '0.95');
        } else if (header) {
            document.body.style.setProperty('--hero-opacity', '1');
        }
    }
    
    window.addEventListener('scroll', handleScrollHeader);

    // パフォーマンス最適化：Intersection Observer でアニメーション
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // アニメーション対象要素を観察
    const animationTargets = document.querySelectorAll('.tool-card, .feature-item, .stats-item');
    animationTargets.forEach(target => {
        observer.observe(target);
    });

    // ツール統計の動的更新（デモ用）
    function updateToolStats() {
        const statsItems = document.querySelectorAll('.stat-number');
        statsItems.forEach((item, index) => {
            const finalValue = parseInt(item.textContent);
            let currentValue = 0;
            const increment = finalValue / 50; // 50フレームで完了
            
            const counter = setInterval(() => {
                currentValue += increment;
                if (currentValue >= finalValue) {
                    item.textContent = finalValue.toLocaleString();
                    clearInterval(counter);
                } else {
                    item.textContent = Math.floor(currentValue).toLocaleString();
                }
            }, 30);
        });
    }
    
    // ページ読み込み後少し待ってから統計アニメーション実行
    setTimeout(updateToolStats, 1000);

    // エラーハンドリング
    window.addEventListener('error', function(e) {
        console.warn('Script error handled:', e.message);
    });
    
    // デバッグ情報（開発時のみ）
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔧 Obsidian Engine Debug Mode');
        console.log('📊 Interactive features loaded');
        console.log('🎯 Tools detected:', toolCards.length);
    }
});

// グローバルユーティリティ関数
window.ObsidianEngine = {
    // ツール使用統計の更新
    trackToolUsage: function(toolName) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'tool_access', {
                'tool_name': toolName,
                'custom_parameter': 'obsidian_engine'
            });
        }
        console.log(`🔧 Tool accessed: ${toolName}`);
    },
    
    // テーマ切り替え（将来の機能）
    toggleTheme: function() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
};

// サービスワーカー登録（PWA対応準備）
if ('serviceWorker' in navigator) {
// コメント用CSSをクリップボードにコピーする機能
async function copyCommentCSSToClipboard() {
    try {
        // comment.cssファイルを動的に取得
        const response = await fetch('/comment-css/comment.css');
        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }
        const cssContent = await response.text();
        
        // モダンなClipboard APIを使用（HTTPS環境で推奨）
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(cssContent);
            return { success: true };
        }
        
        // フォールバック: 古いブラウザ向け
        const textarea = document.createElement('textarea');
        textarea.value = cssContent;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        let success = false;
        try {
            success = document.execCommand('copy');
        } catch (err) {
            console.error('コピーコマンド実行エラー:', err);
        }
        
        document.body.removeChild(textarea);
        
        if (!success) {
            throw new Error('クリップボードへのコピーに失敗しました');
        }
        
        return { success: true };
    } catch (error) {
        console.error('CSSコピーエラー:', error);
        return { success: false, error: error.message };
    }
}

// コメント用CSSコピーボタンのイベントリスナー設定
document.addEventListener('DOMContentLoaded', function() {
    const copyCommentCSSButton = document.getElementById('copy-comment-css');
    if (copyCommentCSSButton) {
        copyCommentCSSButton.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // ボタンを一時的に無効化
            const originalText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '⏳ コピー中...';
            
            const result = await copyCommentCSSToClipboard();
            
            if (result.success) {
                // 成功フィードバック
                this.innerHTML = '✅ コピー完了！';
                this.classList.add('btn-success');
                
                // 3秒後に元に戻す
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.classList.remove('btn-success');
                    this.disabled = false;
                }, 3000);
            } else {
                // エラーフィードバック
                this.innerHTML = '❌ コピー失敗';
                this.classList.add('btn-error');
                
                // 3秒後に元に戻す
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.classList.remove('btn-error');
                    this.disabled = false;
                }, 3000);
                
                // エラーメッセージを表示
                console.error('コピーエラー:', result.error);
            }
        });
    }
});

    window.addEventListener('load', function() {
        // 将来的にPWA対応する際はここでサービスワーカーを登録
        console.log('🚀 PWA ready for future implementation');
    });
}