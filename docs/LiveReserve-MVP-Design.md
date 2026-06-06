# 🏗️ LiveReserve MVP 設計プラン

> 関連: [LiveReserve PRD](./LiveReserve-PRD.md)

本ドキュメントは PRD の MVP スコープを実装に落とし込むための設計プラン。
実装着手前のアーキテクチャ・API・DB・タスク分解を定義する。

---

## 1. 🎯 MVPスコープ

PRD「4. MVP」に限定する。将来機能（定期配信・変数展開・サムネ生成・SNS/Discord通知）は **本設計の対象外**だが、拡張しやすい構造を意識する。

| # | 機能 | 内容 |
|---|------|------|
| 1 | Googleログイン | YouTube アカウントで OAuth ログイン |
| 2 | テンプレート作成 | タイトル / 概要欄 / 公開範囲 / サムネイルを保存 |
| 3 | 配信予約作成 | 日時入力 → YouTube 予約 + ストリーム作成 + 紐付け |
| 4 | 配信一覧 | 作成済み配信を表示（タイトル / 日時 / URL / 公開状態） |

---

## 2. 🧱 アーキテクチャ概要

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Frontend (React+Vite+TS)   │        │      Google / YouTube        │
│  - ログイン                  │        │  - OAuth 2.0                 │
│  - テンプレート編集          │  HTTPS │  - YouTube Data API v3       │
│  - 予約作成フォーム          │ <────> │  - Live Streaming API        │
│  - 配信一覧                  │        └──────────────────────────────┘
└──────────────┬──────────────┘                     ▲
               │ REST (JSON)                          │ OAuth token
               ▼                                      │
┌─────────────────────────────┐                       │
│   Backend (Go / net/http)   │───────────────────────┘
│  - 認証 / セッション         │
│  - テンプレート CRUD         │        ┌──────────────────────────────┐
│  - 予約作成オーケストレーション│ <───> │      SQLite (file DB)         │
│  - YouTube API クライアント   │        └──────────────────────────────┘
└─────────────────────────────┘
```

- フロントとバックは REST(JSON) で分離。
- YouTube API 呼び出しはすべてバックエンドで実行（アクセストークンをフロントに露出しない）。
- セッションは HttpOnly Cookie で管理。

---

## 3. 📁 ディレクトリ構成（案）

リポジトリ規約に合わせ `app/live-reserve/` 配下に配置する。

```
app/live-reserve/
├── README.md
├── backend/                 # Go
│   ├── go.mod
│   ├── cmd/server/main.go   # エントリポイント
│   └── internal/
│       ├── config/          # 環境変数読み込み
│       ├── auth/            # Google OAuth / セッション
│       ├── db/              # SQLite 接続・マイグレーション
│       ├── template/        # テンプレート CRUD
│       ├── broadcast/       # 配信予約オーケストレーション
│       ├── youtube/         # YouTube API クライアント
│       └── httpapi/         # ルーティング・ハンドラ・ミドルウェア
├── frontend/                # React + Vite + TS + Tailwind
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── lib/api.ts       # API クライアント
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Templates.tsx
│       │   ├── CreateBroadcast.tsx
│       │   └── Broadcasts.tsx
│       └── components/      # 共通UI（Apple風）
└── .env.example
```

---

## 4. 🔐 認証フロー（Google OAuth）

必要スコープ:

- `https://www.googleapis.com/auth/youtube` （予約・ストリーム作成）
- `openid` / `email` / `profile` （ユーザー識別）

フロー:

1. フロント → `GET /api/auth/login` → バックが Google 認可URLへリダイレクト（`state` 発行）
2. ユーザー承認 → `GET /api/auth/callback?code=...&state=...`
3. バックが `code` をトークン交換、`refresh_token` を取得・保存
4. セッションCookie（HttpOnly / Secure / SameSite=Lax）を発行
5. 以降の API はセッションからユーザーを解決、必要時に `refresh_token` でアクセストークン更新

> 注意: `refresh_token` を確実に得るため、認可URLに `access_type=offline` と `prompt=consent` を付与する。

---

## 5. 🗄️ データモデル（SQLite）

```sql
-- ユーザー（Googleアカウント）
CREATE TABLE users (
    id            TEXT PRIMARY KEY,         -- UUID
    google_sub    TEXT UNIQUE NOT NULL,     -- Google アカウント識別子
    email         TEXT NOT NULL,
    display_name  TEXT,
    refresh_token TEXT NOT NULL,            -- 暗号化して保存
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 配信テンプレート
CREATE TABLE templates (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id),
    name         TEXT NOT NULL,             -- テンプレート名
    title        TEXT NOT NULL,             -- 配信タイトル（将来 {{変数}} 対応）
    description  TEXT,                       -- 概要欄
    privacy      TEXT NOT NULL DEFAULT 'private', -- public | unlisted | private
    thumbnail_path TEXT,                     -- 保存したサムネイル
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 作成済み配信予約
CREATE TABLE broadcasts (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id),
    template_id   TEXT REFERENCES templates(id),
    video_id      TEXT NOT NULL,            -- YouTube videoId
    broadcast_id  TEXT NOT NULL,            -- liveBroadcast id
    stream_id     TEXT,                     -- liveStream id
    title         TEXT NOT NULL,
    scheduled_at  DATETIME NOT NULL,        -- 配信予定日時
    privacy       TEXT NOT NULL,
    watch_url     TEXT NOT NULL,            -- 視聴URL
    status        TEXT NOT NULL DEFAULT 'created',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. 🔌 REST API（MVP）

| Method | Path | 説明 |
|--------|------|------|
| GET  | `/api/auth/login` | Google 認可URLへリダイレクト |
| GET  | `/api/auth/callback` | OAuth コールバック・セッション発行 |
| POST | `/api/auth/logout` | ログアウト |
| GET  | `/api/me` | ログインユーザー情報 |
| GET  | `/api/templates` | テンプレート一覧 |
| POST | `/api/templates` | テンプレート作成 |
| PUT  | `/api/templates/:id` | テンプレート更新 |
| DELETE | `/api/templates/:id` | テンプレート削除 |
| POST | `/api/templates/:id/thumbnail` | サムネイルアップロード |
| GET  | `/api/broadcasts` | 配信一覧 |
| POST | `/api/broadcasts` | 配信予約作成（下記オーケストレーション） |

すべて認証必須（`/api/auth/*` 除く）。レスポンスは JSON。

---

## 7. ⚙️ 配信予約作成オーケストレーション

`POST /api/broadcasts`（入力: `template_id`, `scheduled_at`）

YouTube Live Streaming API の標準フロー:

1. **liveBroadcasts.insert** — タイトル / 概要 / 公開設定 / 予定日時で配信枠作成 → `broadcastId`, `videoId`
2. **liveStreams.insert** — RTMP 配信ストリーム作成 → `streamId` + ストリームキー（OBS用）
3. **liveBroadcasts.bind** — broadcast と stream を紐付け
4. **thumbnails.set**（任意）— テンプレートにサムネイルがあれば設定
5. DB に `broadcasts` レコード保存
6. レスポンス: `{ videoId, watchUrl, streamKey, ingestionAddress }`

> パフォーマンス目標 3秒以内。API 呼び出しは逐次依存があるため直列。失敗時は途中までの作成リソースをロールバック（broadcast 削除）してエラー返却。

---

## 8. 🎨 UI（MVP・Apple風）

| 画面 | 内容 |
|------|------|
| ログイン | 「Googleでログイン」1ボタンのみ |
| テンプレート | 一覧 + 作成/編集フォーム（タイトル・概要・公開範囲・サムネ） |
| 予約作成 | テンプレート選択 → 日時入力 → 「予約作成」ボタン → 結果（URL/ストリームキー）表示 |
| 配信一覧 | カード or テーブル（タイトル / 日時 / URL / 公開状態） |

方針: シンプル・余白多め・モノクロ基調 + アクセントカラー1色。不要機能は置かない。

---

## 9. 📦 実装タスク分解

### Phase 0: 基盤
- [ ] `app/live-reserve/` 雛形作成（backend/frontend/.env.example）
- [ ] Go: net/http ルーティング + SQLite 接続 + マイグレーション
- [ ] Vite + React + TS + Tailwind セットアップ

### Phase 1: 認証
- [ ] Google OAuth ログイン/コールバック/セッション
- [ ] `/api/me`・フロントのログインガード

### Phase 2: テンプレート
- [ ] テンプレート CRUD API + サムネイルアップロード
- [ ] テンプレート編集UI

### Phase 3: 配信予約
- [ ] YouTube API クライアント（insert/insert/bind/thumbnail）
- [ ] 予約作成オーケストレーション + ロールバック
- [ ] 予約作成UI + 結果表示

### Phase 4: 配信一覧
- [ ] 一覧API + 一覧UI

### Phase 5: 仕上げ
- [ ] エラーハンドリング/トースト表示
- [ ] パフォーマンス計測（3秒以内）
- [ ] README / セットアップ手順

---

## 10. ⚠️ 留意事項・リスク

- **YouTube API クォータ**: liveBroadcasts.insert 等は割当消費が大きい。クォータ上限に注意。
- **OAuth 審査**: `youtube` スコープは機微スコープ。本番公開時は Google の検証が必要（個人利用/テスト段階なら test users で回避可）。
- **refresh_token の暗号化保存**: SQLite に平文保存しない。アプリ鍵で暗号化。
- **トークン失効**: refresh 失敗時は再ログインを促す。
- **将来拡張**: テンプレートの `title` に `{{変数}}` を埋め込み、予約作成時に展開する設計を前提にカラムを用意済み。
