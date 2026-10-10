# English Word Overlay

配信画面に英単語を 1 つずつ表示する OBS ブラウザソース用のページです。単語・発音・品詞・英語の意味を一定間隔で切り替えます。

## 使い方

1. OBS で「ブラウザ」ソースを追加する
2. URL に `english-word/index.html` の公開 URL を貼る (幅 1920 / 高さ 1080 推奨)
3. 必要なら URL の末尾にパラメータを付ける

| パラメータ | 既定値 | 内容 |
|---|---|---|
| `interval` | 15 | 切り替え間隔 (秒、最小 5) |
| `pos` | br | 表示位置。`tl` 左上 / `tr` 右上 / `bl` 左下 / `br` 右下 |
| `meaning` | 1 | `0` で意味を表示しない |
| `scale` | 1 | 全体の大きさ (例: `1.5`) |
| `set` | english | 単語セット。`mahjong` で麻雀用語 (読み・分類・解説) を表示する |

例: `.../english-word/index.html?interval=20&pos=tr&scale=1.3`

麻雀配信: `.../english-word/index.html?set=mahjong&interval=20`

## 仕組み

- 単語は `index.html` 内の一覧からランダムに選ぶ。一覧を一巡するまで同じ単語は出ない
- 麻雀用語は辞書 API に無いため、読み・分類・解説を `index.html` 内に持つ (役・点数・待ち・戦術など 40 語)
- 英単語の意味と発音は [Free Dictionary API](https://dictionaryapi.dev/) から取得する。取得できないときは単語だけを表示する
