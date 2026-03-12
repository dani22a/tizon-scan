"use client";

import { useEffect, useState } from "react";
import { getMetrics, getTrainHistory } from "@/service/metrics";
import { MetricsData, ModelMetrics } from "@/types/metrics";
import { toast } from "sonner";

const CLASS_LABELS: Record<string, string> = {
  "Potato___Early_blight": "Tizón Temprano",
  "Potato___Late_blight": "Tizón Tardío",
  "Potato___healthy": "Saludable",
};

const MODEL_LABELS: Record<string, { name: string; color: string; bg: string }> = {
  efficient: { name: "EfficientNet", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  resnet: { name: "ResNet", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  mobilevit: { name: "MobileViT", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
};

const DATASET_COLORS: Record<string, { bar: string; badge: string }> = {
  healthy: { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
  early_blight: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-800" },
  late_blight: { bar: "bg-red-500", badge: "bg-red-100 text-red-800" },
};

const DATASET_LABELS: Record<string, string> = {
  healthy: "Saludable",
  early_blight: "Tizón Temprano",
  late_blight: "Tizón Tardío",
};

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = (value * 100).toFixed(1);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ModelCard({
  modelKey,
  metrics,
  isBest,
}: {
  modelKey: string;
  metrics: ModelMetrics;
  isBest: boolean;
}) {
  const info = MODEL_LABELS[modelKey] ?? {
    name: modelKey,
    color: "text-slate-700",
    bg: "bg-slate-50 border-slate-200",
  };

  return (
    <div
      className={`relative rounded-xl border p-5 transition-shadow hover:shadow-md ${info.bg} ${isBest ? "ring-2 ring-emerald-400 ring-offset-2" : ""}`}
    >
      {isBest && (
        <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow">
          Mejor modelo
        </span>
      )}
      <h3 className={`text-lg font-bold ${info.color} mb-4`}>{info.name}</h3>
      <div className="space-y-3">
        <MetricBar label="Accuracy" value={metrics.accuracy} />
        <MetricBar label="Precision" value={metrics.precision} />
        <MetricBar label="Recall" value={metrics.recall} />
        <MetricBar label="F1-Score" value={metrics.f1_score} />
      </div>
    </div>
  );
}

export default function DatasetPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyUrl, setHistoryUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMetrics();
        setMetrics(res.data);

        const blobUrl = await getTrainHistory();
        setHistoryUrl(blobUrl);
      } catch {
        toast.error("No se pudieron cargar las métricas del dataset");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <p className="text-slate-500">No se encontraron datos de métricas.</p>
      </div>
    );
  }

  const totalSamples = Object.values(metrics.features_dataset).reduce(
    (a, b) => a + b,
    0,
  );
  const maxSamples = Math.max(...Object.values(metrics.features_dataset));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
          Resumen del Dataset y Modelos
        </h1>
        <p className="text-slate-500 mt-1">
          Información general del dataset de entrenamiento y rendimiento de los
          clasificadores.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Clases
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {metrics.class_names.length}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {metrics.class_names.map((c) => (
              <span
                key={c}
                className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
              >
                {CLASS_LABELS[c] ?? c}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total de imágenes
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {totalSamples.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-2">en el dataset</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tamaño de imagen
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {metrics.img_size} x {metrics.img_size}
          </p>
          <p className="text-xs text-slate-400 mt-2">píxeles (px)</p>
        </div>

        <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Mejor modelo
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {MODEL_LABELS[metrics.best_model]?.name ?? metrics.best_model}
          </p>
          <p className="text-xs text-emerald-500 mt-2">
            mayor rendimiento global
          </p>
        </div>
      </div>

      {/* Dataset distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-bold text-slate-800 text-lg mb-5">
          Distribución del Dataset
        </h2>
        <div className="space-y-4">
          {Object.entries(metrics.features_dataset).map(([key, count]) => {
            const pct = ((count / totalSamples) * 100).toFixed(1);
            const widthPct = ((count / maxSamples) * 100).toFixed(1);
            const colors = DATASET_COLORS[key] ?? {
              bar: "bg-slate-500",
              badge: "bg-slate-100 text-slate-800",
            };
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${colors.badge}`}
                    >
                      {DATASET_LABELS[key] ?? key}
                    </span>
                  </div>
                  <span className="text-sm tabular-nums text-slate-600 font-medium">
                    {count} imágenes ({pct}%)
                  </span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colors.bar} transition-all duration-700`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Model metrics cards */}
      <div>
        <h2 className="font-bold text-slate-800 text-lg mb-4">
          Rendimiento de Clasificadores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Object.entries(metrics.metrics_classifier).map(([key, m]) => (
            <ModelCard
              key={key}
              modelKey={key}
              metrics={m}
              isBest={key === metrics.best_model}
            />
          ))}
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="font-bold text-slate-800 text-lg">
            Tabla Comparativa
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Métricas de cada modelo lado a lado
          </p>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                <th className="text-left px-6 py-3 font-semibold text-slate-500 uppercase text-xs tracking-wider">
                  Modelo
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 uppercase text-xs tracking-wider">
                  Accuracy
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 uppercase text-xs tracking-wider">
                  Precision
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 uppercase text-xs tracking-wider">
                  Recall
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 uppercase text-xs tracking-wider">
                  F1-Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(metrics.metrics_classifier).map(([key, m]) => {
                const info = MODEL_LABELS[key];
                const best = key === metrics.best_model;
                return (
                  <tr
                    key={key}
                    className={best ? "bg-emerald-50/40" : "hover:bg-slate-50"}
                  >
                    <td className="px-6 py-3.5 font-medium text-slate-700 flex items-center gap-2">
                      {best && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                      {info?.name ?? key}
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-nums">
                      {(m.accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-nums">
                      {(m.precision * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-nums">
                      {(m.recall * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-nums">
                      {(m.f1_score * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Training history image */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-bold text-slate-800 text-lg mb-1">
          Historial de Entrenamiento
        </h2>
        <p className="text-slate-400 text-sm mb-5">
          Curvas de pérdida y accuracy durante el entrenamiento de los modelos
        </p>
        {historyUrl ? (
          <div className="relative rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={historyUrl}
              alt="Historial de entrenamiento"
              className="w-full h-auto"
              onLoad={() => setImgLoading(false)}
              onError={() => {
                setImgLoading(false);
                toast.error("No se pudo cargar la imagen de historial");
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm">
              Imagen de historial no disponible
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
