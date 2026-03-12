"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { getVideoHistory } from "@/service/evaluation";
import type { VideoAnalisisRecord } from "@/types/evaluation";
import type { AnalysisResult } from "@/app/llm/types/analysis";

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nivelAlertaClass(nivel: string | undefined) {
  if (!nivel) return "bg-slate-100 text-slate-800";
  switch (nivel) {
    case "critico":
      return "bg-red-100 text-red-800";
    case "alto":
      return "bg-orange-100 text-orange-800";
    case "moderado":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-brand-100 text-brand-800";
  }
}

export default function VideosHistoryPage() {
  const [videos, setVideos] = useState<VideoAnalisisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    getVideoHistory()
      .then((res) => setVideos(res.data ?? []))
      .catch(() => {
        toast.error("No se pudo cargar el historial de videos");
        setVideos([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando historial de videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 llm-page-grid">
      <section className="app-shell-panel rounded-[30px] p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Historial de videos
            </h1>
            <p className="text-slate-500 text-sm mt-1 leading-6">
              Análisis de videos con IA vinculados a campañas
            </p>
          </div>
          <Link
            href="/llm"
            className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-200 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Nuevo análisis
          </Link>
        </div>
      </section>

      {videos.length === 0 ? (
        <div className="app-shell-panel rounded-[30px] p-12 text-center">
          <p className="text-slate-500 text-sm">
            No hay análisis de videos en el historial.
          </p>
          <p className="text-slate-400 text-xs mt-2">
            Sube un video en Análisis por Video y selecciona una campaña para
            guardarlo.
          </p>
          <Link
            href="/llm"
            className="inline-block mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Ir a Análisis por Video →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((v) => {
            const analysis = v.analysis_payload as unknown as AnalysisResult | null;
            const ag = analysis?.analisis_general;
            const isExpanded = expandedId === v.id;

            return (
              <div
                key={v.id}
                className="app-shell-panel rounded-[28px] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : v.id)
                  }
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-brand-50/70 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-brand-700"
                      >
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {v.nombre_archivo || `Video #${v.id}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(v.fecha)}
                        {v.periodo_nombre && (
                          <> · {v.periodo_nombre}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {ag && (
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${nivelAlertaClass(
                          analysis?.nivel_alerta
                        )}`}
                      >
                        {analysis?.nivel_alerta ?? "bajo"}
                      </span>
                    )}
                    {ag && (
                      <span className="text-sm text-slate-600">
                        {ag.total_hojas} hojas · {ag.enfermas} con Tizón
                      </span>
                    )}
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`text-slate-400 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {isExpanded && analysis && (
                  <div className="border-t border-brand-100/80 p-5 bg-brand-50/40 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-2xl bg-white border border-brand-100 text-center">
                        <p className="text-2xl font-bold text-slate-800">
                          {ag?.total_hojas ?? 0}
                        </p>
                        <p className="text-xs text-slate-500">Total hojas</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white border border-brand-100 text-center">
                        <p className="text-2xl font-bold text-brand-700">
                          {ag?.sanas ?? 0}
                        </p>
                        <p className="text-xs text-slate-500">Sanas</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white border border-amber-200 text-center">
                        <p className="text-2xl font-bold text-amber-700">
                          {ag?.enfermas ?? 0}
                        </p>
                        <p className="text-xs text-slate-500">Con Tizón</p>
                      </div>
                    </div>
                    {analysis.recomendaciones &&
                      analysis.recomendaciones.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Recomendaciones
                          </p>
                          <ul className="space-y-1 list-disc list-inside text-sm text-slate-700">
                            {analysis.recomendaciones.slice(0, 5).map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
