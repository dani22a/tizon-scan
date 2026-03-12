"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Leaf, LogOut, Menu } from "@/components/ui-icons";
import Sidebar from "@/components/Sidebar";

export default function LlmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    setIsCheckingAuth(false);
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-brand-50 to-brand-100 text-slate-600">
        Verificando sesión...
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="h-screen app-shell font-sans text-slate-900 selection:bg-brand-200 flex flex-col overflow-hidden">
      <header className="sticky top-0 z-30 shrink-0 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="app-shell-header mx-auto max-w-full rounded-[28px] px-4 sm:px-6">
          <div className="h-20 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <button
                className="lg:hidden p-2 rounded-full text-white/80 hover:bg-white/10"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <Menu size={20} />
              </button>
              <button
                className="flex items-center space-x-3 min-w-0"
                onClick={() => router.push("/llm/dashboard")}
              >
                <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/15 flex items-center justify-center text-white shadow-inner shadow-white/10">
                  <Leaf size={20} />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-brand-100/80">
                    Blue Suite
                  </p>
                  <span className="block font-semibold text-xl text-white tracking-tight truncate">
                    Tizon<span className="text-brand-200">Scan</span> AI
                  </span>
                </div>
              </button>
            </div>
            <div className="hidden md:flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-brand-100/85">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-300 shadow-[0_0_0_6px_rgba(125,211,252,0.12)]" />
              Motor Gemini activo
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors"
            >
              <LogOut size={16} className="text-brand-100" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden relative px-4 pb-4 pt-4 sm:px-6 lg:px-8">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 z-10 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto w-full rounded-[30px]">{children}</main>
      </div>
    </div>
  );
}
