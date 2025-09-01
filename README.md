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

### 🆕 新規開発予定

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
│   └── line-official-manager/     # LINE管理 (開発予定)
├── docs/                   # ドキュメント
│   └── LINE-Official-Manager-Specification.md
└── README.md              # このファイル
```

## 🚀 開発状況

| ツール | 状況 | 進捗 |
|--------|------|------|
| Discord CSS生成 | ✅ リリース済み | 100% |
| 立ち絵移動CSS | ✅ リリース済み | 100% |  
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