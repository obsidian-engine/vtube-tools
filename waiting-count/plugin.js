const fs = require("fs");
const path = require("path");
const os = require("os");

module.exports = {
  name: "わんこめ参加人数表示プラグイン",
  uid: "tokyo.vtube-tools.waiting-count",
  version: "1.0.0",
  author: "VTube Tools",
  permissions: [],
  defaultState: {},

  // 設定（カスタマイズ可能）
  config: {
    prefix: "参加者: ",
    suffix: "人",
    outputFileName: "waiting_count.txt",
    debounceMs: 100,
  },

  // 内部状態
  state: {
    watcher: null,
    currentCount: 0,
    debounceTimer: null,
    waitingFilePath: null,
    outputFilePath: null,
  },

  /**
   * プラグイン初期化
   */
  init({ dir, store }) {
    this.store = store;

    // ファイルパスの設定
    const onecommeDataDir = path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "onecomme",
    );

    this.state.waitingFilePath = path.join(onecommeDataDir, "waiting.txt");
    this.state.outputFilePath = path.join(
      onecommeDataDir,
      this.config.outputFileName,
    );

    console.log("[WaitingCount] プラグイン起動");
    console.log(`[WaitingCount] 監視対象: ${this.state.waitingFilePath}`);
    console.log(`[WaitingCount] 出力先: ${this.state.outputFilePath}`);

    // 初回読み込み
    this.updateCount();

    // ファイル監視開始
    this.startWatching();
  },

  /**
   * プラグイン終了処理
   */
  destroy() {
    if (this.state.watcher) {
      this.state.watcher.close();
      this.state.watcher = null;
      console.log("[WaitingCount] ファイル監視停止");
    }

    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer);
      this.state.debounceTimer = null;
    }

    console.log("[WaitingCount] プラグイン終了");
  },

  /**
   * ファイル監視開始
   */
  startWatching() {
    try {
      this.state.watcher = fs.watch(
        this.state.waitingFilePath,
        { persistent: true },
        (eventType) => {
          if (eventType === "change") {
            this.debouncedUpdate();
          }
        },
      );

      this.state.watcher.on("error", (error) => {
        console.error("[WaitingCount] ファイル監視エラー:", error.message);
        // エラー時も監視を継続（ファイルが再作成される可能性）
      });

      console.log("[WaitingCount] ファイル監視開始");
    } catch (error) {
      console.error("[WaitingCount] ファイル監視開始失敗:", error.message);
    }
  },

  /**
   * デバウンス処理付き更新
   */
  debouncedUpdate() {
    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer);
    }

    this.state.debounceTimer = setTimeout(() => {
      this.updateCount();
      this.state.debounceTimer = null;
    }, this.config.debounceMs);
  },

  /**
   * waiting.txtを読み込んで人数をカウント
   */
  updateCount() {
    try {
      // ファイルが存在するか確認
      if (!fs.existsSync(this.state.waitingFilePath)) {
        console.log(
          "[WaitingCount] waiting.txtが存在しません。0人として処理します。",
        );
        this.writeCount(0);
        return;
      }

      // ファイル読み込み
      const content = fs.readFileSync(this.state.waitingFilePath, "utf-8");

      // 1行目を取得
      const firstLine = content.split("\n")[0] || "";

      if (!firstLine.trim()) {
        console.log(
          "[WaitingCount] waiting.txtが空です。0人として処理します。",
        );
        this.writeCount(0);
        return;
      }

      // パース: "1:佐藤 2:小林 3:武藤" → 番号の最大値を取得
      const count = this.parseWaitingLine(firstLine);

      console.log(`[WaitingCount] 参加人数: ${count}人`);
      this.writeCount(count);
    } catch (error) {
      console.error("[WaitingCount] ファイル読み込みエラー:", error.message);
      console.log(
        `[WaitingCount] 前回の人数を維持: ${this.state.currentCount}人`,
      );
      // エラー時は前回の値を維持（書き込みしない）
    }
  },

  /**
   * waiting.txtの1行をパースして人数を取得
   * @param {string} line - "1:佐藤 2:小林 3:武藤" 形式
   * @returns {number} - 参加人数（番号の最大値）
   */
  parseWaitingLine(line) {
    const parts = line.trim().split(/\s+/);
    const numbers = [];

    for (const part of parts) {
      // "番号:名前" 形式から番号を抽出
      const match = part.match(/^(\d+):/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) {
          numbers.push(num);
        }
      }
    }

    if (numbers.length === 0) {
      console.log(
        "[WaitingCount] 有効な番号が見つかりません。0人として処理します。",
      );
      return 0;
    }

    // 番号の最大値 = 参加人数
    return Math.max(...numbers);
  },

  /**
   * 人数をonecomme_waiting_count.txtに書き込み
   * @param {number} count - 参加人数
   */
  writeCount(count) {
    // 人数が変わらない場合は書き込みスキップ
    if (count === this.state.currentCount) {
      return;
    }

    const outputText = `${this.config.prefix}${count}${this.config.suffix}`;

    try {
      // アトミック書き込み（tmpファイル→rename）
      const tmpFilePath = `${this.state.outputFilePath}.tmp`;

      fs.writeFileSync(tmpFilePath, outputText, "utf-8");
      fs.renameSync(tmpFilePath, this.state.outputFilePath);

      this.state.currentCount = count;
      console.log(`[WaitingCount] 書き込み成功: ${outputText}`);
    } catch (error) {
      console.error("[WaitingCount] ファイル書き込みエラー:", error.message);
      // 書き込み失敗時、次回変更時にリトライされる
    }
  },
};
