"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getPeriodos, getVideosByPeriodo } from "@/service/evaluation";
import type { Periodo } from "@/types/evaluation";
import { aggregateVideosByCampaign, formatCampaignDateRange } from "../utils";
import type { CampaignAggregatedData } from "../types";
import {
  ComparacionEnfermedadChart,
  SeveridadPorCampanaChart,
  EvolucionTemporalChart,
  DistribucionNivelAlertaChart,
} from "./CampaignsCharts";

export default function CampaignsVisualization() {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [aggregated, setAggregated] = useState<CampaignAggregatedData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getPeriodos();
        const list = res.data ?? [];
        setPeriodos(list);

        const videosByPeriodo = new Map<number, Awaited<ReturnType<typeof getVideosByPeriodo>>["data"]>();
        for (const p of list) {
          try {
            const vRes = await getVideosByPeriodo(p.id);
            const videos = vRes.data ?? [];
            if (videos.length > 0) {
              videosByPeriodo.set(p.id, videos);
            }
          } catch {
            // Ignorar periodos sin videos
          }
        }

        const data = aggregateVideosByCampaign(list, videosByPeriodo);
        setAggregated(data);
      } catch {
        toast.error("No se pudieron cargar las campañas");
        setAggregated([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-slate-500">Cargando historial de campañas...</p>
        </div>
      </div>
    );
  }

  if (aggregated.length === 0) {
    return (
      <div className="app-shell-panel rounded-[28px] p-12 text-center">
        <p className="text-sm text-slate-500">
          No hay campañas con análisis de videos.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Vincula análisis a campañas en Análisis por Video para ver comparaciones,
          patrones de propagación y proyecciones.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen por campaña */}
      <div className="app-shell-panel overflow-hidden rounded-[28px]">
        <div className="rounded-[22px] bg-linear-to-r from-brand-950 via-brand-900 to-brand-700 px-5 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-brand-100/75">
            Base histórica por campaña
          </p>
          <h2 className="mt-2 text-lg font-semibold sm:text-xl">
            Comparación de evaluaciones y patrones de propagación
          </h2>
          <p className="mt-2 text-sm leading-6 text-brand-100/85">
            Historial estructurado para comparar evaluaciones previas, identificar
            patrones y proyectar el comportamiento de la enfermedad en campañas futuras.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4">
          {aggregated.map((c, i) => (
            <div
              key={c.periodoId}
              className="rounded-2xl border border-slate-100 bg-white/70 p-4"
            >
              <p className="truncate text-sm font-semibold text-slate-800">
                {c.nombre}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {formatCampaignDateRange(c.fechaInicio, c.fechaFin)}
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-brand-700">
                  {c.totalAnalisis}
                </span>
                <span className="text-xs text-slate-500">análisis</span>
              </div>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="rounded-full bg-brand-100 px-2 py-0.5 font-medium text-brand-700">
                  {c.porcentajeSanas.toFixed(1)}% sanas
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                  {c.porcentajeEnfermas.toFixed(1)}% Tizón
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico comparativo % enfermas / sanas */}
      <div className="app-shell-panel overflow-hidden rounded-[28px] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
          Comparación entre campañas
        </p>
        <h3 className="mt-2 text-base font-semibold text-slate-800">
          Porcentaje de hojas sanas vs. con Tizón Tardío
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Permite al LLM comparar evaluaciones previas y detectar tendencias.
        </p>
        <div className="mt-4">
          <ComparacionEnfermedadChart data={aggregated} />
        </div>
      </div>

      {/* Severidad por campaña */}
      <div className="app-shell-panel overflow-hidden rounded-[28px] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
          Patrones de severidad
        </p>
        <h3 className="mt-2 text-base font-semibold text-slate-800">
          Desglose por severidad (leve, moderado, severo) por campaña
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Identificación de patrones de propagación según escala Horsfall-Barratt.
        </p>
        <div className="mt-4">
          <SeveridadPorCampanaChart data={aggregated} />
        </div>
      </div>

      {/* Evolución temporal */}
      {aggregated.some((c) => c.analisisPorFecha.length > 1) && (
        <div className="app-shell-panel overflow-hidden rounded-[28px] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
            Evolución temporal
          </p>
          <h3 className="mt-2 text-base font-semibold text-slate-800">
            Progresión del % de enfermedad a lo largo de la campaña
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Proyección del comportamiento de la enfermedad en el tiempo.
          </p>
          <div className="mt-4">
            <EvolucionTemporalChart data={aggregated} />
          </div>
        </div>
      )}

      {/* Distribución nivel de alerta */}
      <div className="app-shell-panel overflow-hidden rounded-[28px] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
          Resumen de alertas
        </p>
        <h3 className="mt-2 text-base font-semibold text-slate-800">
          Distribución de niveles de alerta (bajo, moderado, alto, crítico)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Visión agregada para priorizar campañas con mayor riesgo.
        </p>
        <div className="mt-4 flex justify-center">
          <div className="w-full max-w-[340px]">
            <DistribucionNivelAlertaChart data={aggregated} />
          </div>
        </div>
      </div>
    </div>
  );
}
