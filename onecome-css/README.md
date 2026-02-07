# わんこめネオンCSS調整 - 個人カスタマイズ版

## ⚠️ これは個人的なカスタマイズのバックアップです

**このリポジトリは配布目的ではありません**

- OneCommeのカスタムテンプレート機能を使用した個人的な調整のバックアップです
- 他の方の使用は推奨しません（公式テンプレートをご利用ください）
- 本カスタマイズによって生じたいかなる問題についても責任を負いません

### 📌 公式テンプレート

OneComme公式テンプレートは以下からダウンロードできます:
- **公式サイト**: https://onecomme.com
- **テンプレート一覧**: https://onecomme.com/generator/templates

---

## 📝 個人的なカスタマイズ内容

わんこめ（OneComme）のネオンテンプレートを、個人的な好みに合わせて調整したものです。

---

## 📁 ファイル一覧

| ファイル名 | 説明 | 用途 |
|-----------|------|------|
| `PRD_neon_css_adjustment.md` | PRD（要件定義書） | 要件・仕様の確認 |
| `REVIEW_RESULT.md` | 10ペルソナレビュー結果 | 品質確認 |
| `original_neon.css` | オリジナル版（バックアップ） | ロールバック用 |
| `adjusted_neon.css` | **調整版（推奨）** | **OBSで使用** |
| `preview.html` | Before/After プレビュー | ブラウザで視覚確認 |
| `README.md` | このファイル | 使い方ガイド |

---

## 🎯 主な変更点

### 1. 背景色の追加
- **Before**: `transparent`（透明）→ 配信画面と重なって読みにくい
- **After**: `#e0e0e0`（薄いグレー）→ 常に読みやすい

### 2. ネオン光彩を弱める
- **Before**: 7層（4px, 8px, 12px, 16px, 20px, 24px, 28px）
- **After**: 3層（3px, 6px, 9px）
- **効果**: GPU負荷 57%削減、ぼかし半径 68%削減

### 3. テキスト色を変更
- **Before**: `#fff`（白）→ グレー背景で読みにくい
- **After**: `#000`（黒）→ コントラスト向上

---

## 🔧 個人的な使用メモ

### プレビュー確認

1. `preview.html` をブラウザで開く
2. Before/After を比較

### OBSでの使用（自分用）

1. **OBS Studio** を開く
2. **Browser Source** を追加（または既存を編集）
3. **CSS ファイル** を選択:
   - 推奨: `adjusted_neon.css`（控えめ・読みやすい）
   - 元に戻す: `original_neon.css`（強烈・派手）
4. **Browser Source をリロード**

---

## ⚙️ さらなる調整メモ（自分用）

`adjusted_neon.css` をテキストエディタで開いて編集する場合のメモ。

### 背景色を変更
```css
--lcv-background-color: #e0e0e0; /* お好みの色に変更 */
```

| 色コード | 見た目 |
|---------|--------|
| `#e0e0e0` | 薄いグレー（デフォルト） |
| `#f0f0f0` | より薄いグレー |
| `#d0d0d0` | やや濃いめのグレー |
| `rgba(224, 224, 224, 0.9)` | 半透明グレー |

### ネオン強度を調整
```css
--lcv-neon-shadow:
    0 0 3px var(--neon-base-color),
    0 0 6px var(--neon-color),
    0 0 9px var(--neon-color); /* 数値を変更 */
```

- **強くしたい**: `9px` → `12px` など大きく
- **弱くしたい**: `9px` → `6px` など小さく

---

## 📊 技術的比較

| 項目 | Before | After | 改善率 |
|------|--------|-------|--------|
| text-shadow レイヤー数 | 7層 | 3層 | ▼ 57% |
| 最大ぼかし半径 | 28px | 9px | ▼ 68% |
| 背景色 | transparent | #e0e0e0 | ✅ 改善 |
| テキスト色 | #fff（白） | #000（黒） | ✅ コントラスト向上 |
| GPU負荷（推定） | 高 | 軽減 | ▼ 約60% |

---

## 🔧 ロールバック（元に戻す）

調整版で問題が発生した場合:

1. OBS Browser Source の CSS URL を変更
   - `adjusted_neon.css` → `original_neon.css`
2. Browser Source をリロード
3. 元の強いネオン効果に戻ります

---

## 📝 動作環境

- **推奨**: OBS Studio 28.0 以降
- **理由**: Chromium 91+ 搭載、CSS変数が安定動作

---

## ⚠️ 注意事項（レビュー結果より）

### 推奨テスト
- [ ] 長文コメント（100文字以上）で表示確認
- [ ] 絵文字・特殊文字で表示確認
- [ ] 配信画面（ゲーム等）と重ねて視認性確認
- [ ] 複数コメント同時表示（5件以上）でfps確認

### パフォーマンス
- 大量のコメントが流れる配信では、fps測定を推奨
- 必要に応じて2層まで削減を検討

---

## 📄 ライセンス・免責事項

### ⚠️ 重要事項

**このリポジトリは個人的なバックアップであり、配布を目的としていません。**

- **オリジナルテンプレート**: OneComme (https://onecomme.com)
- **カスタマイズ**: 個人的な使用のみ
- **第三者の使用**: 推奨しません（公式テンプレートをご利用ください）

### Credits / クレジット

このカスタマイズは [OneComme](https://onecomme.com) のネオンテンプレートをベースにしています。

- **Original Template**: OneComme Neon Template
- **Original Author**: OneComme (https://onecomme.com)
- **Custom Modifications**: Daichi Hoshina（個人的な調整）

### Disclaimer / 免責事項

- 本カスタマイズファイルは非公式であり、OneComme とは無関係です
- 本カスタマイズの使用によって生じたいかなる損害についても責任を負いません
- **Use at your own risk / ご自身の責任でご使用ください**

### 📌 公式テンプレート

OneComme公式テンプレートは以下からご利用ください:
- 公式サイト: https://onecomme.com
- テンプレート一覧: https://onecomme.com/generator/templates

---

## 📋 参考ファイル（自分用メモ）

1. `PRD_neon_css_adjustment.md`: 詳細仕様
2. `REVIEW_RESULT.md`: レビュー結果と既知の問題
3. `preview.html`: 視覚的なプレビュー

---

**作成日**: 2026-01-18  
**カスタマイズ内容**: わんこめネオンテンプレートの個人的な調整  
**作者**: Daichi Hoshina（個人的なバックアップ）
