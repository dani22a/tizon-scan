// ── Resultado individual de un modelo ────────────────────────────
export interface ModelResult {
  modelo: string;
  clase_predicha: string;
  confianza: number;
  todas_predicciones: { [key: string]: number };
  metricas_entrenamiento: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
}

// ── Resumen comparativo entre modelos ───────────────────────────
export interface ComparativeSummary {
  consenso: boolean;
  clase_consenso: string | null;
  modelo_mas_confiado: string;
  confianza_maxima: number;
}

// ── Respuesta multi-modelo del /evaluation/evaluate ─────────────
export interface MultiModelEvaluationResult {
  mejor_modelo_global: string;
  resultados: { [modelName: string]: ModelResult };
  resumen_comparativo: ComparativeSummary;
}

export interface MultiModelEvaluationData {
  clasificacion: MultiModelEvaluationResult;
  prediccion: PrediccionRecord;
}

export interface MultiModelEvaluationResponse {
  data: MultiModelEvaluationData;
  message: string;
  status: "success" | "error";
}

// ── Roboflow ────────────────────────────────────────────────────
export interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id: number | null;
  detection_id: string | null;
}

export interface RoboflowDetection {
  source: "file" | "url";
  model_id: string;
  predictions: RoboflowPrediction[];
  has_matches: boolean;
}

export interface Fase1Resumen {
  has_matches: boolean;
  total_detecciones: number;
  clases_detectadas: string[];
}

export interface Fase2Resumen {
  modelo: string;
  clase_predicha: string;
  confianza: number;
}

export interface PrediccionRecord {
  id: number;
  surco_id: number | null;
  usuario_id: number;
  periodo_id: number | null;
  imagen_url: string;
  fase1_resumen: Fase1Resumen | null;
  fase1_payload: RoboflowDetection | null;
  fase2_resumen: Fase2Resumen | null;
  fase2_payload: MultiModelEvaluationResult | null;
  fecha: string;
  created_at: string;
  updated_at: string;
}

export interface PredictionHistoryResponse {
  data: PrediccionRecord[];
  status: "success" | "error";
  message: string;
}

export interface RoboflowEvaluationResponse {
  data: RoboflowDetection;
  message: string;
  status: "success" | "error";
}

export interface Surco {
  id: number;
  numero: number;
  descripcion: string | null;
  lote_id: number;
  lote_identificador: string;
  modulo_id: number;
  modulo_nombre: string;
}

export interface SurcosResponse {
  data: Surco[];
  message: string;
  status: "success" | "error";
}

// ── Diagnóstico agregado / recomendaciones ────────────────────────

export interface DiagnosisReportSummary {
  id: number;
  fecha: string;
  indice_severidad: number;
  tendencia: string;
  clase_reciente: string | null;
}

export interface DiagnosisRecommendationRecord {
  id: number;
  titulo: string | null;
  contenido: string;
  severidad: string | null;
  etiquetas: string[] | null;
  fecha: string;
  created_at: string;
  updated_at: string;
  report?: DiagnosisReportSummary;
}

export interface DiagnosisRecommendationsResponse {
  data: DiagnosisRecommendationRecord[];
  status: "success" | "error";
  message: string;
}

export interface Periodo {
  id: number;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  usuario_id: number;
  created_at: string | null;
  updated_at: string | null;
}

// ── Recomendaciones de Periodo ────────────────────────────────────

export interface DiseaseDistributionEntry {
  count: number;
  pct: number;
  avgConf: number;
  avgDets: number;
  totalBlight: number;
  consensusCount: number;
  primera_deteccion: string | null;
  ultima_deteccion: string | null;
}

/** Snapshot de métricas guardado junto con el diagnóstico del periodo. */
export interface PeriodoReportSummary {
  id: number;
  periodo_id: number;
  fecha_reporte: string;
  total_predicciones: number;
  con_enfermedad: number;
  saludables: number;
  confianza_promedio: number;
  total_detecciones: number;
  promedio_detecciones_por_imagen: number;
  tasa_consenso: number;
  dias_activos: number;
  frecuencia_monitoreo: number;
  indice_severidad: number;
  tendencia: string;
  enfermedad_predominante: string | null;
  surcos_monitoreados: number[] | null;
  distribucion_enfermedades: Record<string, DiseaseDistributionEntry> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PeriodoRecommendationRecord {
  id: number;
  periodo_id: number;
  report_id: number;
  categoria: string;
  prioridad: string;
  titulo: string;
  contenido: string;
  etiquetas: string[] | null;
  fecha_creacion: string;
  created_at: string | null;
  updated_at: string | null;
  /** Incluido sólo cuando se consulta la recomendación de forma individual */
  report?: PeriodoReportSummary;
}

export interface PeriodoReportRecord extends PeriodoReportSummary {
  recomendaciones: PeriodoRecommendationRecord[];
}

export interface PeriodoReportsResponse {
  data: PeriodoReportRecord[];
  status: "success" | "error";
  message: string;
}

export interface CreatePeriodoDiagnosisPayload {
  total_predicciones: number;
  con_enfermedad: number;
  saludables: number;
  confianza_promedio: number;
  total_detecciones: number;
  promedio_detecciones_por_imagen: number;
  tasa_consenso: number;
  dias_activos: number;
  frecuencia_monitoreo: number;
  indice_severidad: number;
  tendencia: string;
  enfermedad_predominante: string | null;
  surcos_monitoreados: number[];
  distribucion_enfermedades: Record<string, DiseaseDistributionEntry>;
  recomendaciones: {
    categoria: string;
    prioridad: string;
    titulo: string;
    contenido: string;
    etiquetas: string[] | null;
  }[];
}

// ── Recomendaciones por predicción individual ────────────────────

export interface PrediccionMetricasSnapshot {
  fase1_resumen: {
    has_matches: boolean;
    total_detecciones: number;
    clases_detectadas: string[];
  } | null;
  fase2_resumen: {
    modelo?: string | null;
    clase_predicha: string | null;
    confianza: number | null;
  } | null;
  surco_id: number | null;
  surco_numero: number | null;
  lote_identificador: string | null;
  modulo_nombre: string | null;
}

export interface PrediccionRecommendationRecord {
  id: number;
  prediccion_id: number;
  usuario_id: number;
  categoria: string;
  prioridad: string;
  titulo: string;
  contenido: string;
  etiquetas: string[] | null;
  metricas_snapshot: PrediccionMetricasSnapshot | null;
  fecha_creacion: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreatePrediccionRecommendationPayload {
  categoria: string;
  prioridad: string;
  titulo: string;
  contenido: string;
  etiquetas: string[] | null;
  metricas_snapshot: PrediccionMetricasSnapshot | null;
}

export interface PrediccionRecommendationsResponse {
  data: PrediccionRecommendationRecord[];
  status: "success" | "error";
  message: string;
}

// ── Historial de análisis de videos ────────────────────────────────────

export interface VideoAnalisisRecord {
  id: number;
  usuario_id: number;
  periodo_id: number | null;
  periodo_nombre?: string;
  nombre_archivo: string | null;
  video_url: string | null;
  analysis_payload: Record<string, unknown>;
  fecha: string;
  created_at: string;
  updated_at: string;
}

export interface VideoHistoryResponse {
  data: VideoAnalisisRecord[];
  status: "success" | "error";
  message: string;
}

export interface SaveVideoAnalisisPayload {
  periodo_id: number | null;
  nombre_archivo?: string | null;
  video_url?: string | null;
  analysis_payload: Record<string, unknown>;
}
