# 🎭 VTube Tools

VTuber・配信者向けの便利ツール集です。

## 🛠️ 提供ツール

### 📱 既存ツール

#### 🎨 Discord立ち絵CSS生成ツール
- **場所**: `app/discord-css-generator/`
- **機能**: Discord StreamKit → OBS配信用立ち絵CSS生成
- **特徴**: 発話で跳ね・光るアニメーション対応

#### 🎬 立ち絵移動CSS生成ツール
- **場所**: `app/create-tachie-move-css/`
- **機能**: 立ち絵移動アニメーション用CSS生成
- **特徴**: シェルスクリプトによる自動生成

#### 🎭 わんこめツール集
- **リポジトリ**: [onecomme-tools](https://github.com/DaichiHoshina/onecomme-tools)
- **機能**: わんこめ（onecomme）プラグイン・CSSテンプレート集
- **主要ツール**:
  - **waiting-count**: 参加型機能の人数をOBS画面にリアルタイム表示
  - **simple-css**: シンプルなコメント表示用CSSテンプレート
  - **neon-custome**: ネオンエフェクトカスタマイズ版

### 🆕 新規開発予定

#### 📅 LiveReserve（配信予約自動作成ツール）
- **場所**: `app/live-reserve/` (MVP実装済み)
- **機能**: YouTube Live の配信予約をテンプレートからワンクリック作成
- **キャッチコピー**: 「配信予約、もうStudioを開かない。」
- **主要機能（MVP）**:
  - 🔑 **Googleログイン**: YouTube アカウントで OAuth ログイン
  - 📝 **テンプレート作成**: タイトル・概要欄・公開範囲・サムネイル
  - ⚙️ **配信予約作成**: 日時入力で予約 + ストリーム作成 + 自動紐付け
  - 📺 **配信一覧**: 作成済み配信を一覧表示

#### 技術スタック
- **フロントエンド**: React, Vite, TypeScript, TailwindCSS
- **バックエンド**: Hono (TypeScript) on Cloudflare Workers
- **データベース**: Cloudflare D1 (SQLite互換) + Drizzle ORM
- **ストレージ**: Cloudflare R2 (サムネ保存)
- **外部API**: YouTube Data API / Live Streaming API
- **認証**: Google OAuth
- 技術選定の根拠は [docs/LiveReserve-Design-Doc.md](docs/LiveReserve-Design-Doc.md) を参照（PRD §7のGo/SQLite案から本スタックへ変更）

#### 📱 LINE公式アカウント管理ツール
- **場所**: `app/line-official-manager/` (開発予定)
- **機能**: VTuber向けLINE公式アカウント簡単管理
- **主要機能**:
  - 🎨 **リッチメニュー設定**: ドラッグ&ドロップエディター
  - 📤 **メッセージ送信**: 即時送信・予約送信・バルク送信
  - 🤖 **自動返信Bot**: ノードベースフローエディター
  - 📊 **分析ダッシュボード**: 送信履歴・効果測定

#### 技術スタック
- **フロントエンド**: Next.js 15, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, LINE Bot SDK
- **データベース**: PostgreSQL + Prisma ORM
- **キャッシュ**: Redis

## 📋 ドキュメント

### 📖 詳細仕様書
- [LiveReserve PRD（配信予約ツール）](docs/LiveReserve-PRD.md)
- [LiveReserve MVP 設計プラン](docs/LiveReserve-MVP-Design.md)
- [LiveReserve 技術選定デザインドック](docs/LiveReserve-Design-Doc.md)
- [LINE公式アカウント管理ツール仕様書](docs/LINE-Official-Manager-Specification.md)

### 🚀 開発ガイド（開発予定）
- [LINE設定ガイド](docs/LINE-Setup-Guide.md)
- [開発環境構築](docs/Development-Guide.md)  
- [デプロイガイド](docs/Deployment-Guide.md)

## 🎯 プロジェクト目標

VTuber・配信者の方々が**技術的な知識なしに**、簡単に以下を実現できることを目指しています：

- ✅ **プロフェッショナルな配信環境構築**
- ✅ **ファンとの効果的なコミュニケーション**  
- ✅ **運用作業の自動化・効率化**
- ✅ **データ分析による改善**

## 🏗️ プロジェクト構造

```
vtube-tools/
├── app/                    # アプリケーション群
│   ├── discord-css-generator/     # Discord CSS生成
│   ├── create-tachie-move-css/    # 立ち絵移動CSS
│   ├── live-reserve/              # 配信予約自動作成 (開発予定)
│   └── line-official-manager/     # LINE管理 (開発予定)
├── docs/                   # ドキュメント
│   ├── LiveReserve-PRD.md
│   ├── LiveReserve-MVP-Design.md
│   ├── LiveReserve-Design-Doc.md
│   └── LINE-Official-Manager-Specification.md
└── README.md              # このファイル
```

## 🚀 開発状況

| ツール | 状況 | 進捗 |
|--------|------|------|
| Discord CSS生成 | ✅ リリース済み | 100% |
| 立ち絵移動CSS | ✅ リリース済み | 100% |
| わんこめツール集 | ✅ リリース済み ([別リポジトリ](https://github.com/DaichiHoshina/onecomme-tools)) | - |
| LiveReserve（配信予約） | 🧪 MVP実装済み（TDD・46テスト） | 70% |
| LINE公式アカウント管理 | 🏗️ 仕様設計完了 | 10% |

## 🎉 貢献・フィードバック

### 🐛 バグ報告・機能要望
Issue を通してお気軽にご報告・ご提案ください。

### 🤝 コントリビューション  
プルリクエストを歓迎いたします！

### 📞 サポート
VTuber・配信者の皆さんの活動をサポートできるよう、継続的に改善してまいります。

---

**🎨 Made with ❤️ for VTubers & Content Creators**