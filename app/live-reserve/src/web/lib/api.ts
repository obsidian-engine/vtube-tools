export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

interface ApiFetchInit {
  method?: string;
  json?: unknown;
  body?: BodyInit;
  headers?: Record<string, string>;
}

export async function apiFetch<T = unknown>(path: string, init: ApiFetchInit = {}): Promise<T | null> {
  const headers: Record<string, string> = { ...init.headers };
  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }

  const res = await fetch(path, {
    method: init.method ?? "GET",
    headers,
    ...(body !== undefined ? { body } : {}),
    credentials: "same-origin",
  });

  if (res.status === 204) return null;

  if (!res.ok) {
    let message = `リクエストに失敗しました (HTTP ${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // JSONでないエラーはデフォルトメッセージ
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as T;
}
