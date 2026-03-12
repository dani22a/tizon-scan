export interface ApiResponse<T> {
  data: T;
  status: "success" | "error";
  message: string;
}

export interface Modulo {
  id: number;
  nombre: string;
  descripcion: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Lote {
  id: number;
  modulo_id: number;
  identificador: string;
  descripcion: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Surco {
  id: number;
  lote_id: number;
  numero: number;
  descripcion: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Prediccion {
  id: number;
  surco_id: number;
  usuario_id: number;
  imagen_url: string;
  fase1_resumen: {
    has_matches: boolean;
    total_detecciones: number;
    clases_detectadas: string[];
  } | null;
  fase1_payload: Record<string, unknown> | null;
  fase2_resumen: {
    modelo?: string | null;
    clase_predicha: string | null;
    confianza: number;
  } | null;
  fase2_payload: Record<string, unknown> | null;
  fecha: string;
  created_at: string | null;
  updated_at: string | null;
}

// ── Tipos compartidos para diagnósticos espaciales ────────────────

export interface SpatialDiagnosisRecommendation {
  categoria: string;
  prioridad: string;
  titulo: string;
  contenido: string;
  etiquetas: string[] | null;
}

export interface SpatialDiagnosisBasePayload {
  total_predicciones: number;
  con_enfermedad: number;
  saludables: number;
  confianza_promedio: number;
  total_detecciones: number;
  promedio_detecciones_por_imagen: number;
  tasa_consenso: number;
  indice_severidad: number;
  tendencia: string;
  enfermedad_predominante: string | null;
  distribucion_enfermedades: Record<string, unknown> | null;
  recomendaciones: SpatialDiagnosisRecommendation[];
}

// ── Surco ─────────────────────────────────────────────────────────

export interface SurcoReportRecord {
  id: number;
  surco_id: number;
  usuario_id: number;
  total_predicciones: number;
  con_enfermedad: number;
  saludables: number;
  confianza_promedio: number;
  total_detecciones: number;
  promedio_detecciones_por_imagen: number;
  tasa_consenso: number;
  indice_severidad: number;
  tendencia: string;
  enfermedad_predominante: string | null;
  distribucion_enfermedades: Record<string, unknown> | null;
  recomendaciones: SurcoRecommendationRecord[];
  fecha_reporte: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface SurcoRecommendationRecord {
  id: number;
  surco_id: number;
  report_id: number;
  categoria: string;
  prioridad: string;
  titulo: string;
  contenido: string;
  etiquetas: string[] | null;
  fecha_creacion: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateSurcoDiagnosisPayload extends SpatialDiagnosisBasePayload {}

// ── Lote ──────────────────────────────────────────────────────────

export interface LoteReportRecord {
  id: number;
  lote_id: number;
  usuario_id: number;
  total_predicciones: number;
  con_enfermedad: number;
  saludables: number;
  confianza_promedio: number;
  total_detecciones: number;
  promedio_detecciones_por_imagen: number;
  tasa_consenso: number;
  indice_severidad: number;
  tendencia: string;
  enfermedad_predominante: string | null;
  surcos_monitoreados: number[] | null;
  distribucion_enfermedades: Record<string, unknown> | null;
  recomendaciones: LoteRecommendationRecord[];
  fecha_reporte: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface LoteRecommendationRecord {
  id: number;
  lote_id: number;
  report_id: number;
  categoria: string;
  prioridad: string;
  titulo: string;
  contenido: string;
  etiquetas: string[] | null;
  fecha_creacion: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateLoteDiagnosisPayload extends SpatialDiagnosisBasePayload {
  surcos_monitoreados: number[];
}

// ── Módulo ────────────────────────────────────────────────────────

export interface ModuloReportRecord {
  id: number;
  modulo_id: number;
  usuario_id: number;
  total_predicciones: number;
  con_enfermedad: number;
  saludables: number;
  confianza_promedio: number;
  total_detecciones: number;
  promedio_detecciones_por_imagen: number;
  tasa_consenso: number;
  indice_severidad: number;
  tendencia: string;
  enfermedad_predominante: string | null;
  lotes_monitoreados: number[] | null;
  surcos_monitoreados: number[] | null;
  distribucion_enfermedades: Record<string, unknown> | null;
  recomendaciones: ModuloRecommendationRecord[];
  fecha_reporte: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ModuloRecommendationRecord {
  id: number;
  modulo_id: number;
  report_id: number;
  categoria: string;
  prioridad: string;
  titulo: string;
  contenido: string;
  etiquetas: string[] | null;
  fecha_creacion: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateModuloDiagnosisPayload extends SpatialDiagnosisBasePayload {
  lotes_monitoreados: number[];
  surcos_monitoreados: number[];
}
