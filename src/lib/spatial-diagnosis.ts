import { Prediccion, SpatialDiagnosisRecommendation } from "@/types/hierarchy";

export interface SpatialDiseaseStats {
  count: number;
  pct: number;
  avgConf: number;
  avgDets: number;
  totalBlight: number;
  consensusCount: number;
  primera_deteccion: string | null;
  ultima_deteccion: string | null;
}

export interface SpatialAnalysis {
  total_predicciones: number;
  con_enfermedad: number;
  saludables: number;
  confianza_promedio: number;
  total_detecciones: number;
  promedio_detecciones_por_imagen: number;
  tasa_consenso: number;
  indice_severidad: number;
  tendencia: "mejorando" | "empeorando" | "estable" | "insuficiente_datos";
  enfermedad_predominante: string | null;
  distribucion_enfermedades: Record<string, SpatialDiseaseStats>;
}

type Fase1Payload = {
  predictions?: Array<{ class?: string }>;
};

type Fase2Payload = {
  resumen_comparativo?: {
    consenso?: boolean;
  };
};

function round(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function isHealthyClass(cls: string): boolean {
  return cls.toLowerCase().includes("healthy");
}

export function analyzeSpatialPredicciones(
  records: Prediccion[],
): SpatialAnalysis {
  const withClass = records.filter((r) =>
    Boolean(r.fase2_resumen?.clase_predicha),
  );

  const byDisease: Record<string, SpatialDiseaseStats> = {};
  let totalConf = 0;
  let totalDetections = 0;
  let consensusCount = 0;

  for (const r of withClass) {
    const cls = r.fase2_resumen?.clase_predicha;
    if (!cls) continue;

    const conf = r.fase2_resumen?.confianza ?? 0;
    const dets = r.fase1_resumen?.total_detecciones ?? 0;

    const fase1 = (r.fase1_payload ?? {}) as Fase1Payload;
    const blightCount =
      fase1.predictions?.filter((p) =>
        p.class?.toLowerCase().includes("blight"),
      ).length ?? 0;

    const fase2 = (r.fase2_payload ?? {}) as Fase2Payload;
    const hasConsensus = fase2.resumen_comparativo?.consenso ?? false;

    if (!byDisease[cls]) {
      byDisease[cls] = {
        count: 0,
        pct: 0,
        avgConf: 0,
        avgDets: 0,
        totalBlight: 0,
        consensusCount: 0,
        primera_deteccion: r.fecha ?? r.created_at ?? null,
        ultima_deteccion: r.fecha ?? r.created_at ?? null,
      };
    }

    byDisease[cls].count += 1;
    byDisease[cls].avgConf += conf;
    byDisease[cls].avgDets += dets;
    byDisease[cls].totalBlight += blightCount;
    if (hasConsensus) byDisease[cls].consensusCount += 1;

    const currentDate = r.fecha ?? r.created_at ?? null;
    if (currentDate) {
      const firstDate = byDisease[cls].primera_deteccion;
      const lastDate = byDisease[cls].ultima_deteccion;
      if (!firstDate || currentDate < firstDate)
        byDisease[cls].primera_deteccion = currentDate;
      if (!lastDate || currentDate > lastDate)
        byDisease[cls].ultima_deteccion = currentDate;
    }

    totalConf += conf;
    totalDetections += dets;
    if (hasConsensus) consensusCount += 1;
  }

  for (const cls of Object.keys(byDisease)) {
    const s = byDisease[cls];
    s.pct =
      withClass.length > 0 ? round((s.count / withClass.length) * 100, 1) : 0;
    s.avgConf = s.count > 0 ? round(s.avgConf / s.count, 3) : 0;
    s.avgDets = s.count > 0 ? round(s.avgDets / s.count, 2) : 0;
  }

  const conEnfermedad = Object.entries(byDisease)
    .filter(([cls]) => !isHealthyClass(cls))
    .reduce((acc, [, stats]) => acc + stats.count, 0);
  const saludables = Object.entries(byDisease)
    .filter(([cls]) => isHealthyClass(cls))
    .reduce((acc, [, stats]) => acc + stats.count, 0);

  let tendencia: SpatialAnalysis["tendencia"] = "insuficiente_datos";
  if (withClass.length >= 6) {
    const sorted = [...withClass].sort(
      (a, b) =>
        new Date(a.fecha ?? a.created_at ?? 0).getTime() -
        new Date(b.fecha ?? b.created_at ?? 0).getTime(),
    );
    const primeras = sorted.slice(0, 3);
    const ultimas = sorted.slice(-3);
    const enfPrimeras = primeras.filter(
      (r) => !isHealthyClass(r.fase2_resumen?.clase_predicha ?? ""),
    ).length;
    const enfUltimas = ultimas.filter(
      (r) => !isHealthyClass(r.fase2_resumen?.clase_predicha ?? ""),
    ).length;
    if (enfUltimas > enfPrimeras) tendencia = "empeorando";
    else if (enfUltimas < enfPrimeras) tendencia = "mejorando";
    else tendencia = "estable";
  } else if (withClass.length >= 3) {
    tendencia = "estable";
  }

  const enfermedadPredominante =
    Object.entries(byDisease)
      .filter(([cls]) => !isHealthyClass(cls))
      .sort(([, a], [, b]) => b.count - a.count)[0]?.[0] ?? null;

  return {
    total_predicciones: records.length,
    con_enfermedad: conEnfermedad,
    saludables,
    confianza_promedio:
      withClass.length > 0 ? round(totalConf / withClass.length, 3) : 0,
    total_detecciones: totalDetections,
    promedio_detecciones_por_imagen:
      records.length > 0 ? round(totalDetections / records.length, 2) : 0,
    tasa_consenso:
      withClass.length > 0
        ? round((consensusCount / withClass.length) * 100, 1)
        : 0,
    indice_severidad:
      withClass.length > 0
        ? round((conEnfermedad / withClass.length) * 100, 1)
        : 0,
    tendencia,
    enfermedad_predominante: enfermedadPredominante,
    distribucion_enfermedades: byDisease,
  };
}

export function buildSpatialRecommendations(
  analysis: SpatialAnalysis,
): SpatialDiagnosisRecommendation[] {
  const recs: SpatialDiagnosisRecommendation[] = [];

  const late = analysis.distribucion_enfermedades["Potato___Late_blight"];
  const early = analysis.distribucion_enfermedades["Potato___Early_blight"];

  if (late?.count) {
    recs.push({
      categoria: "alerta",
      prioridad: late.pct >= 50 ? "urgente" : "alta",
      titulo: `Tizon tardio detectado (${late.pct}%)`,
      contenido:
        "Se detecta presencia significativa de tizón tardío. Aplique un fungicida sistémico y refuerce el monitoreo diario durante la siguiente semana.",
      etiquetas: ["late_blight", "alerta"],
    });
  }

  if (early?.count) {
    recs.push({
      categoria: "fungicida",
      prioridad: early.pct >= 40 ? "alta" : "media",
      titulo: `Tizon temprano detectado (${early.pct}%)`,
      contenido:
        "Se observan signos de tizón temprano. Utilice fungicida de contacto y retire tejido vegetal con lesiones visibles.",
      etiquetas: ["early_blight", "tratamiento"],
    });
  }

  if (analysis.indice_severidad > 60) {
    recs.push({
      categoria: "alerta",
      prioridad: "urgente",
      titulo: "Severidad critica en el cultivo",
      contenido:
        "El nivel de infección es crítico. Coordine intervención inmediata y revisión agronómica para contener propagación.",
      etiquetas: ["severidad", "urgente"],
    });
  } else if (analysis.indice_severidad > 30) {
    recs.push({
      categoria: "monitoreo",
      prioridad: "alta",
      titulo: "Severidad moderada",
      contenido:
        "Aumente frecuencia de monitoreo y evalúe ajuste de estrategia preventiva en las próximas evaluaciones.",
      etiquetas: ["monitoreo", "severidad"],
    });
  }

  if (analysis.tendencia === "empeorando") {
    recs.push({
      categoria: "alerta",
      prioridad: "alta",
      titulo: "Tendencia de empeoramiento",
      contenido:
        "La tendencia temporal muestra aumento de casos. Priorice inspección de zonas adyacentes y acciones preventivas.",
      etiquetas: ["tendencia", "empeorando"],
    });
  }

  if (analysis.tasa_consenso < 70 && analysis.total_predicciones > 2) {
    recs.push({
      categoria: "general",
      prioridad: "media",
      titulo: "Consenso bajo entre modelos",
      contenido:
        "El consenso de modelos es bajo. Capture imágenes con mejor iluminación y enfoque para reducir ambigüedad.",
      etiquetas: ["consenso", "calidad_imagen"],
    });
  }

  if (recs.length === 0) {
    recs.push({
      categoria: "general",
      prioridad: "baja",
      titulo: "Estado estable",
      contenido:
        "No se detectan señales críticas en este corte. Mantenga monitoreo rutinario y manejo preventivo.",
      etiquetas: ["estable", "preventivo"],
    });
  }

  return recs;
}
