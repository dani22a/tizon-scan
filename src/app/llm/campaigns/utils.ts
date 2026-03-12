/**
 * Utilidades para agregar datos de análisis por campaña.
 * Estructura la base histórica para comparación y proyección.
 */

import type { VideoAnalisisRecord } from "@/types/evaluation";
import type { AnalysisResult } from "../types/analysis";
import type { CampaignAggregatedData } from "./types";
import type { Periodo } from "@/types/evaluation";

export function aggregateVideosByCampaign(
  periodos: Periodo[],
  videosByPeriodo: Map<number, VideoAnalisisRecord[]>
): CampaignAggregatedData[] {
  return periodos
    .map((p) => {
      const videos = videosByPeriodo.get(p.id) ?? [];
      const analyses = videos
        .map((v) => ({
          video: v,
          analysis: v.analysis_payload as unknown as AnalysisResult | null,
        }))
        .filter(
          (x): x is { video: VideoAnalisisRecord; analysis: AnalysisResult } =>
            x.analysis != null && x.analysis.analisis_general != null
        );

      if (analyses.length === 0) return null;

      const totalHojas = analyses.reduce(
        (s, x) => s + (x.analysis.analisis_general?.total_hojas ?? 0),
        0
      );
      const totalSanas = analyses.reduce(
        (s, x) => s + (x.analysis.analisis_general?.sanas ?? 0),
        0
      );
      const totalEnfermas = analyses.reduce(
        (s, x) => s + (x.analysis.analisis_general?.enfermas ?? 0),
        0
      );
      const porcentajeEnfermas = totalHojas > 0 ? (totalEnfermas / totalHojas) * 100 : 0;
      const porcentajeSanas = totalHojas > 0 ? (totalSanas / totalHojas) * 100 : 0;

      let leve = 0;
      let moderado = 0;
      let severo = 0;
      const nivelAlertaCounts: Record<string, number> = {};

      const analisisPorFecha: { fecha: string; porcentajeEnfermas: number; totalHojas: number }[] =
        analyses.map(({ video, analysis }) => {
          const ag = analysis.analisis_general!;
          const pct = ag.total_hojas > 0 ? (ag.enfermas / ag.total_hojas) * 100 : 0;
          return {
            fecha: video.fecha ?? "",
            porcentajeEnfermas: pct,
            totalHojas: ag.total_hojas,
          };
        });

      for (const { analysis: a } of analyses) {
        if (a.desglose_por_severidad) {
          leve += a.desglose_por_severidad.leve ?? 0;
          moderado += a.desglose_por_severidad.moderado ?? 0;
          severo += a.desglose_por_severidad.severo ?? 0;
        }
        const nivel = a.nivel_alerta ?? "bajo";
        nivelAlertaCounts[nivel] = (nivelAlertaCounts[nivel] ?? 0) + 1;
      }

      analisisPorFecha.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

      return {
        periodoId: p.id,
        nombre: p.nombre,
        fechaInicio: p.fecha_inicio,
        fechaFin: p.fecha_fin,
        totalAnalisis: analyses.length,
        totalHojas,
        totalSanas,
        totalEnfermas,
        porcentajeEnfermas,
        porcentajeSanas,
        leve,
        moderado,
        severo,
        nivelAlertaCounts,
        analisisPorFecha,
      };
    })
    .filter((c): c is CampaignAggregatedData => c != null);
}

export function formatCampaignDateRange(inicio: string, fin: string): string {
  const d1 = new Date(inicio);
  const d2 = new Date(fin);
  return `${d1.toLocaleDateString("es-ES", { month: "short", year: "numeric" })} – ${d2.toLocaleDateString("es-ES", { month: "short", year: "numeric" })}`;
}
