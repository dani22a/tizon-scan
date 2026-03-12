"use client";

import Link from "next/link";
import { Camera, Rows3 } from "@/components/ui-icons";

export default function LlmDashboardPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <section className="rounded-3xl p-6 md:p-8 bg-linear-to-br from-slate-900 via-cyan-900 to-emerald-700 text-white shadow-xl">
        <p className="text-cyan-100 text-sm uppercase tracking-[0.18em] font-semibold">
          Tizon Scan
        </p>
        <h1 className="text-3xl md:text-4xl font-black mt-1">
          Análisis de videos con IA
        </h1>
        <p className="text-cyan-100 mt-3 max-w-2xl">
          Sube videos de cultivos de papa para diagnosticar Tizón Tardío de forma
          masiva. Vincula cada análisis a una campaña para llevar el historial.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/llm"
            className="rounded-xl border border-slate-200 bg-linear-to-br from-emerald-50 to-cyan-50 p-6 hover:shadow-md transition-shadow flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Camera size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Análisis por Video</p>
              <p className="text-sm text-slate-500 mt-1">
                Sube un video y obtén el diagnóstico con IA
              </p>
            </div>
          </Link>
          <Link
            href="/llm/videos-history"
            className="rounded-xl border border-slate-200 bg-linear-to-br from-sky-50 to-cyan-50 p-6 hover:shadow-md transition-shadow flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
              <Rows3 size={24} className="text-sky-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Historial de Videos</p>
              <p className="text-sm text-slate-500 mt-1">
                Consulta análisis vinculados a campañas
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
