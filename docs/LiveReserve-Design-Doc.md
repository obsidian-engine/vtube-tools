# 🧩 LiveReserve 技術選定デザインドック

> 関連: [LiveReserve PRD](./LiveReserve-PRD.md) ／ [LiveReserve MVP 設計プラン](./LiveReserve-MVP-Design.md)

---

## 1. 📋 概要 / Context

本ドキュメントは LiveReserve の **技術選定の根拠** をまとめたもの。各レイヤーで「何を採用し、なぜそれが LiveReserve の制約に合うか」「何を見送ったか」を意思決定形式で記録する。

- **本ドックがやること**: スタックおよび各レイヤー内のライブラリ/ツール選定とその理由・トレードオフの記録。
- **本ドックがやらないこと**: 機能仕様（→ PRD）、画面/API/スキーマの詳細設計（→ MVP 設計プラン）の再定義。

### ⚠️ PRD からの方針転換

PRD §7 ではバックエンドを **Go**、DB を **ローカル SQLite** としていたが、確定した最優先要件（**個人利用・完全無料・ミニマル**）を踏まえ、本ドックで以下へ更新する。

| 項目 | PRD §7 | 本ドックでの決定 | 転換理由 |
|------|--------|------------------|----------|
| バックエンド | Go | **Hono (TypeScript)** | フロントと同一TS1言語に統一し、個人開発の認知負荷・文脈切替を最小化 |
| 実行環境 / DB | ローカル SQLite | **Cloudflare Workers + D1（SQLite互換）** | 無料枠で常時稼働。スマホからも利用可。サーバ運用・コストをゼロに近づける |

フロントエンド（React / Vite / TS / Tailwind）、Google OAuth、YouTube API という大枠は PRD のまま維持する。

---

## 2. 🎯 選定を駆動する制約

すべての決定は、以下の制約のいずれかに紐づく。

- **個人利用**: 運用・保守の負担を最小化。複雑な構成は採らない。
- **完全無料**: 無料枠の範囲で常時稼働させる。有料前提のサービスは避ける。
- **ミニマル**: 言語・依存・概念をできる限り減らす。「足りない」より「多すぎない」を優先。
- **予約作成 < 3秒**（PRD §6）。
- **Apple風・シンプルな UI**（PRD §6）。
- **障害時はユーザーへエラー内容を表示**（PRD §6）。

---

## 3. 🏗️ 確定スタック全体像

| 領域 | 採用 | なぜ LiveReserve に合うか |
|------|------|--------------------------|
| 言語 | **TypeScript**（フロント・バック共通） | 1言語で完結。型をフロント/バックで共有でき、個人開発に最適 |
| バックエンド | **Hono on Cloudflare Workers** | 超軽量・Workersネイティブ。無料枠で常時稼働 |
| DB | **Cloudflare D1（SQLite互換）+ Drizzle ORM** | 無料枠。SQLite互換でMVP設計のスキーマをほぼ流用可 |
| フロント | **React + Vite + TailwindCSS** | PRD指定。エコシステムが厚くミニマルに組める |
| 認証 | **Google OAuth 2.0**（署名付きHttpOnly Cookie） | YouTube操作に必須。同一オリジンでCookie管理を単純化 |
| 外部API | **YouTube Data API v3 / Live Streaming API**（REST直叩き） | 配信予約・ストリーム作成・紐付けに必須 |
| サムネ保存 | **Cloudflare R2** | 無料枠のオブジェクトストレージ。Workersに永続FSが無いため |
| ホスティング | **Cloudflare 無料枠**（単一WorkerでSPA+API同一オリジン配信） | コストゼロ・常時稼働・CORS不要 |

---

## 4. ✅ 決定サマリ

| 領域 | 採用 | 主な対抗馬 | 一言理由 |
|------|------|------------|----------|
| Webフレームワーク | Hono | 素のfetchハンドラ / itty-router | Workersネイティブで軽量・型が強い |
| DBアクセス | Drizzle ORM | 素のD1 / Kysely | 型安全・D1公式対応・スキーマをTS一元管理 |
| マイグレーション | Drizzle Kit | 手書きSQL | スキーマから差分生成、Wranglerで適用 |
| OAuth | x/oauth2相当の手書き or `@hono/oauth-providers` | arctic | 標準的・Workersで完結 |
| セッション | 署名付きHttpOnly Cookie | D1セッションテーブル | テーブル不要で最小構成 |
| YouTube API | REST直叩き（fetch） | `googleapis` SDK | SDKはWorkers非推奨・重い |
| トークン暗号化 | Web Crypto AES-GCM | 外部KMS | 標準API・依存ゼロ |
| サムネ保存 | R2 | D1へbase64 | 永続FS無し、画像はオブジェクトストレージへ |
| データ取得 | TanStack Query | SWR / 素のfetch | キャッシュ・loading/error標準 |
| クライアント状態 | React Context（必要時Zustand） | 最初からZustand/Redux | サーバ状態が主、最小限で足りる |
| ルーティング | React Router | TanStack Router | 4画面に十分・成熟 |
| UI | Tailwind + ヘッドレス（shadcn/ui起点） | MUI / Chakra | 意匠を自前で持てる＝Apple風 |
| ホスティング | 単一Worker（Static Assets）でSPA+API | Pages + Functions分離 | 同一オリジンで単純 |
| バックアップ | D1 Time Travel（内蔵） | Litestream等 | 追加ツール不要 |
| テスト | Vitest + Miniflare / RTL | Jest | Workers/D1をローカル再現 |
| CI/CD | GitHub Actions + wrangler-action | 手動デプロイ | 無料・標準 |

---

## 5. 🧱 領域別の決定

各項目は **採用 / 対抗馬 / 理由 / トレードオフ** で記述する。

### 5.1 Backend（Hono on Cloudflare Workers）

#### Webフレームワーク
- **採用**: Hono
- **対抗馬**: 素の Workers `fetch` ハンドラ、itty-router
- **理由**: Workersネイティブで超軽量。ルーティング・ミドルウェア・Cookieヘルパー・バリデーションを内蔵し、TS型推論が強い。約11エンドポイント（MVP設計 §6）を最小コードで実装できる＝ミニマル制約に合致。
- **トレードオフ**: 素のfetchより薄い依存が1つ増えるが、得られるDXとCookieヘルパーがOAuth実装を簡略化するため十分見合う。

#### DBアクセス
- **採用**: Drizzle ORM（D1ドライバ）
- **対抗馬**: 素のD1 prepared statement、Kysely
- **理由**: 型安全・軽量で D1 を公式サポート。スキーマを TS で一元管理でき、MVP設計 §5 のテーブル（users / templates / broadcasts）をそのまま移植できる。
- **トレードオフ**: 生SQLより薄い抽象が入るが、ORMマジックは最小限で挙動が追いやすい。重量級ORMは個人開発には過剰。

#### マイグレーション
- **採用**: Drizzle Kit（`drizzle-kit generate` で差分SQL生成 → `wrangler d1 migrations apply` で適用）
- **対抗馬**: 手書きSQL + `wrangler d1 migrations`
- **理由**: スキーマ定義から差分を自動生成でき、Drizzleと一体で管理できる。
- **トレードオフ**: 生成物のレビューは必要。だが手書きより事故が少ない。

#### Google OAuth
- **採用**: `@hono/oauth-providers`（Google）、または認可URL生成→`code`交換→`refresh_token`保存を行う手書きoauth2フロー
- **対抗馬**: arctic
- **理由**: Workers上で完結する標準的フロー。`refresh_token` を確実に得るため認可URLに `access_type=offline` ＋ `prompt=consent` を付与（MVP設計 §4 と整合）。
- **トレードオフ**: 手書きの場合はトークン更新ロジックを自前実装するが、内容は薄い。

#### セッション
- **採用**: Hono の署名付き HttpOnly Cookie（`setSignedCookie` / `getSignedCookie`、`Secure` / `SameSite=Lax`）
- **対抗馬**: D1 にセッションテーブルを持つ方式
- **理由**: セッションテーブル不要で最小構成。単一オリジン配信のためCookieが素直に効く。
- **トレードオフ**: ステートレスゆえサーバ側からの強制失効ができない。個人利用では許容（→ §7 オープン論点）。

#### YouTube API
- **採用**: REST 直叩き（`fetch`）の薄い型付きクライアント。`liveBroadcasts.insert/bind`・`liveStreams.insert`・`thumbnails.set` をラップ（MVP設計 §7 のオーケストレーション）
- **対抗馬**: Node用 `googleapis` SDK
- **理由**: `googleapis` SDK は Node 依存が強くWorkersでは非推奨かつ重い。必要なのは数エンドポイントのみで、fetchラッパで十分。`AbortSignal` でタイムアウト管理し、クォータ/`403` を明示的にハンドリングして PRD のエラー表示要件を満たす。
- **トレードオフ**: 型を自前で定義する手間があるが、利用箇所が限定的なので小さい。

#### リフレッシュトークンの暗号化（保存時）
- **採用**: Web Crypto API の AES-GCM（Workers標準）。鍵は Workers Secret（`wrangler secret put APP_ENCRYPTION_KEY`）、レコード毎にランダムIV
- **対抗馬**: 外部KMS、平文保存（不可）
- **理由**: Workersランタイム標準で依存ゼロ。認証付き暗号で改ざん検知も可能。MVP設計の「refresh_token は暗号化保存」を満たす。
- **トレードオフ**: 鍵はSecretに依存（鍵ローテーションは将来課題 → §7）。

#### サムネイル保存
- **採用**: Cloudflare R2（無料枠）にテンプレート画像を保存し、予約作成時に取得して `thumbnails.set` へ渡す
- **対抗馬**: D1 に base64 で格納、永続せずクライアント都度アップロード
- **理由**: Workers に永続FSが無いため、画像はオブジェクトストレージが自然。R2は無料枠で完結。
- **トレードオフ**: バインディングが1つ増えるが、テンプレート再利用には永続が必要（→ §7 で「都度アップロード」案も検討）。

### 5.2 Frontend（React + Vite + TS + Tailwind）

#### データ取得 / サーバ状態
- **採用**: TanStack Query
- **対抗馬**: SWR、素の `fetch` + `useEffect`
- **理由**: キャッシュ・重複排除・mutation+invalidation・loading/error状態を標準提供。テンプレート/配信一覧の表示とエラー表示要件に直結。
- **トレードオフ**: 依存が増えるが、エラー/ローディングの手当てを自前実装するより堅い。

#### クライアント状態
- **採用**: 最小限。認証セッションは React Context、必要が生じたら Zustand
- **対抗馬**: 最初からZustand、Redux（過剰で却下）
- **理由**: 状態の大半はサーバ状態（TanStack Query管理）。純粋なクライアント状態は「ログイン中か」程度でContextで足りる。
- **トレードオフ**: Context再描画は規模が小さく問題にならない。

#### ルーティング
- **採用**: React Router
- **対抗馬**: TanStack Router（型安全）
- **理由**: 画面は4つ（ログイン/テンプレート/予約作成/配信一覧）。成熟・標準で十分。
- **トレードオフ**: コンパイル時のルート型安全性は劣るが、この規模では不要。

#### UI / コンポーネント
- **採用**: Tailwind + ヘッドレスプリミティブ（Radix / Headless UI）。**shadcn/ui を出発点に MVP設計 §8 のモノクロ+アクセント1色へ再スタイル**。トーストは sonner 等
- **対抗馬**: MUI / Chakra
- **理由**: Apple風＝意匠を自前で細かく制御したい。Tailwind+ヘッドレスは挙動（アクセシビリティ）を借りつつ見た目を自前で持てる。shadcn/uiで初速も確保。
- **トレードオフ**: 既製キットより組み立てる箇所が増えるが、汎用的な見た目を避けられる。

### 5.3 Infra / 運用（Cloudflare 無料枠）

#### 配信 / ホスティング
- **採用**: 単一 Worker で静的アセット（SPA）と API を同一オリジン配信（Workers Static Assets。または Cloudflare Pages + Functions）
- **対抗馬**: Pages（静的）と Worker（API）を分離
- **理由**: 同一オリジンにすることで CORS 不要、HttpOnly Cookie が素直に効く。デプロイ対象が1つでミニマル。
- **トレードオフ**: フロントとAPIのデプロイが密結合になるが、個人開発ではむしろ単純で利点。

#### DB
- **採用**: D1（無料枠）。バックアップは D1 Time Travel（PITR）内蔵で対応
- **対抗馬**: Litestream等の外部バックアップ
- **理由**: 無料枠のストレージで個人利用に十分。Time Travel が標準で時点復元を提供し、追加ツール不要。
- **トレードオフ**: D1 はSQLite「互換」で一部挙動差あり（→ §6）。

#### 設定 / シークレット
- **採用**: `wrangler.toml`（D1 / R2 / 環境変数のバインディング）＋ `wrangler secret`（Google client secret・暗号鍵）。ローカルは `.dev.vars`（gitignore）
- **対抗馬**: 外部設定サービス
- **理由**: Workers標準の仕組みで完結。秘密情報はSecretに集約。
- **トレードオフ**: 特になし。

#### ログ
- **採用**: `console.*` + `wrangler tail` / Workers Logs
- **理由**: Workers標準。エラー（特にYouTube API失敗）を文脈付きで出力し、診断・ユーザー表示に活かす。

#### テスト
- **採用**: Worker側は Vitest + `@cloudflare/vitest-pool-workers`（Miniflare）。YouTubeクライアントを interface 化してモックし、オーケストレーション（MVP設計 §7）をAPI/クォータ非依存でテスト。D1はローカルMiniflare。フロントは Vitest + React Testing Library
- **対抗馬**: Jest、e2e（Playwright）
- **理由**: Workers/D1をローカル再現でき、CI高速。e2eはMVPでは過剰。
- **トレードオフ**: e2eは将来必要に応じて追加。

#### CI/CD
- **採用**: GitHub Actions（`tsc --noEmit` / vitest / eslint / `vite build` / `drizzle-kit` チェック）、`cloudflare/wrangler-action` でデプロイ
- **理由**: 無料・標準。`main` へのマージで自動デプロイ。
- **トレードオフ**: 特になし。

#### ローカル開発
- **採用**: `wrangler dev`（Workers + D1 + R2 をローカルエミュレート）＋ `vite`（プロキシでAPIへ）
- **理由**: 本番に近い環境をローカルで再現できる。

---

## 6. ⚠️ Workers / D1 固有の留意点

- **CPU時間制限**: 予約作成は複数のYouTube API呼び出しを伴うが、これらはI/O待ち（subrequest）でCPU時間消費は小さい → 無料枠で問題なし。`< 3秒` 目標はネットワーク往復が支配的。
- **subrequest 上限**: 無料プランは1リクエストあたり50 subrequest。予約作成の数回呼び出しは余裕。
- **永続FSなし**: ファイルは保存できないため、サムネイル等は R2 を使う。
- **D1 はSQLite「互換」**: 一部に挙動差がある。Drizzleの D1 方言を使い、生SQLの方言依存を避ける。

---

## 7. ❓ 未解決の論点

1. **サムネイル保存**: R2に永続 vs 予約作成時に都度クライアントアップロード（永続を避けられるか）。
2. **セッション方式**: ステートレス署名Cookie vs D1セッションテーブル（強制ログアウト/失効が必要になるか）。
3. **SPA配信**: 単一Worker（Static Assets）vs Pages + Functions 分離。
4. **暗号鍵の管理 / ローテーション**: MVPは Secret 固定。ローテーション手順は将来検討。
5. **OAuth審査**: 機微スコープ `youtube` のため、テストユーザー限定で運用するか Google 検証を通すか（MVP設計 §10 から引き継ぎ）。
6. **独自ドメイン要否**: `*.workers.dev` で足りるか、独自ドメインを充てるか。

---

## 8. 📦 付録: 主要依存（想定）

### package.json（抜粋・想定）
- ランタイム: `hono`, `drizzle-orm`
- 開発: `wrangler`, `drizzle-kit`, `vite`, `typescript`, `vitest`, `@cloudflare/vitest-pool-workers`, `@testing-library/react`, `eslint`, `tailwindcss`
- フロント: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`
- UI: `tailwindcss` + ヘッドレス（`@radix-ui/*` / shadcn/ui 由来コンポーネント）, トースト（`sonner` 等）

### wrangler.toml（主なバインディング・想定）
- `d1_databases`（LiveReserve本体DB）
- `r2_buckets`（サムネイル）
- `assets`（SPA静的アセット配信）
- `vars` / Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_REDIRECT_URL`, `APP_ENCRYPTION_KEY`, `SESSION_SECRET`

> 上記の依存・バージョンは実装着手時に確定する。本ドックは選定の意図を示すものであり、固定のロックではない。
