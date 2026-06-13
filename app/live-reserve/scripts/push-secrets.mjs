// .dev.vars（KEY=value 形式）を読み、シークレットだけを Cloudflare Worker へ一括投入する。
//   pnpm secrets:push            … 既定(=トップレベル)環境へ
//   pnpm secrets:push --env production … production 環境へ
// 非シークレットの OAUTH_REDIRECT_URL は wrangler.jsonc の vars 管理なので除外する。
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const FILE = process.env.SECRETS_FILE ?? ".dev.vars";
const SKIP = new Set(["OAUTH_REDIRECT_URL"]);

let content;
try {
  content = readFileSync(FILE, "utf8");
} catch {
  console.error(`シークレットファイルが見つかりません: ${FILE}`);
  console.error(".dev.vars.example をコピーして .dev.vars を作成してください。");
  process.exit(1);
}

const secrets = {};
for (const line of content.split("\n")) {
  if (/^\s*(#|$)/.test(line)) continue; // コメント・空行
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (!m) continue;
  const [, key, rawVal] = m;
  if (SKIP.has(key)) continue;
  secrets[key] = rawVal.replace(/^["']|["']$/g, ""); // 前後のクォートを除去
}

const keys = Object.keys(secrets);
if (keys.length === 0) {
  console.error("アップロードするシークレットがありません。");
  process.exit(1);
}

const passthrough = process.argv.slice(2); // 例: --env production
console.log(`アップロード: ${keys.join(", ")} ${passthrough.join(" ")}`.trim());

// wrangler secret bulk はファイル未指定時に stdin から JSON を読む。
const child = spawn("wrangler", ["secret", "bulk", ...passthrough], {
  stdio: ["pipe", "inherit", "inherit"],
  shell: true,
});
child.stdin.write(JSON.stringify(secrets));
child.stdin.end();
child.on("exit", (code) => process.exit(code ?? 0));
