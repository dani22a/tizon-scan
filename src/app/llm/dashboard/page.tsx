"use client";

import Link from "next/link";
import { Camera, Rows3 } from "@/components/ui-icons";

export default function LlmDashboardPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 llm-page-grid">
      <section className="rounded-[32px] overflow-hidden shadow-[0_24px_60px_-35px_rgba(15,23,42,0.7)]">
        <div className="bg-linear-to-br from-brand-950 via-brand-900 to-brand-700 p-6 md:p-8 lg:p-10 text-white">
        <p className="text-brand-100 text-sm uppercase tracking-[0.24em] font-semibold">
          Vision Control
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold mt-2 tracking-tight">
          Análisis de videos con IA
        </h1>
        <p className="text-brand-100/85 mt-4 max-w-2xl leading-7">
          Sube videos de cultivos de papa para diagnosticar Tizón Tardío de forma
          masiva. Vincula cada análisis a una campaña para llevar el historial.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-brand-100/70">
              Flujo
            </p>
            <p className="mt-2 text-2xl font-semibold">01</p>
            <p className="mt-1 text-sm text-brand-100/80">Carga y análisis asistido</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-brand-100/70">
              Reporte
            </p>
            <p className="mt-2 text-2xl font-semibold">PDF</p>
            <p className="mt-1 text-sm text-brand-100/80">Resumen enviado por correo</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-brand-100/70">
              Historial
            </p>
            <p className="mt-2 text-2xl font-semibold">Live</p>
            <p className="mt-1 text-sm text-brand-100/80">Seguimiento por campaña</p>
          </div>
        </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/llm"
            className="app-shell-panel rounded-[28px] p-6 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-36px_rgba(37,99,235,0.65)] transition-all flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
              <Camera size={24} className="text-brand-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Análisis por Video</p>
              <p className="text-sm text-slate-500 mt-1 leading-6">
                Sube un video y obtén el diagnóstico con IA
              </p>
            </div>
          </Link>
          <Link
            href="/llm/videos-history"
            className="app-shell-panel rounded-[28px] p-6 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-36px_rgba(37,99,235,0.65)] transition-all flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
              <Rows3 size={24} className="text-brand-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Historial de Videos</p>
              <p className="text-sm text-slate-500 mt-1 leading-6">
                Consulta análisis vinculados a campañas
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
