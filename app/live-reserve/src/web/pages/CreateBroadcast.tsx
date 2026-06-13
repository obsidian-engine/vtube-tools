import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { Template } from "./Templates";

interface CreateResult {
  videoId: string;
  watchUrl: string;
  streamKey: string;
  ingestionAddress: string;
  thumbnailWarning?: string;
}

export default function CreateBroadcast() {
  const queryClient = useQueryClient();
  const [templateId, setTemplateId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [result, setResult] = useState<CreateResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await apiFetch<Template[]>("/api/templates")) ?? [],
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch<CreateResult>("/api/broadcasts", {
        method: "POST",
        json: { templateId, scheduledAt: new Date(scheduledAt).toISOString() },
      }),
    onSuccess: (data) => {
      setResult(data);
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
    },
    onError: (e: Error) => setErrorMessage(e.message),
  });

  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-neutral-400 focus:outline-none";

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold tracking-tight">配信予約を作成</h2>
        <p className="mt-1 text-sm text-neutral-500">テンプレートと日時を選ぶだけ。</p>
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <select
            className={inputClass}
            value={templateId}
            required
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="" disabled>
              テンプレートを選択
            </option>
            {(templates ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            className={inputClass}
            value={scheduledAt}
            required
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          {errorMessage && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{errorMessage}</p>
          )}
          <button
            type="submit"
            disabled={create.isPending || !templateId || !scheduledAt}
            className="w-full rounded-full bg-neutral-900 py-3 text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {create.isPending ? "作成中…" : "予約を作成"}
          </button>
        </form>
      </section>

      {result && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h3 className="font-medium">✅ 予約を作成しました</h3>
          {result.thumbnailWarning && (
            <p className="mt-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">
              {result.thumbnailWarning}
            </p>
          )}
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-neutral-400">配信URL</dt>
              <dd>
                <a
                  href={result.watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-blue-600 hover:underline"
                >
                  {result.watchUrl}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-neutral-400">OBS 配信サーバー</dt>
              <dd className="break-all font-mono text-xs">{result.ingestionAddress}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">ストリームキー</dt>
              <dd>
                <CopyableSecret value={result.streamKey} />
              </dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}

function CopyableSecret({ value }: { value: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex items-center gap-2">
      <code className="font-mono text-xs">{shown ? value : "•".repeat(12)}</code>
      <button
        type="button"
        onClick={() => setShown(!shown)}
        className="text-xs text-neutral-400 hover:text-neutral-700"
      >
        {shown ? "隠す" : "表示"}
      </button>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="text-xs text-neutral-400 hover:text-neutral-700"
      >
        {copied ? "コピーしました" : "コピー"}
      </button>
    </span>
  );
}
