# Security Notes — obs-text

## Known unresolved vulnerabilities

### undici (high severity) — RESOLVED

| Field | Detail |
|-------|--------|
| Package | `undici` |
| Severity | High (resolved) |
| Source | Transitive dependency via `@firebase/auth`, `@firebase/firestore`, `@firebase/functions`, `@firebase/storage` |
| Status | **resolved** — firebase ^10.7.0 → ^12.14.0 bump により high 解消 (2026-06-08, commit `a00b7a2`) |
| Rationale | Firebase v12 系列が最新 undici を取り込み、transitive high が消滅した。build pass (vite 655ms)、残存は moderate 2 件のみ。 |
| Review date | 2026-06-08 |

### esbuild (moderate severity)

| Field | Detail |
|-------|--------|
| Package | `esbuild` |
| Severity | Moderate |
| Source | Transitive dependency via `vite` v6 |
| Status | **fix-planned** — requires vite v6→v7 major bump |
| Rationale | dev 依存のみ (ビルドツール)。本番バンドルには含まれず、エンドユーザへの影響なし。vite v7 への major bump はビルド設定変更を伴う可能性があるため、別タスクで対応する。 |
| Review date | 2026-06-08 |

---

次回レビュー推奨: 2026-09-08 (または vite v7 リリース時)
