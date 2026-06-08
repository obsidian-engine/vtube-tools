# Security Notes — obs-text

## Known unresolved vulnerabilities

### undici (high severity)

| Field | Detail |
|-------|--------|
| Package | `undici` |
| Severity | High |
| Source | Transitive dependency via `@firebase/auth`, `@firebase/firestore`, `@firebase/functions`, `@firebase/storage` |
| Status | **accepted** — fix planned (separate task) |
| Rationale | Firebase v10 系列が古い undici バージョンを transitive pin している。Firebase v11 への major bump は breaking change リスクがあるため、別タスクで対応予定。直接依存ではなく本番コードへの影響経路は Firebase SDK 内部に限定される。 |
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

次回レビュー推奨: 2026-09-08 (または Firebase v11 / vite v7 リリース時)
