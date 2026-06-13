import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { parseTemplateCsv } from "../lib/csv";

export interface Template {
  id: string;
  name: string;
  title: string;
  description: string;
  privacy: "public" | "unlisted" | "private";
  thumbnailKey: string | null;
}

const PRIVACY_LABELS = { public: "公開", unlisted: "限定公開", private: "非公開" } as const;

const emptyForm = {
  name: "",
  title: "",
  description: "",
  privacy: "private" as Template["privacy"],
};

interface ImportResult {
  success: number;
  failures: { lineNumber: number; reason: string }[];
}

export default function Templates() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<typeof emptyForm & { id?: string }>(emptyForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [csvError, setCsvError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await apiFetch<Template[]>("/api/templates")) ?? [],
  });

  const save = useMutation({
    mutationFn: (data: typeof form) =>
      data.id
        ? apiFetch(`/api/templates/${data.id}`, { method: "PUT", json: data })
        : apiFetch("/api/templates", { method: "POST", json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setForm(emptyForm);
      setErrorMessage(null);
    },
    onError: (e: Error) => setErrorMessage(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
    onError: (e: Error) => setErrorMessage(e.message),
  });

  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-neutral-400 focus:outline-none";

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    setImportResult(null);
    setIsImporting(true);

    try {
      const text = await file.text();
      const { headerError, rows } = parseTemplateCsv(text);

      if (headerError) {
        setCsvError(headerError);
        return;
      }

      if (rows.length === 0) {
        setCsvError("有効な行がありません");
        return;
      }

      const failures: ImportResult["failures"] = [];
      // parse失敗行を先に収集
      for (const row of rows) {
        if (!row.ok) {
          failures.push({ lineNumber: row.lineNumber, reason: row.error ?? "不明なエラー" });
        }
      }

      // 有効行を順次POST
      let success = 0;
      for (const row of rows) {
        if (!row.ok || !row.value) continue;
        try {
          await apiFetch("/api/templates", { method: "POST", json: row.value });
          success++;
        } catch (err) {
          failures.push({
            lineNumber: row.lineNumber,
            reason: err instanceof Error ? err.message : "POSTに失敗しました",
          });
        }
      }

      if (success > 0) {
        await queryClient.invalidateQueries({ queryKey: ["templates"] });
      }

      setImportResult({ success, failures });
    } catch {
      setCsvError("ファイルの読み込みに失敗しました");
    } finally {
      setIsImporting(false);
      // 同じファイルを再度選択できるようにリセット
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {form.id ? "テンプレートを編集" : "テンプレートを作成"}
        </h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
        >
          <input
            className={inputClass}
            placeholder="テンプレート名（例: 毎週の定期配信）"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder="配信タイトル"
            value={form.title}
            required
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className={`${inputClass} min-h-28`}
            placeholder="概要欄"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className={inputClass}
            value={form.privacy}
            onChange={(e) => setForm({ ...form, privacy: e.target.value as typeof form.privacy })}
          >
            <option value="private">非公開</option>
            <option value="unlisted">限定公開</option>
            <option value="public">公開</option>
          </select>
          {errorMessage && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{errorMessage}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {form.id ? "更新" : "保存"}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="rounded-full px-6 py-2.5 text-sm text-neutral-500 hover:bg-neutral-100"
              >
                キャンセル
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">CSVから一括作成</h2>
        <p className="mt-2 text-xs text-neutral-400">
          1行目はヘッダー固定:{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5">
            name,title,description,privacy
          </code>
          。privacy は <code className="rounded bg-neutral-100 px-1 py-0.5">public</code> /{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5">unlisted</code> /{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5">private</code>（空欄は private）。
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          例:{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5">
            毎週の雑談,雑談配信,概要テキスト,public
          </code>
        </p>
        <div className="mt-3">
          <label
            className={`inline-block cursor-pointer rounded-full border border-neutral-300 px-6 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 ${isImporting ? "pointer-events-none opacity-40" : ""}`}
          >
            {isImporting ? "インポート中…" : "CSVファイルを選択"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCsvImport}
              disabled={isImporting}
            />
          </label>
        </div>
        {csvError && (
          <p className="mt-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{csvError}</p>
        )}
        {importResult && (
          <div className="mt-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm">
            <p className="font-medium">
              {importResult.success}件成功 / {importResult.failures.length}件失敗
            </p>
            {importResult.failures.length > 0 && (
              <ul className="mt-2 space-y-1 text-red-600">
                {importResult.failures.map((f) => (
                  <li key={f.lineNumber}>
                    {f.lineNumber}行目: {f.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">保存済みテンプレート</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-neutral-400">読み込み中…</p>
        ) : templates.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-400">まだテンプレートがありません。</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(templates ?? []).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="truncate text-sm text-neutral-500">{t.title}</p>
                  <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500">
                    {PRIVACY_LABELS[t.privacy]}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() =>
                      setForm({
                        id: t.id,
                        name: t.name,
                        title: t.title,
                        description: t.description,
                        privacy: t.privacy,
                      })
                    }
                    className="rounded-full px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => remove.mutate(t.id)}
                    className="rounded-full px-4 py-1.5 text-sm text-red-500 hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
