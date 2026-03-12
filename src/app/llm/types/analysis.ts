/**
 * Tipos para el resultado del análisis de video con Gemini.
 * Esquema esperado del JSON estructurado devuelto por el modelo.
 * Plataforma agrotecnológica para diagnóstico masivo de Tizón Tardío en hojas de papa.
 */

/** Nivel de severidad de una hoja enferma (Escala Horsfall-Barratt / % área foliar afectada) */
export type SeveridadHoja = "leve" | "moderado" | "severo";

/** Nivel de alerta general del cultivo según porcentaje de enfermedad */
export type NivelAlerta = "bajo" | "moderado" | "alto" | "critico";

export interface AnalisisGeneral {
  total_hojas: number;
  sanas: number;
  enfermas: number;
  /** Porcentaje de hojas sanas (0-100). Se calcula si no viene del modelo. */
  porcentaje_sanas?: number;
  /** Porcentaje de hojas con Tizón Tardío (0-100). Se calcula si no viene del modelo. */
  porcentaje_enfermas?: number;
}

/** Desglose de hojas enfermas por nivel de severidad */
export interface DesgloseSeveridad {
  /** Leve: manchas iniciales, menos del 25% de la hoja afectada */
  leve: number;
  /** Moderado: entre 25% y 60% de la hoja afectada */
  moderado: number;
  /** Severo: más del 60% de la hoja necrosada o destruida */
  severo: number;
}

export interface SegmentoAnalizado {
  tiempo_inicio: number;
  tiempo_fin: number;
  confianza_porcentaje: number;
  enfermedad_detectada: string;
}

export interface TimelineAnotacion {
  segundo: number;
  juicio_experto: string;
  recomendacion: string;
}

/** Métricas de confianza estimadas por el LLM (accuracy, precision, recall, f1_score) */
export interface MetricasLlm {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
}

/** Metadata del agente LLM usado (modelo, tiempo de respuesta) */
export interface MetadataLlm {
  model_id: string;
  response_time_ms: number;
}

export interface AnalysisResult {
  analisis_general: AnalisisGeneral;
  /** Desglose de hojas enfermas por severidad (leve, moderado, severo) */
  desglose_por_severidad?: DesgloseSeveridad;
  /** Nivel de alerta: bajo, moderado, alto, critico */
  nivel_alerta?: NivelAlerta;
  /** Recomendaciones fitosanitarias contextualizadas (tratamientos, fungicidas, medidas preventivas) */
  recomendaciones?: string[];
  segmentos_analizados: SegmentoAnalizado[];
  timeline_anotaciones: TimelineAnotacion[];
  /** Métricas de confianza estimadas por el LLM (0-1) */
  metricas_llm?: MetricasLlm;
  /** Metadata del agente (modelo, tiempo de respuesta) - añadido en backend */
  metadata_llm?: MetadataLlm;
}
