# 📅 LiveReserve

YouTube Live の配信予約をテンプレートからワンクリック作成するツール。

> 「配信予約、もうStudioを開かない。」

- 📖 [PRD](../../docs/LiveReserve-PRD.md) ／ [MVP 設計プラン](../../docs/LiveReserve-MVP-Design.md) ／ [技術選定デザインドック](../../docs/LiveReserve-Design-Doc.md)

## スタック

- **Backend**: Hono on Cloudflare Workers
- **DB**: Cloudflare D1（SQLite互換）+ Drizzle ORM
- **Frontend**: React + Vite + TypeScript + TailwindCSS（TanStack Query / React Router）
- **Storage**: Cloudflare R2（サムネイル）
- **認証**: Google OAuth 2.0（署名付き HttpOnly Cookie セッション）

## 開発

```bash
pnpm install

# テスト（TDD: 46 tests）
pnpm test

# 型チェック
pnpm typecheck

# ローカル開発（2プロセス）
cp .dev.vars.example .dev.vars   # 値を埋める
pnpm dev:worker                  # wrangler dev (API: :8787)
pnpm dev                         # vite (UI: :5173, /api は :8787 へプロキシ)
```

## セットアップ（初回）

1. **Google Cloud Console** で OAuth クライアントを作成
   - スコープ: `https://www.googleapis.com/auth/youtube`, `openid`, `email`, `profile`
   - リダイレクトURI: `http://localhost:8787/api/auth/callback`（本番はデプロイ先URL）
   - テスト段階は「テストユーザー」に自分のアカウントを追加
2. **D1 / R2 作成**
   ```bash
   wrangler d1 create live-reserve          # 出力された database_id を wrangler.jsonc に設定
   wrangler r2 bucket create live-reserve-thumbnails
   wrangler d1 migrations apply live-reserve --local   # ローカル
   wrangler d1 migrations apply live-reserve --remote  # 本番
   ```
3. **Secrets 設定（本番）**
   ```bash
   wrangler secret put GOOGLE_CLIENT_ID
   wrangler secret put GOOGLE_CLIENT_SECRET
   wrangler secret put APP_ENCRYPTION_KEY   # openssl rand -hex 32
   wrangler secret put SESSION_SECRET
   ```
4. **デプロイ**
   ```bash
   pnpm deploy   # vite build + wrangler deploy
   ```

## アーキテクチャ

```
src/
├── worker/                  # Hono (Cloudflare Workers)
│   ├── index.ts             # エントリ: env → 依存組み立て
│   ├── app.ts               # ルーティング・ハンドラ（依存注入でテスト可能）
│   ├── types.ts             # Repo/Store インターフェース
│   ├── auth/                # セッション署名 / Google OAuth
│   ├── broadcast/           # 予約作成オーケストレーション（ロールバック付き）
│   ├── youtube/             # YouTube API 薄型クライアント（fetch直）
│   ├── db/                  # Drizzle スキーマ / D1 リポジトリ実装
│   └── lib/                 # AES-GCM 暗号化 / R2
└── web/                     # React SPA
    ├── pages/               # Login / Templates / CreateBroadcast / BulkCreate / Broadcasts
    ├── components/          # WeekBoard / TemplatePalette / CardEditor / MonthCalendar
    └── lib/                 # api / template-vars（変数展開）/ draft（下書き）/ calendar（日付）
```

### 予約作成フロー

`POST /api/broadcasts` で以下を直列実行（途中失敗時は配信枠を削除してロールバック）:

1. `liveBroadcasts.insert` — 配信枠作成
2. `liveStreams.insert` — ストリーム作成（OBS用キー取得）
3. `liveBroadcasts.bind` — 紐付け
4. `thumbnails.set` — サムネイル設定（任意・失敗は警告のみ）
5. D1 へ記録 → 配信URL / videoId / ストリームキーを返却

### 一括予約（週ボード）

`/bulk` 画面で、テンプレートカードを週カレンダーの曜日にドラッグ&ドロップ（モバイルはタップ配置）して1週間分をまとめて作成できる。

- **タイトル変数展開**: `{{date}} {{month}} {{day}} {{weekday}} {{round}}` を配置時に自動置換（`{{round}}` は開始値からインクリメント）。生成後も各カードを手編集可能。
- **行ごとのサムネ**: カードごとに画像を `POST /api/thumbnails/staging`（R2 `staging/{userId}/{uuid}`）へアップロードし、一括作成時に各配信へ適用。
- **下書き自動保存**: ボードの状態を localStorage（`livereserve:bulk-draft:v1`）にデバウンス保存。画面を閉じても復元。サムネ実体は R2 にあり下書きは key 参照のみ。
- **一括 API**: `POST /api/broadcasts/bulk`（`{ items: [...] }`、最大 12 件）。各件を逐次作成し**部分失敗を許容**（件ごとに成功/失敗を返す）。成功分は下書きから除去、失敗分は残して再実行可能。
  - 上限 12 件は Workers 無料枠の subrequest 上限（50/req）に収めるため（1配信あたり fetch 4回 + トークン更新1回）。
  - 消費済みの staging サムネはベストエフォートで削除。**中断した下書きの孤児対策として、R2 バケットに `staging/` を一定期間（例: 7日）で削除するライフサイクルルールの設定を推奨。**

### カレンダー表示

`/broadcasts` 画面はカレンダー／リストを切替可能。月グリッドに予約済み配信を日別表示し、日をクリックでその日の一覧を表示。

## テスト

ビジネスロジックは依存注入 + インメモリフェイクで Node 上の Vitest 実行（workerd 不要）。

| テスト | 対象 |
|--------|------|
| `test/crypto.test.ts` | AES-GCM 暗号化（改ざん検知・IVランダム性） |
| `test/session.test.ts` | セッション署名・検証 |
| `test/youtube-client.test.ts` | YouTube API クライアント（fetchモック） |
| `test/orchestrator.test.ts` | 予約作成オーケストレーション・ロールバック |
| `test/api.test.ts` | API ハンドラ（認証ガード・CRUD・予約作成・OAuth） |
| `test/bulk.test.ts` | 一括予約・staging サムネ（部分失敗・件数上限・所有ガード） |
| `test/template-vars.test.ts` | タイトル変数展開 |
| `test/draft.test.ts` | 下書きの localStorage 永続化 |
| `test/calendar.test.ts` | 週/月の日付ユーティリティ |
| `test/web-api.test.ts` | フロント API クライアント |
