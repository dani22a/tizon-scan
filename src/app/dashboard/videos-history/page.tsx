"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { getVideoHistory } from "@/service/evaluation";
import type { VideoAnalisisRecord } from "@/types/evaluation";
import type { AnalysisResult } from "@/app/llm/types/analysis";
import { resolveVideoUrl } from "@/lib/prediction-utils";
import VideoSelector from "@/app/llm/components/VideoSelector";
import VideoTimeline from "@/app/llm/components/VideoTimeline";
import AnalysisResultPanel from "@/app/llm/components/AnalysisResultPanel";

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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const selected = videos.find((v) => v.id === selectedId);
  const analysis = selected?.analysis_payload as unknown as AnalysisResult | null;
  const videoUrl = selected?.video_url ? resolveVideoUrl(selected.video_url) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1680px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Historial de videos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Análisis de videos con IA vinculados a campañas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/llm"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900"
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
          {selectedId && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Volver al listado
            </button>
          )}
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
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
      ) : selected && analysis ? (
        <div
          className={`grid items-start gap-5 xl:gap-6 ${
            videoUrl
              ? "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,390px)]"
              : "grid-cols-1"
          }`}
        >
          <div className="min-w-0 space-y-4">
            {videoUrl && (
              <>
                <div className="rounded-[26px] border border-slate-200 bg-white overflow-hidden">
                  <VideoSelector
                    selectedFile={null}
                    onFileChange={() => {}}
                    videoUrl={videoUrl}
                    videoRef={videoRef}
                  />
                </div>
                {analysis.timeline_anotaciones &&
                  analysis.timeline_anotaciones.length > 0 && (
                    <div className="rounded-[26px] border border-slate-200 bg-white p-4">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                        Timeline del video
                      </p>
                      <VideoTimeline
                        videoSrc={videoUrl}
                        videoRef={videoRef}
                        timelineAnotaciones={analysis.timeline_anotaciones}
                      />
                    </div>
                  )}
              </>
            )}
            {!videoUrl && (
              <div className="rounded-[26px] border border-slate-200 bg-white p-6 text-center text-slate-500">
                <p className="text-sm">
                  Video no disponible para este análisis.
                </p>
                <p className="text-xs mt-1">
                  {selected.nombre_archivo || `Video #${selected.id}`}
                </p>
              </div>
            )}
          </div>

          <AnalysisResultPanel
            analysis={analysis}
            title="Resultado del análisis"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((v) => {
            const a = v.analysis_payload as unknown as AnalysisResult & { metadata_llm?: { model_id: string; response_time_ms: number } } | null;
            const meta = a?.metadata_llm;

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                className="w-full rounded-xl border border-slate-200 bg-white overflow-hidden text-left hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
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
                    {a?.analisis_general && (
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${nivelAlertaClass(
                          a?.nivel_alerta
                        )}`}
                      >
                        {a?.nivel_alerta ?? "bajo"}
                      </span>
                    )}
                    {meta && (
                      <span className="hidden text-xs text-slate-500 sm:inline">
                        {meta.model_id} · {meta.response_time_ms.toLocaleString()} ms
                      </span>
                    )}
                    {a?.analisis_general && (
                      <span className="text-sm text-slate-600">
                        {a.analisis_general.total_hojas} hojas ·{" "}
                        {a.analisis_general.enfermas} con Tizón
                      </span>
                    )}
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-slate-400"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
