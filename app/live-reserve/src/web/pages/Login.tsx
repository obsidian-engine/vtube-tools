export default function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">LiveReserve</h1>
        <p className="mt-3 text-neutral-500">配信予約、もうStudioを開かない。</p>
      </div>
      <a
        href="/api/auth/login"
        className="rounded-full bg-neutral-900 px-8 py-3 text-white transition-opacity hover:opacity-80"
      >
        Googleでログイン
      </a>
      <p className="max-w-sm text-center text-xs leading-relaxed text-neutral-400">
        YouTube アカウントでログインすると、配信予約の作成を LiveReserve に許可します。
      </p>
    </div>
  );
}
