"use client";

import type { AnalysisResult } from "../types/analysis";

function formatSegundo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AnalysisResultPanelProps {
  analysis: AnalysisResult;
  /** Título del panel */
  title?: string;
  /** Clases adicionales para el contenedor */
  className?: string;
}

export default function AnalysisResultPanel({
  analysis,
  title = "Resultado del análisis",
  className = "",
}: AnalysisResultPanelProps) {
  return (
    <div
      className={`app-shell-panel max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto rounded-[26px] p-4 sm:p-5 xl:sticky xl:top-6 xl:self-start ${className}`}
    >
      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
        {title}
      </h3>

      {analysis.nivel_alerta && (
        <div
          className={`p-4 rounded-[24px] border text-center ${
            analysis.nivel_alerta === "critico"
              ? "bg-red-50 border-red-200"
              : analysis.nivel_alerta === "alto"
                ? "bg-orange-50 border-orange-200"
                : analysis.nivel_alerta === "moderado"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-brand-50 border-brand-200"
          }`}
        >
          <p
            className={`text-lg font-bold ${
              analysis.nivel_alerta === "critico"
                ? "text-red-700"
                : analysis.nivel_alerta === "alto"
                  ? "text-orange-700"
                  : analysis.nivel_alerta === "moderado"
                    ? "text-amber-700"
                    : "text-brand-700"
            }`}
          >
            Nivel de alerta: {analysis.nivel_alerta.toUpperCase()}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-2xl font-bold text-slate-800">
            {analysis.analisis_general.total_hojas}
          </p>
          <p className="text-xs text-slate-500">Total hojas</p>
        </div>
        <div className="p-3 rounded-2xl bg-brand-50 border border-brand-200 text-center">
          <p className="text-2xl font-bold text-brand-700">
            {analysis.analisis_general.sanas}
          </p>
          <p className="text-xs text-slate-500">
            Sanas ({analysis.analisis_general.porcentaje_sanas ?? "-"}%)
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
          <p className="text-2xl font-bold text-amber-700">
            {analysis.analisis_general.enfermas}
          </p>
          <p className="text-xs text-slate-500">
            Tizón Tardío ({analysis.analisis_general.porcentaje_enfermas ?? "-"}%)
          </p>
        </div>
      </div>

      {analysis.desglose_por_severidad &&
        (analysis.desglose_por_severidad.leve > 0 ||
          analysis.desglose_por_severidad.moderado > 0 ||
          analysis.desglose_por_severidad.severo > 0) && (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 mb-2">
              Desglose por severidad
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-2xl bg-yellow-50 border border-yellow-200 text-center">
                <span className="text-lg font-bold text-yellow-700">
                  {analysis.desglose_por_severidad.leve}
                </span>
                <p className="text-xs text-yellow-600">Leve (&lt;25%)</p>
              </div>
              <div className="p-2 rounded-2xl bg-orange-50 border border-orange-200 text-center">
                <span className="text-lg font-bold text-orange-700">
                  {analysis.desglose_por_severidad.moderado}
                </span>
                <p className="text-xs text-orange-600">Moderado (25-60%)</p>
              </div>
              <div className="p-2 rounded-2xl bg-red-50 border border-red-200 text-center">
                <span className="text-lg font-bold text-red-700">
                  {analysis.desglose_por_severidad.severo}
                </span>
                <p className="text-xs text-red-600">Severo (&gt;60%)</p>
              </div>
            </div>
          </div>
        )}

      {analysis.recomendaciones && analysis.recomendaciones.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 mb-2">
            Recomendaciones fitosanitarias
          </p>
          <ul className="space-y-2 list-decimal list-inside text-sm text-slate-700">
            {analysis.recomendaciones.map((rec, idx) => (
              <li key={idx} className="pl-1">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.segmentos_analizados &&
        analysis.segmentos_analizados.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 mb-2">
              Segmentos analizados
            </p>
            <div className="space-y-2">
              {analysis.segmentos_analizados.map((seg, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
                >
                  <span className="font-mono text-slate-600">
                    {formatSegundo(seg.tiempo_inicio)} –{" "}
                    {formatSegundo(seg.tiempo_fin)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      seg.enfermedad_detectada === "ninguna"
                        ? "bg-slate-200 text-slate-600"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {seg.enfermedad_detectada}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {seg.confianza_porcentaje <= 1
                      ? `${(seg.confianza_porcentaje * 100).toFixed(0)}%`
                      : `${seg.confianza_porcentaje}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      {(analysis.metadata_llm || analysis.metricas_llm) && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 mb-3">
            Agente y métricas
          </p>
          {analysis.metadata_llm && (
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-lg bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700">
                {analysis.metadata_llm.model_id}
              </span>
              <span className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                {analysis.metadata_llm.response_time_ms.toLocaleString()} ms
              </span>
            </div>
          )}
          {analysis.metricas_llm && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl bg-white border border-slate-100 p-2 text-center">
                <p className="text-sm font-bold text-slate-800">
                  {(analysis.metricas_llm.accuracy * 100).toFixed(1)}%
                </p>
                <p className="text-[10px] text-slate-500">Accuracy</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 p-2 text-center">
                <p className="text-sm font-bold text-slate-800">
                  {(analysis.metricas_llm.precision * 100).toFixed(1)}%
                </p>
                <p className="text-[10px] text-slate-500">Precision</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 p-2 text-center">
                <p className="text-sm font-bold text-slate-800">
                  {(analysis.metricas_llm.recall * 100).toFixed(1)}%
                </p>
                <p className="text-[10px] text-slate-500">Recall</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 p-2 text-center">
                <p className="text-sm font-bold text-slate-800">
                  {(analysis.metricas_llm.f1_score * 100).toFixed(1)}%
                </p>
                <p className="text-[10px] text-slate-500">F1-score</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
