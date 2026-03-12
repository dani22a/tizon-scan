"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPeriodos, getPredictionHistory } from "@/service/evaluation";
import { Periodo, PrediccionRecord } from "@/types/evaluation";

type ClassMap = Record<string, number>;

type PeriodSummary = {
  id: number;
  name: string;
  total: number;
};

const DISEASE_LABELS: Record<string, string> = {
  Potato___Early_blight: "Tizon temprano",
  Potato___Late_blight: "Tizon tardio",
  Potato___healthy: "Saludable",
  "Sin clasificar": "Sin clasificar",
};

const DISEASE_COLORS: Record<string, string> = {
  Potato___Early_blight: "#f59e0b",
  Potato___Late_blight: "#dc2626",
  Potato___healthy: "#16a34a",
  "Sin clasificar": "#334155",
};

function diseaseName(key: string): string {
  return DISEASE_LABELS[key] ?? key;
}

function diseaseColor(key: string): string {
  return DISEASE_COLORS[key] ?? "#0ea5e9";
}

function normalizeClass(cls?: string | null): string {
  return cls ?? "Sin clasificar";
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function monthKey(date: string): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonth(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("es-PE", { month: "short", year: "2-digit" });
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<PrediccionRecord[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [historyResp, periodosResp] = await Promise.all([
          getPredictionHistory(),
          getPeriodos(),
        ]);
        setPredictions(historyResp.data || []);
        setPeriodos(periodosResp.data || []);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const totals = useMemo(() => {
    let withDetection = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;

    predictions.forEach((p) => {
      if (p.fase1_resumen?.has_matches) withDetection += 1;
      const conf = p.fase2_resumen?.confianza;
      if (typeof conf === "number") {
        confidenceSum += conf;
        confidenceCount += 1;
      }
    });

    return {
      totalPredictions: predictions.length,
      withDetection,
      avgConfidence: confidenceCount > 0 ? confidenceSum / confidenceCount : 0,
    };
  }, [predictions]);

  const classDistribution = useMemo(() => {
    const map: ClassMap = {};
    predictions.forEach((p) => {
      const cls = normalizeClass(p.fase2_resumen?.clase_predicha);
      map[cls] = (map[cls] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [predictions]);

  const periodSummary = useMemo((): PeriodSummary[] => {
    const base = periodos.map((p) => ({ id: p.id, name: p.nombre, total: 0 }));
    const idxMap = new Map<number, number>();
    base.forEach((item, index) => idxMap.set(item.id, index));

    predictions.forEach((p) => {
      if (!p.periodo_id) return;
      const idx = idxMap.get(p.periodo_id);
      if (idx !== undefined) {
        base[idx].total += 1;
      }
    });

    return base.sort((a, b) => b.total - a.total).slice(0, 8);
  }, [periodos, predictions]);

  const monthlyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    predictions.forEach((p) => {
      const key = monthKey(p.fecha ?? p.created_at);
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8);
  }, [predictions]);

  const maxMonthly = useMemo(() => {
    let max = 1;
    monthlyTrend.forEach(([, value]) => {
      if (value > max) max = value;
    });
    return max;
  }, [monthlyTrend]);

  const donutArcs = useMemo(() => {
    const total = classDistribution.reduce((acc, [, value]) => acc + value, 0);
    if (total === 0)
      return [] as Array<{ key: string; start: number; end: number }>;

    let cursor = 0;
    return classDistribution.map(([key, value]) => {
      const start = cursor;
      const delta = (value / total) * 360;
      cursor += delta;
      return { key, start, end: cursor };
    });
  }, [classDistribution]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <section className="rounded-3xl p-6 md:p-8 bg-linear-to-br from-slate-900 via-cyan-900 to-emerald-700 text-white shadow-xl">
        <p className="text-cyan-100 text-sm uppercase tracking-[0.18em] font-semibold">
          Dashboard ejecutivo
        </p>
        <h1 className="text-3xl md:text-4xl font-black mt-1">
          Resumen inteligente de predicciones
        </h1>
        <p className="text-cyan-100 mt-3 max-w-3xl">
          Visualiza indicadores clave de periodos, enfermedades y actividad para
          tomar decisiones de manejo mas rapido.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-4">
            <p className="text-sm text-cyan-100">Predicciones totales</p>
            <p className="text-3xl font-black mt-1">
              {loading ? "..." : totals.totalPredictions}
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-4">
            <p className="text-sm text-cyan-100">Periodos activos</p>
            <p className="text-3xl font-black mt-1">
              {loading ? "..." : periodos.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-4">
            <p className="text-sm text-cyan-100">Confianza promedio</p>
            <p className="text-3xl font-black mt-1">
              {loading ? "..." : `${(totals.avgConfidence * 100).toFixed(1)}%`}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <article className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">
            Tendencia mensual
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Ultimos meses con mayor/menor actividad
          </p>

          <div className="h-64 mt-4">
            <svg
              viewBox="0 0 860 260"
              className="w-full h-full"
            >
              <rect
                x={0}
                y={0}
                width={860}
                height={260}
                rx={16}
                fill="#f8fafc"
              />
              {[0, 25, 50, 75, 100].map((tick) => (
                <g key={tick}>
                  <line
                    x1={52}
                    y1={220 - tick * 2}
                    x2={820}
                    y2={220 - tick * 2}
                    stroke="#e2e8f0"
                  />
                  <text
                    x={18}
                    y={224 - tick * 2}
                    fontSize={11}
                    fill="#64748b"
                  >
                    {Math.round((tick / 100) * maxMonthly)}
                  </text>
                </g>
              ))}

              <polyline
                points={monthlyTrend
                  .map(([, value], idx) => {
                    const x =
                      monthlyTrend.length > 1
                        ? 60 + (idx / (monthlyTrend.length - 1)) * 740
                        : 430;
                    const y = 220 - (value / Math.max(maxMonthly, 1)) * 200;
                    return `${x.toFixed(2)},${y.toFixed(2)}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#0284c7"
                strokeWidth={3.5}
                strokeLinecap="round"
              />

              {monthlyTrend.map(([month, value], idx) => {
                const x =
                  monthlyTrend.length > 1
                    ? 60 + (idx / (monthlyTrend.length - 1)) * 740
                    : 430;
                const y = 220 - (value / Math.max(maxMonthly, 1)) * 200;
                return (
                  <g key={month}>
                    <circle
                      cx={x}
                      cy={y}
                      r={4}
                      fill="#0284c7"
                    />
                    <text
                      x={x}
                      y={244}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#475569"
                    >
                      {formatMonth(month)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">
            Distribucion por clase
          </h2>
          <div className="mt-4 flex justify-center">
            <svg
              viewBox="0 0 240 240"
              className="w-56 h-56"
            >
              <circle
                cx={120}
                cy={120}
                r={80}
                fill="#f1f5f9"
              />
              {donutArcs.map((arc) => {
                const radius = 80;
                const start = (arc.start - 90) * (Math.PI / 180);
                const end = (arc.end - 90) * (Math.PI / 180);
                const x1 = 120 + radius * Math.cos(start);
                const y1 = 120 + radius * Math.sin(start);
                const x2 = 120 + radius * Math.cos(end);
                const y2 = 120 + radius * Math.sin(end);
                const largeArc = arc.end - arc.start > 180 ? 1 : 0;
                const path = `M 120 120 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                return (
                  <path
                    key={arc.key}
                    d={path}
                    fill={diseaseColor(arc.key)}
                    opacity={0.92}
                  />
                );
              })}
              <circle
                cx={120}
                cy={120}
                r={42}
                fill="white"
              />
              <text
                x={120}
                y={116}
                textAnchor="middle"
                className="fill-slate-900 text-xl font-black"
              >
                {totals.totalPredictions}
              </text>
              <text
                x={120}
                y={136}
                textAnchor="middle"
                className="fill-slate-500 text-xs"
              >
                total
              </text>
            </svg>
          </div>

          <div className="mt-3 space-y-2">
            {classDistribution.slice(0, 5).map(([key, value]) => {
              const percent =
                totals.totalPredictions > 0
                  ? (value / totals.totalPredictions) * 100
                  : 0;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: diseaseColor(key) }}
                    />
                    <span className="text-slate-700 font-medium">
                      {diseaseName(key)}
                    </span>
                  </span>
                  <span className="text-slate-500">
                    {value} ({percent.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">
            Periodos con mayor actividad
          </h2>
          <div className="mt-4 space-y-3">
            {periodSummary.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No hay actividad registrada aun.
              </p>
            ) : (
              periodSummary.map((item) => {
                const pct =
                  totals.totalPredictions > 0
                    ? (item.total / totals.totalPredictions) * 100
                    : 0;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <p className="font-semibold text-slate-800">
                        {item.name}
                      </p>
                      <p className="text-slate-500">{item.total} pred.</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${clampPercent(pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">Accesos rapidos</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/dashboard/modulos"
              className="rounded-xl border border-slate-200 bg-linear-to-br from-sky-50 to-cyan-50 p-4 hover:shadow-md transition-shadow"
            >
              <p className="font-bold text-slate-900">Modulos</p>
              <p className="text-sm text-slate-500 mt-1">
                Gestion de modulos, lotes y surcos
              </p>
            </Link>
            <Link
              href="/dashboard/periodos"
              className="rounded-xl border border-slate-200 bg-linear-to-br from-emerald-50 to-lime-50 p-4 hover:shadow-md transition-shadow"
            >
              <p className="font-bold text-slate-900">Periodos</p>
              <p className="text-sm text-slate-500 mt-1">
                Periodos y evolucion de predicciones
              </p>
            </Link>
            <Link
              href="/dashboard/realtime"
              className="rounded-xl border border-slate-200 bg-linear-to-br from-violet-50 to-fuchsia-50 p-4 hover:shadow-md transition-shadow"
            >
              <p className="font-bold text-slate-900">Tiempo real</p>
              <p className="text-sm text-slate-500 mt-1">
                Evaluar hojas en vivo
              </p>
            </Link>
            <Link
              href="/dashboard/history"
              className="rounded-xl border border-slate-200 bg-linear-to-br from-amber-50 to-orange-50 p-4 hover:shadow-md transition-shadow"
            >
              <p className="font-bold text-slate-900">Historial</p>
              <p className="text-sm text-slate-500 mt-1">
                Auditar cada prediccion registrada
              </p>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
