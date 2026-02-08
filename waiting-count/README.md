# わんこめ参加人数表示プラグイン

わんこめ（onecomme）の参加型機能の人数をOBS配信画面にリアルタイム表示するプラグインです。

## 機能

- ✅ `waiting.txt`を自動監視し、参加人数を即座に反映
- ✅ OBS用テキストファイル（`waiting_count.txt`）に自動出力
- ✅ 軽量・高速（イベント駆動、アイドル時CPU 0%）
- ✅ エラー時も前回の人数を維持（配信事故防止）

## インストール手順

### 1. プラグインファイルの配置

以下のいずれかの方法でプラグインをインストールします。

#### 方法A: わんこめのpluginsディレクトリに直接配置

```bash
# わんこめのプラグインディレクトリに移動
cd ~/Library/Application\ Support/onecomme/plugins/

# waiting-countディレクトリを作成してファイルをコピー
mkdir -p waiting-count
cp /path/to/vtube-tools/waiting-count/plugin.js ./waiting-count/
cp /path/to/vtube-tools/waiting-count/package.json ./waiting-count/
```

#### 方法B: シンボリックリンクで配置（開発者向け）

```bash
# わんこめのプラグインディレクトリに移動
cd ~/Library/Application\ Support/onecomme/plugins/

# シンボリックリンクを作成
ln -s /path/to/vtube-tools/waiting-count ./waiting-count
```

### 2. わんこめを再起動

わんこめを再起動すると、プラグインが自動で読み込まれます。

### 3. プラグインの確認

わんこめのコンソールログに以下のメッセージが表示されれば成功です：

```
[WaitingCount] プラグイン起動
[WaitingCount] 監視対象: /Users/daichi/Library/Application Support/onecomme/waiting.txt
[WaitingCount] 出力先: /Users/daichi/Library/Application Support/onecomme/waiting_count.txt
[WaitingCount] ファイル監視開始
```

## OBS設定手順

### 1. テキストソースの追加

1. OBSで「ソース」パネルの「+」ボタンをクリック
2. 「テキスト（GDI+）」または「テキスト（FreeType 2）」を選択
3. ソース名を「参加人数」などに設定

### 2. ファイルからの読み込み設定

1. 「ファイルから読み取る」にチェックを入れる
2. 「参照」ボタンをクリック
3. 以下のファイルを選択：
   ```
   /Users/daichi/Library/Application Support/onecomme/waiting_count.txt
   ```

### 3. デザイン設定

- **フォント**: お好みのフォントを選択
- **サイズ**: 48px推奨（配信画面に合わせて調整）
- **色**: #FFFFFF（白）推奨
- **背景色**: 透明または配信画面に合わせて設定
- **配置**: 画面の好きな位置にドラッグ

### 4. 動作確認

1. わんこめで参加型機能を開始
2. 参加者が増減したら、OBS画面の表示が即座に更新されることを確認

## カスタマイズ

### 表示テキストの変更

`plugin.js`の`config`セクションで接頭辞・接尾辞を変更できます：

```javascript
config: {
  prefix: '参加者: ',  // 変更可能（例: '現在の参加人数: '）
  suffix: '人',        // 変更可能（例: '名参加中'）
  outputFileName: 'waiting_count.txt',
  debounceMs: 100,
},
```

**例**:
- `prefix: '🎮 '`, `suffix: '人参加中'` → 表示: 🎮 3人参加中
- `prefix: ''`, `suffix: '名'` → 表示: 3名

変更後はわんこめを再起動してください。

### 出力ファイル名の変更

`outputFileName`を変更することで、出力先のファイル名を変更できます。

変更した場合は、OBS側のテキストソース設定も新しいファイル名に変更してください。

## トラブルシューティング

### 人数が表示されない

1. **プラグインが起動しているか確認**
   - わんこめのコンソールログに`[WaitingCount] プラグイン起動`が表示されているか確認

2. **waiting.txtが存在するか確認**
   ```bash
   ls ~/Library/Application\ Support/onecomme/waiting.txt
   ```

3. **出力ファイルが生成されているか確認**
   ```bash
   cat ~/Library/Application\ Support/onecomme/waiting_count.txt
   ```

4. **OBSのファイルパスが正しいか確認**
   - テキストソースのプロパティでファイルパスを確認

### 人数が更新されない

1. **ファイル監視が動作しているか確認**
   - わんこめのコンソールログに`[WaitingCount] ファイル監視開始`が表示されているか確認

2. **わんこめを再起動**
   - プラグインを再読み込みするためにわんこめを再起動

3. **OBSのテキストソースを再読み込み**
   - テキストソースを一度削除して再度追加

### エラーメッセージが表示される

コンソールログに以下のエラーが表示された場合：

- **`ファイル監視エラー`**: waiting.txtのパーミッションを確認
- **`ファイル読み込みエラー`**: ファイルが別プロセスでロックされている可能性
- **`ファイル書き込みエラー`**: onecommeディレクトリの書き込み権限を確認

## 仕様

### 動作環境
- **Node.js**: 14.0.0以上
- **わんこめ**: プラグイン機能対応版
- **OS**: macOS（Linuxでもパス変更で動作可能）

### パフォーマンス
- **CPU使用率**: アイドル時 0%（イベント駆動）
- **メモリ使用量**: 5MB以下
- **レイテンシ**: 100ms以内（デバウンス処理含む）

### 対応フォーマット

**waiting.txtの形式**:
```
1:佐藤 2:小林 3:武藤
```

- 1行目を読み込み
- スペース区切りで分割
- `番号:名前`形式から番号を抽出
- 番号の最大値 = 参加人数

### 出力ファイル

**waiting_count.txt**:
```
参加者: 3人
```

- 人数が変更されたときのみ書き込み（無駄なI/O削減）
- アトミック書き込み（tmpファイル→rename）でOBSの読み込みエラーを防止

## ライセンス

MIT License

## サポート

バグ報告や機能要望は、VTube Toolsリポジトリのissueからお願いします。
