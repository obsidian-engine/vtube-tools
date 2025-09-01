#!/bin/bash

# Discord立ち絵CSS生成スクリプト
# 使い方: ./generate_discord_css.sh

echo "================================"
echo "Discord立ち絵CSS生成ツール"
echo "================================"
echo ""

# ユーザーIDの入力
echo "1. DiscordのユーザーIDを入力してください:"
echo "   (18桁の数字)"
read -p "ユーザーID: " USER_ID

# 画像URLの入力
echo ""
echo "2. 立ち絵画像のURLを入力してください:"
echo "   (例: https://cdn.discordapp.com/attachments/.../image.png)"
read -p "画像URL: " IMAGE_URL

# 画像サイズの入力（オプション）
echo ""
echo "3. 画像の幅を入力してください (デフォルト: 400):"
read -p "幅 [400]: " WIDTH
WIDTH=${WIDTH:-400}

echo ""
echo "4. 画像の高さを入力してください (デフォルト: 600):"
read -p "高さ [600]: " HEIGHT
HEIGHT=${HEIGHT:-600}

# 跳ねる高さの入力（オプション）
echo ""
echo "5. 話している時の跳ねる高さを入力してください (デフォルト: 15):"
read -p "跳ねる高さ [15]: " BOUNCE_HEIGHT
BOUNCE_HEIGHT=${BOUNCE_HEIGHT:-15}

# 出力ファイル名
OUTPUT_FILE="discord_tachie_${USER_ID}.css"

# CSS生成
cat > "$OUTPUT_FILE" << EOF
/* Discord立ち絵CSS - ユーザーID: ${USER_ID} */
/* 生成日時: $(date '+%Y-%m-%d %H:%M:%S') */

/* 背景透過 */
body {
    background-color: rgba(0, 0, 0, 0);
    overflow: hidden;
}

/* 自分以外を非表示 */
li:not([data-userid="${USER_ID}"]) {
    display: none !important;
}

/* 元のアバターを透明化 */
img[class*="Voice_avatar"] {
    opacity: 0 !important;
}

/* 立ち絵を常に表示 */
li[data-userid="${USER_ID}"] {
    display: block !important;
    position: fixed;
    top: 15px;
    left: 0;
    right: 0;
    width: ${WIDTH}px !important;
    height: ${HEIGHT}px !important;
    margin: 0 auto;
    background-image: url('${IMAGE_URL}');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: brightness(100%);
    transition: filter 0.3s ease;
}

/* 発話時の設定 - 跳ね続ける + 光る */
li[data-userid="${USER_ID}"].wrapper_speaking {
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
        transform: translateY(-${BOUNCE_HEIGHT}px);
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
}
EOF

echo ""
echo "================================"
echo "✅ CSS生成完了！"
echo "================================"
echo ""
echo "📁 出力ファイル: ${OUTPUT_FILE}"
echo ""
echo "【使い方】"
echo "1. OBSでブラウザソースを追加"
echo "2. Discord StreamKitのURLを設定"
echo "3. カスタムCSSに上記ファイルの内容をコピー&ペースト"
echo ""
echo "【設定内容】"
echo "- ユーザーID: ${USER_ID}"
echo "- 画像URL: ${IMAGE_URL}"
echo "- サイズ: ${WIDTH}x${HEIGHT}px"
echo "- 跳ねる高さ: ${BOUNCE_HEIGHT}px"
echo ""

# CSSの内容を表示するか確認
read -p "生成したCSSを表示しますか？ [y/N]: " SHOW_CSS
if [[ "$SHOW_CSS" =~ ^[Yy]$ ]]; then
    echo ""
    echo "--- 生成されたCSS ---"
    cat "$OUTPUT_FILE"
fi

# クリップボードにコピー（macOS）
if [[ "$OSTYPE" == "darwin"* ]]; then
    read -p "CSSをクリップボードにコピーしますか？ [y/N]: " COPY_CSS
    if [[ "$COPY_CSS" =~ ^[Yy]$ ]]; then
        cat "$OUTPUT_FILE" | pbcopy
        echo "✅ クリップボードにコピーしました！"
    fi
fi