/**
 * Tipos para la visualización de campañas y análisis histórico.
 * Permite comparar evaluaciones previas, identificar patrones y proyectar tendencias.
 */

import type { AnalysisResult } from "../types/analysis";

export interface CampaignAggregatedData {
  periodoId: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  totalAnalisis: number;
  totalHojas: number;
  totalSanas: number;
  totalEnfermas: number;
  porcentajeEnfermas: number;
  porcentajeSanas: number;
  leve: number;
  moderado: number;
  severo: number;
  nivelAlertaCounts: Record<string, number>;
  analisisPorFecha: { fecha: string; porcentajeEnfermas: number; totalHojas: number }[];
}

export interface VideoAnalisisWithPayload {
  id: number;
  periodo_id: number | null;
  periodo_nombre?: string;
  nombre_archivo: string | null;
  fecha: string;
  analysis_payload: AnalysisResult;
}
