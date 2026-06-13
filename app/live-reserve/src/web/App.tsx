import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "./lib/api";
import Login from "./pages/Login";
import Templates from "./pages/Templates";
import CreateBroadcast from "./pages/CreateBroadcast";
import BulkCreate from "./pages/BulkCreate";
import Broadcasts from "./pages/Broadcasts";

export interface Me {
  id: string;
  email: string;
  displayName: string | null;
}

export default function App() {
  const { data: me, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/api/me"),
    retry: false,
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-400">読み込み中…</div>;
  }

  const unauthorized = error instanceof ApiError && error.isUnauthorized;
  if (unauthorized || !me) {
    return <Login />;
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-1.5 text-sm transition-colors ${
      isActive ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
    }`;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <span className="text-lg font-semibold tracking-tight">LiveReserve</span>
          <nav className="flex gap-1">
            <NavLink to="/create" className={navClass}>予約作成</NavLink>
            <NavLink to="/bulk" className={navClass}>一括予約</NavLink>
            <NavLink to="/templates" className={navClass}>テンプレート</NavLink>
            <NavLink to="/broadcasts" className={navClass}>配信一覧</NavLink>
          </nav>
          <button
            onClick={async () => {
              await apiFetch("/api/auth/logout", { method: "POST" });
              location.reload();
            }}
            className="text-sm text-neutral-400 hover:text-neutral-700"
          >
            ログアウト
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Routes>
          <Route path="/" element={<Navigate to="/create" replace />} />
          <Route path="/create" element={<CreateBroadcast />} />
          <Route path="/bulk" element={<BulkCreate />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/broadcasts" element={<Broadcasts />} />
        </Routes>
      </main>
    </div>
  );
}
