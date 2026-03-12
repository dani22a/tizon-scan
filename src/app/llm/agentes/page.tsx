"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getVideoHistory } from "@/service/evaluation";
import type { VideoAnalisisRecord } from "@/types/evaluation";
import type { AnalysisResult } from "@/app/llm/types/analysis";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface AgentStats {
  modelId: string;
  count: number;
  avgResponseTimeMs: number;
  avgAccuracy: number;
  avgPrecision: number;
  avgRecall: number;
  avgF1Score: number;
}

function aggregateByAgent(videos: VideoAnalisisRecord[]): AgentStats[] {
  const byModel = new Map<string, { count: number; totalTime: number; acc: number[]; prec: number[]; rec: number[]; f1: number[] }>();

  for (const v of videos) {
    const payload = v.analysis_payload as unknown as AnalysisResult & { metadata_llm?: { model_id: string; response_time_ms: number }; metricas_llm?: { accuracy: number; precision: number; recall: number; f1_score: number } };
    const meta = payload?.metadata_llm;
    const metricas = payload?.metricas_llm;

    if (!meta?.model_id) continue;

    const modelId = meta.model_id;
    let entry = byModel.get(modelId);
    if (!entry) {
      entry = { count: 0, totalTime: 0, acc: [], prec: [], rec: [], f1: [] };
      byModel.set(modelId, entry);
    }

    entry.count += 1;
    entry.totalTime += meta.response_time_ms ?? 0;
    if (metricas) {
      if (typeof metricas.accuracy === "number") entry.acc.push(metricas.accuracy);
      if (typeof metricas.precision === "number") entry.prec.push(metricas.precision);
      if (typeof metricas.recall === "number") entry.rec.push(metricas.recall);
      if (typeof metricas.f1_score === "number") entry.f1.push(metricas.f1_score);
    }
  }

  return Array.from(byModel.entries()).map(([modelId, e]) => ({
    modelId,
    count: e.count,
    avgResponseTimeMs: e.count > 0 ? Math.round(e.totalTime / e.count) : 0,
    avgAccuracy: e.acc.length > 0 ? e.acc.reduce((a, b) => a + b, 0) / e.acc.length : 0,
    avgPrecision: e.prec.length > 0 ? e.prec.reduce((a, b) => a + b, 0) / e.prec.length : 0,
    avgRecall: e.rec.length > 0 ? e.rec.reduce((a, b) => a + b, 0) / e.rec.length : 0,
    avgF1Score: e.f1.length > 0 ? e.f1.reduce((a, b) => a + b, 0) / e.f1.length : 0,
  }));
}

export default function AgentesPage() {
  const [stats, setStats] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVideoHistory()
      .then((res) => {
        const data = res.data ?? [];
        const aggregated = aggregateByAgent(data);
        setStats(aggregated);
      })
      .catch(() => {
        toast.error("No se pudo cargar el historial");
        setStats([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-slate-500">Cargando comparativa de agentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full llm-page-grid">
      <div className="mx-auto w-full max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-6">
        <section className="app-shell-panel overflow-hidden rounded-[32px] bg-linear-to-r from-brand-950 via-brand-900 to-brand-700 px-6 py-8 text-white md:px-8 md:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-100/80">
            Comparativa de agentes
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Métricas por modelo LLM
          </h1>
          <p className="mt-4 text-sm leading-7 text-brand-100/85 md:text-base">
            Compara Accuracy, Precision, Recall, F1-score y tiempo de respuesta entre los
            modelos Gemini utilizados en cada análisis.
          </p>
          <Link
            href="/llm"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Nuevo análisis
          </Link>
        </section>

        {stats.length === 0 ? (
          <div className="app-shell-panel rounded-[28px] p-12 text-center">
            <p className="text-slate-500">
              No hay análisis con metadata de agente. Los análisis nuevos guardarán
              modelo usado y tiempo de respuesta automáticamente.
            </p>
            <Link href="/llm" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
              Ir a Análisis por Video →
            </Link>
          </div>
        ) : (
          <>
            <div className="app-shell-panel overflow-hidden rounded-[28px] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                Resumen por modelo
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-3 text-left font-semibold text-slate-700">Modelo</th>
                      <th className="pb-3 text-right font-semibold text-slate-700">Consultas</th>
                      <th className="pb-3 text-right font-semibold text-slate-700">Tiempo (ms)</th>
                      <th className="pb-3 text-right font-semibold text-slate-700">Accuracy</th>
                      <th className="pb-3 text-right font-semibold text-slate-700">Precision</th>
                      <th className="pb-3 text-right font-semibold text-slate-700">Recall</th>
                      <th className="pb-3 text-right font-semibold text-slate-700">F1-score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => (
                      <tr key={s.modelId} className="border-b border-slate-100">
                        <td className="py-3 font-medium text-slate-800">{s.modelId}</td>
                        <td className="py-3 text-right text-slate-600">{s.count}</td>
                        <td className="py-3 text-right text-slate-600">{s.avgResponseTimeMs.toLocaleString()}</td>
                        <td className="py-3 text-right text-slate-600">{(s.avgAccuracy * 100).toFixed(2)}%</td>
                        <td className="py-3 text-right text-slate-600">{(s.avgPrecision * 100).toFixed(2)}%</td>
                        <td className="py-3 text-right text-slate-600">{(s.avgRecall * 100).toFixed(2)}%</td>
                        <td className="py-3 text-right text-slate-600">{(s.avgF1Score * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="app-shell-panel overflow-hidden rounded-[28px] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Métricas de confianza
                </p>
                <h3 className="mt-2 text-base font-semibold text-slate-800">
                  Accuracy, Precision, Recall, F1-score por modelo
                </h3>
                <div className="mt-4 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.map((s) => ({
                        modelo: s.modelId.length > 20 ? s.modelId.slice(0, 18) + "…" : s.modelId,
                        fullModelo: s.modelId,
                        Accuracy: Math.round(s.avgAccuracy * 10000) / 100,
                        Precision: Math.round(s.avgPrecision * 10000) / 100,
                        Recall: Math.round(s.avgRecall * 10000) / 100,
                        "F1-score": Math.round(s.avgF1Score * 10000) / 100,
                      }))}
                      margin={{ top: 12, right: 12, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                      <XAxis dataKey="modelo" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={50} interval={0} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v) => [v != null ? `${v}%` : "", ""]} />
                      <Legend />
                      <Bar dataKey="Accuracy" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Precision" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Recall" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="F1-score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="app-shell-panel overflow-hidden rounded-[28px] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  Tiempo de respuesta
                </p>
                <h3 className="mt-2 text-base font-semibold text-slate-800">
                  Tiempo promedio (ms) por modelo
                </h3>
                <div className="mt-4 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.map((s) => ({
                        modelo: s.modelId.length > 20 ? s.modelId.slice(0, 18) + "…" : s.modelId,
                        fullModelo: s.modelId,
                        "Tiempo (ms)": s.avgResponseTimeMs,
                      }))}
                      margin={{ top: 12, right: 12, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                      <XAxis dataKey="modelo" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={50} interval={0} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="Tiempo (ms)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
