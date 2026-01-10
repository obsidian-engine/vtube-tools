# 📝 OBSテキスト表示ツール

OBSブラウザソース用のテキストをリアルタイムで編集・表示できるツールです。

## ✨ 特徴

- 🔄 **リアルタイム更新**: 編集画面でテキストを変更すると、OBS側に即座に反映
- 🎨 **スタイリング**: フォント、色、サイズのカスタマイズ（Phase 2で実装予定）
- 💚 **グリーンバック**: OBSクロマキー合成対応（#00ff00背景）
- 🔐 **セッション管理**: UUIDベースのセッションID で複数ユーザーを分離
- 📱 **レスポンシブ**: PC・タブレット・スマホ対応

## 🚀 クイックスタート

### 1. Firebase設定

#### ローカル開発環境

`.env.example` をコピーして `.env` を作成し、実際の値を設定してください。

```bash
cp .env.example .env
```

`.env` ファイルを編集:

```bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Firebase設定の取得方法**:
1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. プロジェクトを選択（既存）
3. プロジェクト設定 > マイアプリ > SDK の設定と構成 から取得

#### 本番環境（GitHub Pages）

GitHub Actions で自動的に環境変数が注入されます。
リポジトリの Secrets に Firebase 設定値を登録してください（設定済み✅）

### 2. Firebaseセキュリティルール設定

Realtime Database のルールを以下に設定:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

**警告**: MVP段階では認証なし。将来的にはセキュリティルールの強化が必要です。

### 3. ローカル開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

ブラウザで `http://localhost:5174` を開いてください。

### 4. OBS設定

#### ブラウザソース追加

1. OBS Studio を起動
2. ソース追加 → **ブラウザ**
3. URL に編集画面の「OBS用URL」を貼り付け（例: `http://localhost:5174/display.html?session=xxx`）
4. 幅: `1920`、高さ: `1080` を推奨
5. 「OK」をクリック

#### クロマキー合成設定

1. 追加したブラウザソースを右クリック → **フィルタ**
2. 「+」をクリック → **クロマキー** を選択
3. 設定:
   - **キーカラータイプ**: 緑
   - **類似性**: 400（デフォルト）
   - **滑らかさ**: 80（デフォルト）
4. 「閉じる」をクリック

これでグリーンバックが透過され、テキストのみが表示されます。

## 📁 ディレクトリ構造

```
obs-text/
├── index.html          # 編集画面
├── display.html        # OBS表示用
├── package.json        # npm設定
├── vite.config.js      # Vite設定
├── README.md           # このファイル
└── src/
    ├── main.js         # 編集画面ロジック（TextEditorApp）
    ├── display.js      # OBS表示ロジック（DisplayApp）
    ├── firebase.js     # Firebase初期化
    ├── style.css       # 編集画面スタイル
    └── display.css     # OBS表示スタイル
```

## 🔧 使い方

### 編集画面

1. `http://localhost:5174` または `https://obsidian-engine.github.io/vtube-tools/obs-text/` を開く
2. テキスト入力欄にテキストを入力
3. リアルタイムプレビューで確認
4. 「OBS用URL」をコピーしてOBSに設定

### OBS表示画面

- 編集画面で生成されたURL（`display.html?session=xxx`）をOBSブラウザソースに設定
- 編集画面でテキストを変更すると、OBS側に自動反映

### URL構造

```
編集画面: https://example.com/obs-text/?session={sessionId}
OBS表示: https://example.com/obs-text/display.html?session={sessionId}
```

**重要**: セッションIDが一致していないと同期されません。

## 📦 ビルド・デプロイ

### 本番ビルド

```bash
npm run build
```

`dist/` ディレクトリにビルド結果が生成されます。

### プレビュー

```bash
npm run preview
```

`http://localhost:4174` でビルド結果を確認できます。

### GitHub Pages デプロイ

GitHub Pagesにデプロイする場合、`vite.config.js` の `base` 設定を確認してください:

```javascript
base: process.env.NODE_ENV === 'production' 
  ? '/vtube-tools/obs-text/' 
  : './',
```

**デプロイURL**: `https://obsidian-engine.github.io/vtube-tools/obs-text/`

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | Vanilla JS（ES Modules） |
| ビルドツール | Vite 5.x |
| リアルタイムDB | Firebase Realtime Database |
| スタイリング | CSS3（CSS変数） |
| ホスティング | GitHub Pages |

## 🔒 セキュリティ

### XSS対策

- `textContent` のみ使用（`innerHTML` 禁止）
- ユーザー入力を直接HTMLに挿入しない

### セッションID

- UUIDv4（`crypto.randomUUID()`）で予測困難
- URLパラメータで管理

### Firebase APIキー

- フロントエンドでの露出は不可避
- Firebaseセキュリティルールで制限

## ⚙️ 設定項目

### デフォルトスタイル

`src/firebase.js` の初期設定:

```javascript
style: {
  fontFamily: 'Noto Sans JP',
  fontSize: 48,
  color: '#ffffff',
  backgroundColor: 'transparent',
  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
}
```

### デバウンス時間

`src/main.js` のデバウンス設定（デフォルト: 300ms）:

```javascript
setTimeout(async () => {
  // ...
}, 300);
```

## 📝 開発予定（Phase 2以降）

- [ ] フォント選択機能（Google Fonts日本語5種）
- [ ] カラーピッカー（テキスト色、縁取り色）
- [ ] フォントサイズスライダー（12-200px）
- [ ] アニメーション（fadeIn, slideIn, bounce, pulse）
- [ ] 複数シーン管理
- [ ] プリセット保存

## 🐛 トラブルシューティング

### テキストがOBSに反映されない

1. セッションIDが一致しているか確認
2. Firebaseセキュリティルールが設定されているか確認
3. ブラウザのコンソールでエラーを確認
4. OBSブラウザソースをリロード

### 接続エラーが表示される

1. Firebase設定値（apiKey等）が正しいか確認
2. Firebaseプロジェクトが有効か確認
3. ネットワーク接続を確認

### ビルドエラー

```bash
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install
```

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

Pull Requestを歓迎します！

## 📮 リンク

- **プロジェクトリポジトリ**: https://github.com/obsidian-engine/vtube-tools
- **Discord CSS生成ツール**: https://obsidian-engine.github.io/vtube-tools/discord-css/
- **Obsidian Engine**: https://obsidian-engine.github.io/vtube-tools/

---

**作成**: Obsidian Engine  
**最終更新**: 2026-01-10
