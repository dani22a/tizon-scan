"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getPredictionsByPeriodo,
  getPeriodoById,
  createPeriodoDiagnosis,
  getPeriodoDiagnosisHistory,
} from "@/service/evaluation";
import {
  PrediccionRecord,
  Periodo,
  PeriodoReportRecord,
  DiseaseDistributionEntry,
  CreatePeriodoDiagnosisPayload,
} from "@/types/evaluation";

// ── Utilidades de presentación ───────────────────────────────────

const DISEASE_NAMES: Record<string, string> = {
  Potato___Early_blight: "Tizón Temprano",
  Potato___Late_blight: "Tizón Tardío",
  Potato___healthy: "Saludable",
};
function dn(cls: string) {
  return DISEASE_NAMES[cls] ?? cls;
}

function classColor(cls: string) {
  if (cls.includes("healthy")) return "bg-green-500";
  if (cls.includes("Early")) return "bg-amber-500";
  return "bg-red-500";
}
function classBadge(cls: string) {
  if (cls.includes("healthy")) return "bg-green-100 text-green-800";
  if (cls.includes("Early")) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

// ── Análisis de predicciones ─────────────────────────────────────

interface PeriodAnalysis {
  total: number;
  withClassification: number;
  conEnfermedad: number;
  saludables: number;
  byDisease: Record<string, DiseaseDistributionEntry>;
  overallAvgConfidence: number;
  totalDetections: number;
  avgDetectionsPerImage: number;
  blightDetected: number;
  consensusRate: number;
  severityScore: number;
  tendencia: "mejorando" | "empeorando" | "estable" | "insuficiente_datos";
  enfermedadPredominante: string | null;
  diasActivos: number;
  frecuenciaMonitoreo: number;
  surcosMonitoreados: number[];
}

function analyzePeriodRecords(
  records: PrediccionRecord[],
  periodoFechaInicio: string,
): PeriodAnalysis {
  const withClass = records.filter((r) => r.fase2_resumen?.clase_predicha);

  const byDisease: Record<string, DiseaseDistributionEntry> = {};
  let totalConf = 0;
  let totalDetections = 0;
  let blightDetected = 0;
  let consensusCount = 0;

  for (const r of withClass) {
    const cls = r.fase2_resumen!.clase_predicha;
    const conf = r.fase2_resumen!.confianza;
    const dets = r.fase1_resumen?.total_detecciones ?? 0;
    const blightCount =
      r.fase1_payload?.predictions.filter((p) =>
        p.class.toLowerCase().includes("blight"),
      ).length ?? 0;
    const hasConsensus =
      r.fase2_payload?.resumen_comparativo?.consenso ?? false;

    if (!byDisease[cls]) {
      byDisease[cls] = {
        count: 0,
        pct: 0,
        avgConf: 0,
        avgDets: 0,
        totalBlight: 0,
        consensusCount: 0,
        primera_deteccion: r.fecha ?? r.created_at,
        ultima_deteccion: r.fecha ?? r.created_at,
      };
    }
    byDisease[cls].count++;
    byDisease[cls].avgConf += conf;
    byDisease[cls].avgDets += dets;
    byDisease[cls].totalBlight += blightCount;
    if (hasConsensus) byDisease[cls].consensusCount++;

    // fecha más antigua y más reciente por clase
    const fechaActual = r.fecha ?? r.created_at;
    if (
      byDisease[cls].primera_deteccion &&
      fechaActual < byDisease[cls].primera_deteccion!
    )
      byDisease[cls].primera_deteccion = fechaActual;
    if (
      byDisease[cls].ultima_deteccion &&
      fechaActual > byDisease[cls].ultima_deteccion!
    )
      byDisease[cls].ultima_deteccion = fechaActual;

    totalConf += conf;
    totalDetections += dets;
    if (blightCount > 0) blightDetected++;
    if (hasConsensus) consensusCount++;
  }

  for (const cls of Object.keys(byDisease)) {
    const s = byDisease[cls];
    s.pct =
      withClass.length > 0
        ? Math.round((s.count / withClass.length) * 1000) / 10
        : 0;
    s.avgConf =
      s.count > 0 ? Math.round((s.avgConf / s.count) * 1000) / 1000 : 0;
    s.avgDets = s.count > 0 ? Math.round((s.avgDets / s.count) * 100) / 100 : 0;
  }

  const conEnfermedad = Object.entries(byDisease)
    .filter(([k]) => !k.includes("healthy"))
    .reduce((sum, [, v]) => sum + v.count, 0);
  const saludables = byDisease["Potato___healthy"]?.count ?? 0;
  const severityScore =
    withClass.length > 0
      ? Math.round((conEnfermedad / withClass.length) * 1000) / 10
      : 0;

  // Tendencia: comparar primeras 3 vs últimas 3 clasificaciones
  let tendencia: PeriodAnalysis["tendencia"] = "insuficiente_datos";
  if (withClass.length >= 6) {
    const sorted = [...withClass].sort(
      (a, b) =>
        new Date(a.fecha ?? a.created_at).getTime() -
        new Date(b.fecha ?? b.created_at).getTime(),
    );
    const primeras = sorted.slice(0, 3);
    const ultimas = sorted.slice(-3);
    const enfPrimeras = primeras.filter(
      (r) => !(r.fase2_resumen?.clase_predicha ?? "").includes("healthy"),
    ).length;
    const enfUltimas = ultimas.filter(
      (r) => !(r.fase2_resumen?.clase_predicha ?? "").includes("healthy"),
    ).length;
    if (enfUltimas > enfPrimeras) tendencia = "empeorando";
    else if (enfUltimas < enfPrimeras) tendencia = "mejorando";
    else tendencia = "estable";
  } else if (withClass.length >= 3) {
    tendencia = "estable";
  }

  // Enfermedad predominante (excluyendo "healthy")
  const enfermedadPredominante =
    Object.entries(byDisease)
      .filter(([k]) => !k.includes("healthy"))
      .sort(([, a], [, b]) => b.count - a.count)[0]?.[0] ?? null;

  // Días activos (días únicos con predicciones)
  const diasSet = new Set(
    records.map((r) => (r.fecha ?? r.created_at).slice(0, 10)),
  );
  const diasActivos = diasSet.size;
  const frecuenciaMonitoreo =
    diasActivos > 0
      ? Math.round((records.length / diasActivos) * 100) / 100
      : 0;

  // Surcos únicos monitoreados
  const surcosMonitoreados = [
    ...new Set(
      records.map((r) => r.surco_id).filter((id): id is number => id !== null),
    ),
  ];

  return {
    total: records.length,
    withClassification: withClass.length,
    conEnfermedad,
    saludables,
    byDisease,
    overallAvgConfidence:
      withClass.length > 0
        ? Math.round((totalConf / withClass.length) * 1000) / 1000
        : 0,
    totalDetections,
    avgDetectionsPerImage:
      records.length > 0
        ? Math.round((totalDetections / records.length) * 100) / 100
        : 0,
    blightDetected,
    consensusRate:
      withClass.length > 0
        ? Math.round((consensusCount / withClass.length) * 1000) / 10
        : 0,
    severityScore,
    tendencia,
    enfermedadPredominante,
    diasActivos,
    frecuenciaMonitoreo,
    surcosMonitoreados,
  };
}

// ── Generación de recomendaciones ────────────────────────────────

interface Recommendation {
  categoria: "fungicida" | "monitoreo" | "riego" | "general" | "alerta";
  prioridad: "urgente" | "alta" | "media" | "baja";
  titulo: string;
  contenido: string;
  etiquetas: string[];
}

function buildRecommendations(a: PeriodAnalysis): Recommendation[] {
  const recs: Recommendation[] = [];

  const lateBlight = a.byDisease["Potato___Late_blight"];
  const earlyBlight = a.byDisease["Potato___Early_blight"];
  const healthy = a.byDisease["Potato___healthy"];

  // ── Tizón Tardío ─────────────────────────────────────────
  if (lateBlight && lateBlight.count > 0) {
    recs.push({
      categoria: "alerta",
      prioridad: lateBlight.pct >= 50 ? "urgente" : "alta",
      titulo: `Tizón Tardío en el ${lateBlight.pct}% de muestras del periodo`,
      contenido:
        `Phytophthora infestans fue detectado en ${lateBlight.count} de ${a.withClassification} evaluaciones ` +
        `(confianza promedio ${(lateBlight.avgConf * 100).toFixed(1)}%). ` +
        "Aplique fungicidas sistémicos como Metalaxil o Cimoxanil cada 7-10 días. " +
        "Elimine plantas severamente infectadas para evitar propagación de esporas.",
      etiquetas: [
        "late_blight",
        "phytophthora",
        lateBlight.pct >= 50 ? "critico" : "alto",
      ],
    });
    if (lateBlight.totalBlight > 5) {
      recs.push({
        categoria: "fungicida",
        prioridad: "urgente",
        titulo: `Alta carga de lesiones blight (${lateBlight.totalBlight} zonas detectadas)`,
        contenido:
          "La cantidad acumulada de lesiones en el periodo indica infección avanzada. " +
          "Combine fungicida de contacto (Mancozeb) con sistémico (Metalaxil). " +
          "Monitoree diariamente las plantas adyacentes.",
        etiquetas: ["late_blight", "lesiones_multiples", "tratamiento_urgente"],
      });
    }
  }

  // ── Tizón Temprano ───────────────────────────────────────
  if (earlyBlight && earlyBlight.count > 0) {
    recs.push({
      categoria: "alerta",
      prioridad: earlyBlight.pct >= 40 ? "alta" : "media",
      titulo: `Tizón Temprano en el ${earlyBlight.pct}% de muestras del periodo`,
      contenido:
        `Alternaria solani fue detectado en ${earlyBlight.count} evaluaciones ` +
        `(confianza promedio ${(earlyBlight.avgConf * 100).toFixed(1)}%). ` +
        "Aplique Clorotalonil o Mancozeb cada 10-14 días. " +
        "Retire hojas infectadas del suelo para reducir el inóculo.",
      etiquetas: ["early_blight", "alternaria"],
    });
  }

  // ── Severidad global ─────────────────────────────────────
  if (a.severityScore > 60) {
    recs.push({
      categoria: "alerta",
      prioridad: "urgente",
      titulo: `Nivel de infección crítico: ${a.severityScore.toFixed(1)}% del cultivo afectado`,
      contenido:
        "Más de la mitad de las muestras del periodo presentan enfermedad. " +
        "Consulte urgentemente con un ingeniero agrónomo. " +
        "Evalúe la posibilidad de cosecha anticipada si la infección está muy avanzada.",
      etiquetas: ["severidad_critica", "accion_urgente"],
    });
  } else if (a.severityScore > 30) {
    recs.push({
      categoria: "monitoreo",
      prioridad: "alta",
      titulo: `Infección moderada: ${a.severityScore.toFixed(1)}% de muestras afectadas`,
      contenido:
        "Intensifique el monitoreo a al menos 3 veces por semana. " +
        "Asegure rotación de principios activos para evitar resistencia.",
      etiquetas: ["severidad_moderada"],
    });
  }

  // ── Tendencia ────────────────────────────────────────────
  if (a.tendencia === "empeorando") {
    recs.push({
      categoria: "alerta",
      prioridad: "alta",
      titulo: "Tendencia negativa durante el periodo",
      contenido:
        "Las evaluaciones más recientes muestran mayor incidencia que las iniciales. " +
        "Revise las condiciones ambientales y refuerce el calendario fungicida. " +
        "Mejore la ventilación entre plantas y evite el riego por aspersión.",
      etiquetas: ["tendencia_negativa", "empeorando"],
    });
  } else if (a.tendencia === "mejorando") {
    recs.push({
      categoria: "general",
      prioridad: "baja",
      titulo: "Tendencia positiva: el cultivo muestra mejoría",
      contenido:
        "Las evaluaciones recientes muestran menor incidencia que las iniciales. " +
        "Mantenga el plan de tratamiento actual hasta completar el ciclo recomendado.",
      etiquetas: ["tendencia_positiva", "mejorando"],
    });
  }

  // ── Frecuencia de monitoreo ──────────────────────────────
  if (a.diasActivos > 0 && a.frecuenciaMonitoreo < 1 && a.total > 0) {
    recs.push({
      categoria: "monitoreo",
      prioridad: "media",
      titulo: "Monitoreo insuficiente en el periodo",
      contenido:
        `Se registraron ${a.total} evaluaciones en ${a.diasActivos} días activos ` +
        `(${a.frecuenciaMonitoreo.toFixed(1)} evaluaciones/día). ` +
        "Durante épocas de riesgo se recomienda al menos 1 evaluación diaria " +
        "y 3 veces por semana como mínimo.",
      etiquetas: ["monitoreo_insuficiente"],
    });
  }

  // ── Consenso bajo ────────────────────────────────────────
  if (a.consensusRate < 70 && a.withClassification > 2) {
    recs.push({
      categoria: "monitoreo",
      prioridad: "media",
      titulo: `Consenso entre modelos bajo (${a.consensusRate.toFixed(0)}%)`,
      contenido:
        "Los modelos de IA no coinciden en varias predicciones del periodo. " +
        "Puede indicar síntomas ambiguos o imágenes de baja calidad. " +
        "Capture imágenes más cercanas, con buena iluminación y enfocadas en lesiones.",
      etiquetas: ["consenso_bajo", "calidad_imagen"],
    });
  }

  // ── Cultivo saludable ────────────────────────────────────
  if (healthy && healthy.count > 0 && a.severityScore < 20) {
    recs.push({
      categoria: "general",
      prioridad: "baja",
      titulo: "Cultivo mayormente saludable en el periodo",
      contenido:
        "La mayoría de las muestras del periodo indican plantas sanas. " +
        "Mantenga rotación de cultivos, fertilización balanceada y monitoreo regular. " +
        "Aplique fungicida preventivo si el clima favorece enfermedades.",
      etiquetas: ["saludable", "preventivo"],
    });
  }

  // ── Cobertura espacial ───────────────────────────────────
  if (a.surcosMonitoreados.length > 0) {
    recs.push({
      categoria: "monitoreo",
      prioridad: "baja",
      titulo: `Cobertura: ${a.surcosMonitoreados.length} surco(s) evaluado(s)`,
      contenido:
        `Durante este periodo se monitorearon ${a.surcosMonitoreados.length} surcos. ` +
        "Asegure que todos los surcos del cultivo sean evaluados de forma rotativa " +
        "para detectar focos tempranos en zonas no monitoreadas.",
      etiquetas: ["cobertura_espacial"],
    });
  }

  return recs;
}

// ── Estilos ──────────────────────────────────────────────────────

const PRIORIDAD_STYLES: Record<
  string,
  { bg: string; border: string; icon: string; text: string }
> = {
  urgente: {
    bg: "bg-red-50",
    border: "border-red-300",
    icon: "🚨",
    text: "text-red-800",
  },
  alta: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    icon: "⚠️",
    text: "text-amber-800",
  },
  media: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    icon: "💡",
    text: "text-blue-800",
  },
  baja: {
    bg: "bg-green-50",
    border: "border-green-300",
    icon: "✅",
    text: "text-green-800",
  },
};

const TENDENCIA_LABEL: Record<string, { text: string; color: string }> = {
  mejorando: { text: "Mejorando", color: "text-green-600" },
  empeorando: { text: "Empeorando", color: "text-red-600" },
  estable: { text: "Estable", color: "text-slate-600" },
  insuficiente_datos: {
    text: "Sin datos suficientes",
    color: "text-slate-400",
  },
};

// ── Componente de historial ──────────────────────────────────────

function HistorySection({ reports }: { reports: PeriodoReportRecord[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (reports.length === 0) {
    return (
      <p className="text-slate-400 text-sm italic">
        Aún no hay diagnósticos guardados para este periodo.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div
          key={r.id}
          className="border border-slate-200 rounded-xl overflow-hidden"
        >
          <button
            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-700">
                {new Date(r.fecha_reporte).toLocaleString("es-PE")}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  r.indice_severidad > 60
                    ? "bg-red-100 text-red-700"
                    : r.indice_severidad > 30
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                }`}
              >
                Severidad {r.indice_severidad.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">
                {r.total_predicciones} predicciones · {r.recomendaciones.length}{" "}
                recomendaciones
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expanded === r.id ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {expanded === r.id && (
            <div className="px-5 pb-5 space-y-4 bg-white">
              {/* Métricas del snapshot */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total predicciones", value: r.total_predicciones },
                  { label: "Con enfermedad", value: r.con_enfermedad },
                  { label: "Saludables", value: r.saludables },
                  {
                    label: "Confianza prom.",
                    value: `${(r.confianza_promedio * 100).toFixed(1)}%`,
                  },
                  { label: "Detecciones tot.", value: r.total_detecciones },
                  { label: "Días activos", value: r.dias_activos },
                  {
                    label: "Frec. monitoreo",
                    value: `${r.frecuencia_monitoreo}/día`,
                  },
                  {
                    label: "Tendencia",
                    value: TENDENCIA_LABEL[r.tendencia]?.text ?? r.tendencia,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Distribución de enfermedades del snapshot */}
              {r.distribucion_enfermedades &&
                Object.keys(r.distribucion_enfermedades).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Distribución al momento del diagnóstico
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(r.distribucion_enfermedades).map(
                        ([cls, stats]) => (
                          <div
                            key={cls}
                            className="flex items-center gap-2"
                          >
                            <div
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${classColor(cls)}`}
                            />
                            <span className="text-xs text-slate-600 w-44 truncate">
                              {dn(cls)}
                            </span>
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${classColor(cls)}`}
                                style={{ width: `${stats.pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 w-10 text-right">
                              {stats.pct}%
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Recomendaciones emitidas */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Recomendaciones emitidas
                </p>
                <div className="space-y-2">
                  {r.recomendaciones.map((rec) => {
                    const st =
                      PRIORIDAD_STYLES[rec.prioridad] ?? PRIORIDAD_STYLES.media;
                    return (
                      <div
                        key={rec.id}
                        className={`rounded-lg border ${st.border} ${st.bg} px-4 py-3`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span>{st.icon}</span>
                          <span className={`text-sm font-semibold ${st.text}`}>
                            {rec.titulo}
                          </span>
                          <span
                            className={`ml-auto text-xs font-bold uppercase px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}
                          >
                            {rec.prioridad}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${st.text}`}>
                          {rec.contenido}
                        </p>
                        {rec.etiquetas && rec.etiquetas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {rec.etiquetas.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-white/70 border border-current px-1.5 py-0.5 rounded-md opacity-70"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────

export default function PeriodoDetailPage({
  params,
}: {
  params: { periodoId: string };
}) {
  const periodoId = parseInt(params.periodoId, 10);
  const router = useRouter();

  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [predicciones, setPredicciones] = useState<PrediccionRecord[]>([]);
  const [reports, setReports] = useState<PeriodoReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [periodoRes, predsRes, historyRes] = await Promise.all([
          getPeriodoById(periodoId),
          getPredictionsByPeriodo(periodoId),
          getPeriodoDiagnosisHistory(periodoId),
        ]);
        setPeriodo(periodoRes.data);
        setPredicciones(predsRes.data ?? []);
        setReports(historyRes.data ?? []);
      } catch {
        toast.error("No se pudieron cargar los datos del periodo");
      } finally {
        setLoading(false);
      }
    })();
  }, [periodoId]);

  const analysis = useMemo(
    () => analyzePeriodRecords(predicciones, periodo?.fecha_inicio ?? ""),
    [predicciones, periodo],
  );

  const recommendations = useMemo(
    () => buildRecommendations(analysis),
    [analysis],
  );

  const handleSave = async () => {
    if (!predicciones.length) {
      toast.info("No hay predicciones para generar un diagnóstico");
      return;
    }
    try {
      setSaving(true);
      const payload: CreatePeriodoDiagnosisPayload = {
        total_predicciones: analysis.total,
        con_enfermedad: analysis.conEnfermedad,
        saludables: analysis.saludables,
        confianza_promedio: analysis.overallAvgConfidence,
        total_detecciones: analysis.totalDetections,
        promedio_detecciones_por_imagen: analysis.avgDetectionsPerImage,
        tasa_consenso: analysis.consensusRate,
        dias_activos: analysis.diasActivos,
        frecuencia_monitoreo: analysis.frecuenciaMonitoreo,
        indice_severidad: analysis.severityScore,
        tendencia: analysis.tendencia,
        enfermedad_predominante: analysis.enfermedadPredominante,
        surcos_monitoreados: analysis.surcosMonitoreados,
        distribucion_enfermedades: analysis.byDisease,
        recomendaciones: recommendations.map((r) => ({
          categoria: r.categoria,
          prioridad: r.prioridad,
          titulo: r.titulo,
          contenido: r.contenido,
          etiquetas: r.etiquetas,
        })),
      };
      const res = await createPeriodoDiagnosis(periodoId, payload);
      toast.success("Diagnóstico del periodo guardado");
      // Añadir el nuevo reporte al historial sin recargar
      if (res.data) setReports((prev) => [res.data, ...prev]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        "No se pudo guardar el diagnóstico";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">
            Cargando datos del periodo...
          </p>
        </div>
      </div>
    );
  }

  const trendInfo = TENDENCIA_LABEL[analysis.tendencia];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-emerald-600 hover:underline mb-2 inline-flex items-center gap-1"
          >
            ← Volver a periodos
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            {periodo?.nombre ?? `Periodo #${periodoId}`}
          </h1>
          {periodo && (
            <p className="text-slate-500 mt-1 text-sm">
              {new Date(periodo.fecha_inicio).toLocaleDateString("es-PE")}
              {" — "}
              {new Date(periodo.fecha_fin).toLocaleDateString("es-PE")}
              {periodo.descripcion && (
                <span className="ml-2 text-slate-400">
                  · {periodo.descripcion}
                </span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || predicciones.length === 0}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
        >
          {saving ? "Guardando..." : "Guardar diagnóstico"}
        </button>
      </div>

      {predicciones.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-lg">
            No hay predicciones en este periodo.
          </p>
          <p className="text-slate-300 text-sm mt-1">
            Realiza evaluaciones asignadas a este periodo para generar el
            análisis.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total predicciones",
                value: analysis.total,
                sub: `${analysis.diasActivos} días activos`,
              },
              {
                label: "Con enfermedad",
                value: analysis.conEnfermedad,
                sub: `${analysis.severityScore.toFixed(1)}% del total`,
                accent:
                  analysis.conEnfermedad > 0
                    ? "text-red-600"
                    : "text-slate-800",
              },
              {
                label: "Saludables",
                value: analysis.saludables,
                sub: `${analysis.withClassification > 0 ? ((analysis.saludables / analysis.withClassification) * 100).toFixed(0) : 0}% clasificadas`,
                accent: "text-green-600",
              },
              {
                label: "Tendencia",
                value: trendInfo?.text ?? analysis.tendencia,
                sub: `Severidad ${analysis.severityScore.toFixed(1)}%`,
                accent: trendInfo?.color,
              },
            ].map(({ label, value, sub, accent }) => (
              <div
                key={label}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
              >
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                <p
                  className={`text-3xl font-bold mt-1 ${accent ?? "text-slate-800"}`}
                >
                  {value}
                </p>
                <p className="text-xs text-slate-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Métricas secundarias */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Confianza promedio",
                value: `${(analysis.overallAvgConfidence * 100).toFixed(1)}%`,
              },
              { label: "Total detecciones", value: analysis.totalDetections },
              {
                label: "Dets. por imagen",
                value: analysis.avgDetectionsPerImage.toFixed(2),
              },
              {
                label: "Consenso modelos",
                value: `${analysis.consensusRate.toFixed(0)}%`,
              },
              {
                label: "Frec. monitoreo",
                value: `${analysis.frecuenciaMonitoreo}/día`,
              },
              {
                label: "Surcos evaluados",
                value: analysis.surcosMonitoreados.length,
              },
              {
                label: "Enfermedad principal",
                value: analysis.enfermedadPredominante
                  ? dn(analysis.enfermedadPredominante)
                  : "Ninguna",
              },
              {
                label: "Sin clasificar",
                value: analysis.total - analysis.withClassification,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-3"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Distribución por enfermedad */}
          {Object.keys(analysis.byDisease).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-700 mb-4">
                Distribución por enfermedad en el periodo
              </h2>
              <div className="space-y-4">
                {Object.entries(analysis.byDisease)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([cls, stats]) => (
                    <div key={cls}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${classColor(cls)}`}
                          />
                          <span className="text-sm font-medium text-slate-700">
                            {dn(cls)}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${classBadge(cls)}`}
                          >
                            {stats.count} muestras
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-700">
                          {stats.pct}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${classColor(cls)}`}
                          style={{ width: `${stats.pct}%` }}
                        />
                      </div>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs text-slate-400">
                          Confianza prom.: {(stats.avgConf * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-400">
                          Dets. prom.: {stats.avgDets.toFixed(1)}
                        </span>
                        {stats.primera_deteccion && (
                          <span className="text-xs text-slate-400">
                            Primera:{" "}
                            {new Date(
                              stats.primera_deteccion,
                            ).toLocaleDateString("es-PE")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recomendaciones actuales */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Recomendaciones actuales
            </h2>
            <p className="text-slate-500 text-sm mb-4">
              Generadas a partir de {analysis.withClassification} evaluaciones
              clasificadas. Guarda el diagnóstico para conservarlas en el
              historial.
            </p>
            <div className="space-y-3">
              {recommendations.map((rec, i) => {
                const st = PRIORIDAD_STYLES[rec.prioridad];
                return (
                  <div
                    key={i}
                    className={`rounded-xl border-2 ${st.border} ${st.bg} px-5 py-4`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{st.icon}</span>
                      <span className={`font-semibold ${st.text}`}>
                        {rec.titulo}
                      </span>
                      <span
                        className={`ml-auto text-xs font-bold uppercase px-2 py-0.5 rounded-full ${st.bg} ${st.text} border ${st.border}`}
                      >
                        {rec.prioridad}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${st.text}`}>
                      {rec.contenido}
                    </p>
                    {rec.etiquetas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rec.etiquetas.map((tag) => (
                          <span
                            key={tag}
                            className={`text-xs px-2 py-0.5 rounded-md bg-white/60 border ${st.border} ${st.text} opacity-80`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Historial de diagnósticos guardados */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">
          Historial de diagnósticos guardados
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          Cada entrada incluye el snapshot de métricas y las recomendaciones
          emitidas en ese momento.
        </p>
        <HistorySection reports={reports} />
      </div>
    </div>
  );
}
