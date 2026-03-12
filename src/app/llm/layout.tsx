"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Leaf, Menu } from "@/components/ui-icons";
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
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-green-50 to-emerald-50 text-gray-600">
        Verificando sesión...
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-emerald-200 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm shrink-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              className="lg:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu size={20} />
            </button>
            <button
              className="flex items-center space-x-2"
              onClick={() => router.push("/llm/dashboard")}
            >
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                <Leaf size={20} />
              </div>
              <span className="font-bold text-xl text-slate-800 tracking-tight">
                Tizon<span className="text-emerald-600">Scan</span>
              </span>
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded-md"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
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

        <main className="flex-1 overflow-y-auto w-full">{children}</main>
      </div>
    </div>
  );
}
