# YouTube Live Chat カスタムCSS 技術仕様書

## 概要

YouTube Live Chatのコメント表示をカスタマイズするCSS実装の技術仕様。
スーパーチャット、スティッカー、メンバーシップ、通常コメントの表示制御を行う。

---

## YouTube Live Chat DOM構造

### 1. 通常コメント（Text Message）

```html
<yt-live-chat-text-message-renderer author-type="owner|moderator|member|">
  <div id="author-photo"><!-- アバター --></div>
  <div id="content">
    <span id="author-name">@username</span>
    <span id="message">コメント本文</span>
  </div>
</yt-live-chat-text-message-renderer>
```

**主要属性**:
- `author-type`: `owner`（配信者）, `moderator`（モデレーター）, `member`（メンバー）, `""`（通常視聴者）
- `author-is-owner`: 配信者フラグ

### 2. スーパーチャット（Paid Message）

```html
<yt-live-chat-paid-message-renderer
  modern
  is-v2-style
  purchase-amount-level="1-7">
  <div id="card">
    <div id="header">
      <div id="header-content">
        <div id="single-line">
          <div id="author-name-chip">
            <yt-live-chat-author-chip>
              <span id="author-name">@username</span>
              <span id="chat-badges"><!-- バッジ --></span>
            </yt-live-chat-author-chip>
          </div>
          <div id="purchase-amount-column">
            <div id="purchase-amount">￥1,000</div>
          </div>
        </div>
      </div>
    </div>
    <div id="content">
      <div id="message">メッセージ本文</div>
    </div>
  </div>
</yt-live-chat-paid-message-renderer>
```

**主要属性**:
- `modern`: モダンUI
- `is-v2-style`: v2スタイル
- `purchase-amount-level`: 金額Tier（1=最小、7=最大）
- `show-only-header`: ヘッダーのみ表示（メッセージなし）

**Tier別デフォルト色** (YouTubeインライン):
- Tier 1-2: 青系
- Tier 3-4: シアン系
- Tier 5: 黄色系
- Tier 6: オレンジ系
- Tier 7: 赤系

### 3. スーパーチャット スティッカー（Paid Sticker）

```html
<yt-live-chat-paid-sticker-renderer
  modern
  is-v2-style>
  <div id="card">
    <div id="author-info">
      <div id="content">
        <div id="content-primary-column">
          <div id="author-name-chip">@username</div>
          <span id="price-column">HK$4.90</span>
        </div>
      </div>
    </div>
    <div id="sticker-container">
      <img id="sticker" src="..." />
    </div>
  </div>
</yt-live-chat-paid-sticker-renderer>
```

### 4. メンバーシップ（Membership Item）

```html
<yt-live-chat-membership-item-renderer
  show-only-header
  has-primary-header-text>
  <div id="card"><!-- または #header -->
    <div id="header-content">
      <div id="header-subtext">新規メンバー</div>
    </div>
  </div>
  <div id="content">メッセージ本文</div>
</yt-live-chat-membership-item-renderer>
```

**主要属性**:
- `show-only-header`: ウェルカムメッセージ（メッセージなし）
- `has-primary-header-text`: メンバー履歴通知

---

## YouTube CSS変数の上書き

YouTubeはインラインスタイルでCSS変数を動的設定する。カスタマイズにはこれらを`!important`で上書きする必要がある。

### スーパーチャット関連変数

```css
:root {
  /* YouTubeが動的設定する変数（上書き必要） */
  --yt-live-chat-paid-message-primary-color: #色コード;
  --yt-live-chat-paid-message-secondary-color: #色コード;
  --yt-live-chat-paid-message-header-color: #色コード;
}

/* 上書き例 */
yt-live-chat-paid-message-renderer {
  --yt-live-chat-paid-message-primary-color: transparent !important;
  --yt-live-chat-paid-message-secondary-color: transparent !important;
  --yt-live-chat-paid-message-header-color: transparent !important;
}
```

### スティッカー関連変数

```css
:root {
  --yt-live-chat-paid-sticker-background-color: #色コード;
  --yt-live-chat-paid-sticker-chip-background-color: #色コード;
  --yt-live-chat-paid-sticker-chip-text-color: #色コード;
}
```

---

## カスタマイズ実装パターン

### パターン1: 二重構造（Renderer + Card）

**目的**: renderer本体を透明化し、内部の`#card`のみにスタイルを適用することで、YouTubeのデフォルトスタイルの影響を排除。

```css
/* 外側のrendererを透明化 */
yt-live-chat-paid-message-renderer {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

/* 内側の#cardにスタイル適用 */
yt-live-chat-paid-message-renderer #card {
  background: var(--custom-gradient) !important;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 4px 12px;
  box-sizing: border-box !important; /* 重要: paddingを含む幅計算 */
}
```

**注意点**:
- `box-sizing: border-box`必須（paddingによる幅超過を防止）
- `padding: 0`でrendererの余白を削除

### パターン2: 全Tier統一色

```css
/* purchase-amount-level属性セレクタで全Tierを対象 */
yt-live-chat-paid-message-renderer[purchase-amount-level] {
  /* すべてのTier（1-7）に適用 */
}

/* または個別指定 */
yt-live-chat-paid-message-renderer[purchase-amount-level="1"] #card,
yt-live-chat-paid-message-renderer[purchase-amount-level="2"] #card,
/* ... */
yt-live-chat-paid-message-renderer[purchase-amount-level="7"] #card {
  background: var(--g) !important;
}
```

### パターン3: modern/is-v2-style対応

```css
/* すべてのバリエーションをカバー */
yt-live-chat-paid-message-renderer,
yt-live-chat-paid-message-renderer[modern],
yt-live-chat-paid-message-renderer[is-v2-style],
yt-live-chat-paid-sticker-renderer,
yt-live-chat-paid-sticker-renderer[modern],
yt-live-chat-paid-sticker-renderer[is-v2-style] {
  /* 共通スタイル */
}
```

---

## 2024年12月 修正履歴

### Issue 1: スーパーチャットの右へのはみ出し

**原因**: `#card`に`padding`と`width: 100%`を指定していたが、`box-sizing: content-box`（デフォルト）のため、実際の幅が`100% + padding`になっていた。

**修正**:
```css
yt-live-chat-paid-message-renderer #card {
  width: 100%;
  padding: var(--padding-card-header);
  box-sizing: border-box !important; /* 追加 */
}
```

**適用箇所**:
- スーパーチャット `#card`
- スティッカー `#card`
- メンバーシップ `#card`, `#header`
- ギフト `#header`

### Issue 2: CSS重複とメンテナンス性

**問題点**:
1. グラデーション値を20箇所以上で繰り返し定義
2. `background`, `background-color`, `background-image`の3重指定
3. スパチャ透明化を3箇所で重複定義
4. 未使用CSS変数の存在

**修正内容**:

#### Phase 1: 基本的な冗長性削除（-13行）
```css
/* Before: 繰り返し */
background: linear-gradient(104deg, #53B7FF 0%, #81E3DD 94.77%) !important;
background-color: #53B7FF !important;
background-image: linear-gradient(104deg, #53B7FF 0%, #81E3DD 94.77%) !important;

/* After: 変数活用 + ショートハンド */
background: var(--g) !important;
```

#### Phase 2: 構造改善（-28行）
```css
/* Before: 3箇所で重複 */
/* 基本renderer */
yt-live-chat-paid-message-renderer { /* 透明化プロパティ */ }

/* 全Tier renderer */
yt-live-chat-paid-message-renderer[purchase-amount-level="1"] { /* 同じプロパティ */ }
/* ... 7まで */

/* スティッカーrenderer */
yt-live-chat-paid-sticker-renderer { /* 同じプロパティ */ }

/* After: 1箇所に統合 */
yt-live-chat-paid-message-renderer,
yt-live-chat-paid-message-renderer[modern],
yt-live-chat-paid-message-renderer[is-v2-style],
yt-live-chat-paid-message-renderer[purchase-amount-level],
yt-live-chat-paid-sticker-renderer,
yt-live-chat-paid-sticker-renderer[modern],
yt-live-chat-paid-sticker-renderer[is-v2-style] {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
```

**削除した未使用変数**:
- `--superchat-name-bg`
- `--membership-name-bg`

**累計削減**: 42行（979行 → 937行、4.3%削減）

### Issue 3: グループ間余白の調整

**変更**: `margin-bottom: 8px` → `margin-bottom: 10px`

**適用箇所**:
- 通常コメント（`yt-live-chat-text-message-renderer`）
- メンバーシップ（`yt-live-chat-membership-item-renderer`）
- スーパーチャット（`yt-live-chat-paid-message-renderer`）
- スティッカー（`yt-live-chat-paid-sticker-renderer`）

---

## CSS設計原則

### 1. CSS変数の活用

```css
:root {
  /* 基本グラデーション */
  --g: linear-gradient(104deg, #53B7FF 0%, #81E3DD 94.77%);

  /* シャドウ */
  --shadow-default: 0 1px 3px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);

  /* padding定義 */
  --padding-card-header: 4px 12px;
  --padding-message: 12px 16px;
}
```

### 2. セレクタ詳細度の管理

```css
/* 詳細度: 0,0,2,1 */
yt-live-chat-paid-message-renderer #card { }

/* 詳細度: 0,1,1,1 - 属性セレクタで詳細度を上げる */
yt-live-chat-paid-message-renderer[modern] #card { }
```

### 3. !important の使用

YouTube側のインラインスタイルを上書きするため、`!important`が必要。

```css
/* YouTubeのインライン: style="background: #色コード" */
/* 上書きには!importantが必須 */
#card {
  background: var(--g) !important;
}
```

---

## トラブルシューティング

### 問題: スタイルが適用されない

**確認ポイント**:
1. `!important`を付けているか
2. セレクタの詳細度は十分か
3. 属性セレクタ（`[modern]`, `[is-v2-style]`）を含めているか
4. YouTube側のDOM構造が変更されていないか

### 問題: レイアウトが崩れる

**確認ポイント**:
1. `box-sizing: border-box`が設定されているか
2. renderer本体の`padding: 0`が設定されているか
3. `width: 100%`と`padding`の組み合わせになっていないか

### 問題: 特定のTierだけ色が違う

**確認ポイント**:
1. `purchase-amount-level`属性セレクタを使用しているか
2. 全Tier（1-7）をカバーしているか
3. YouTube側のインラインCSS変数を上書きしているか

---

## ブラウザ互換性

### 対応ブラウザ

- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

### 使用しているCSS機能

- CSS Variables（Custom Properties）
- CSS Grid / Flexbox
- `box-sizing: border-box`
- Attribute Selectors
- `:not()` Pseudo-class

---

## 参考情報

### YouTube Live Chat 公式ドキュメント
YouTubeは公式のカスタマイズAPIを提供していないため、DOM構造の解析により実装。

### 関連ファイル
- `/comment-css/index.html` - メインCSS実装
- `/docs/YouTube-Live-Chat-CSS-Specification.md` - 本ドキュメント

### 更新履歴
- 2024-12-XX: 初版作成
- 2024-12-XX: はみ出し修正、CSS単純化Phase1-2実装

---

## まとめ

YouTube Live Chatのカスタマイズは以下の3つのポイントを押さえることが重要：

1. **二重構造**: renderer（透明）+ #card（スタイル適用）
2. **CSS変数上書き**: YouTube側の動的変数を`!important`で上書き
3. **属性セレクタ**: `modern`, `is-v2-style`, `purchase-amount-level`を考慮

これにより、YouTubeのデフォルトスタイルに影響されない、安定したカスタムデザインを実現できる。
