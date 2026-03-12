"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createDiagnosisReport, getPredictionHistory } from "@/service/evaluation";
import { PrediccionRecord, ModelResult } from "@/types/evaluation";

const DISEASE_NAMES: Record<string, string> = {
  Potato___Early_blight: "Tizón Temprano (Early Blight)",
  Potato___Late_blight: "Tizón Tardío (Late Blight)",
  Potato___healthy: "Saludable",
};

const DISEASE_SHORT: Record<string, string> = {
  Potato___Early_blight: "Tizón Temprano",
  Potato___Late_blight: "Tizón Tardío",
  Potato___healthy: "Saludable",
};

function dn(cls: string) {
  return DISEASE_SHORT[cls] ?? cls;
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

function classBorder(cls: string) {
  if (cls.includes("healthy"))
    return "border-green-200 bg-green-50/50";
  if (cls.includes("Early"))
    return "border-amber-200 bg-amber-50/50";
  return "border-red-200 bg-red-50/50";
}

interface DiseaseStats {
  count: number;
  avgConfidence: number;
  avgDetections: number;
  totalBlight: number;
  consensusCount: number;
}

interface AnalysisResult {
  total: number;
  withClassification: number;
  withoutClassification: number;
  byDisease: Record<string, DiseaseStats>;
  overallAvgConfidence: number;
  totalDetections: number;
  avgDetectionsPerImage: number;
  blightDetected: number;
  consensusRate: number;
  severityScore: number;
  recentTrend: "improving" | "worsening" | "stable" | "unknown";
  recentDiseaseClass: string | null;
}

function analyzeRecords(records: PrediccionRecord[]): AnalysisResult {
  const withClass = records.filter((r) => r.fase2_resumen !== null);
  const withoutClass = records.filter((r) => r.fase2_resumen === null);

  const byDisease: Record<string, DiseaseStats> = {};
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
    const hasConsensus = r.fase2_payload?.resumen_comparativo?.consenso ?? false;

    if (!byDisease[cls]) {
      byDisease[cls] = {
        count: 0,
        avgConfidence: 0,
        avgDetections: 0,
        totalBlight: 0,
        consensusCount: 0,
      };
    }
    byDisease[cls].count++;
    byDisease[cls].avgConfidence += conf;
    byDisease[cls].avgDetections += dets;
    byDisease[cls].totalBlight += blightCount;
    if (hasConsensus) byDisease[cls].consensusCount++;

    totalConf += conf;
    totalDetections += dets;
    if (blightCount > 0) blightDetected++;
    if (hasConsensus) consensusCount++;
  }

  for (const cls of Object.keys(byDisease)) {
    const s = byDisease[cls];
    s.avgConfidence = s.count > 0 ? s.avgConfidence / s.count : 0;
    s.avgDetections = s.count > 0 ? s.avgDetections / s.count : 0;
  }

  const diseased = Object.entries(byDisease)
    .filter(([k]) => !k.includes("healthy"))
    .reduce((sum, [, v]) => sum + v.count, 0);
  const severityScore =
    withClass.length > 0 ? (diseased / withClass.length) * 100 : 0;

  let recentTrend: AnalysisResult["recentTrend"] = "unknown";
  let recentDiseaseClass: string | null = null;
  if (withClass.length >= 3) {
    const sorted = [...withClass].sort(
      (a, b) =>
        new Date(b.fecha ?? b.created_at).getTime() -
        new Date(a.fecha ?? a.created_at).getTime(),
    );
    const recent3 = sorted.slice(0, 3);
    const older3 = sorted.slice(3, 6);
    const recentDiseaseCount = recent3.filter(
      (r) =>
        !(r.fase2_resumen?.clase_predicha ?? "").includes("healthy"),
    ).length;
    const olderDiseaseCount =
      older3.length > 0
        ? older3.filter(
            (r) =>
              !(r.fase2_resumen?.clase_predicha ?? "").includes("healthy"),
          ).length
        : recentDiseaseCount;

    if (recentDiseaseCount > olderDiseaseCount) recentTrend = "worsening";
    else if (recentDiseaseCount < olderDiseaseCount) recentTrend = "improving";
    else recentTrend = "stable";

    recentDiseaseClass =
      recent3[0].fase2_resumen?.clase_predicha ?? null;
  }

  return {
    total: records.length,
    withClassification: withClass.length,
    withoutClassification: withoutClass.length,
    byDisease,
    overallAvgConfidence:
      withClass.length > 0 ? totalConf / withClass.length : 0,
    totalDetections,
    avgDetectionsPerImage:
      records.length > 0 ? totalDetections / records.length : 0,
    blightDetected,
    consensusRate:
      withClass.length > 0 ? (consensusCount / withClass.length) * 100 : 0,
    severityScore,
    recentTrend,
    recentDiseaseClass,
  };
}

interface Recommendation {
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  description: string;
}

function generateRecommendations(a: AnalysisResult): Recommendation[] {
  const recs: Recommendation[] = [];

  const lateBlight = a.byDisease["Potato___Late_blight"];
  const earlyBlight = a.byDisease["Potato___Early_blight"];
  const healthy = a.byDisease["Potato___healthy"];

  if (lateBlight && lateBlight.count > 0) {
    const pct = ((lateBlight.count / a.withClassification) * 100).toFixed(0);
    recs.push({
      severity: "critical",
      title: `Tizón Tardío detectado en ${pct}% de las muestras`,
      description:
        "El Tizón Tardío (Phytophthora infestans) es la enfermedad más destructiva de la papa. " +
        "Aplique fungicidas sistémicos como Metalaxil o Cimoxanil de forma preventiva cada 7-10 días. " +
        "Elimine inmediatamente las plantas severamente infectadas para evitar la propagación de esporas. " +
        "Evite el riego por aspersión y asegure buen drenaje en el campo.",
    });

    if (lateBlight.totalBlight > 5) {
      recs.push({
        severity: "critical",
        title: `Alto número de lesiones de blight (${lateBlight.totalBlight} zonas detectadas)`,
        description:
          "La cantidad de lesiones por hoja indica una infección avanzada. " +
          "Considere aplicación de emergencia de fungicida de contacto (Mancozeb) + sistémico (Metalaxil). " +
          "Monitoree diariamente las plantas adyacentes. En casos extremos, puede ser necesario " +
          "destruir las plantas afectadas para proteger el resto del cultivo.",
      });
    }
  }

  if (earlyBlight && earlyBlight.count > 0) {
    const pct = ((earlyBlight.count / a.withClassification) * 100).toFixed(0);
    recs.push({
      severity: "warning",
      title: `Tizón Temprano presente en ${pct}% de las muestras`,
      description:
        "El Tizón Temprano (Alternaria solani) afecta principalmente hojas inferiores. " +
        "Aplique fungicidas a base de Clorotalonil o Mancozeb cada 10-14 días. " +
        "Mejore la nutrición del cultivo, especialmente potasio y fósforo. " +
        "Retire las hojas infectadas del suelo para reducir el inóculo.",
    });
  }

  if (a.severityScore > 60) {
    recs.push({
      severity: "critical",
      title: "Nivel de infección crítico en el cultivo",
      description:
        `El ${a.severityScore.toFixed(0)}% de las muestras presentan enfermedad. ` +
        "Se recomienda consultar urgentemente con un ingeniero agrónomo. " +
        "Considere la aplicación combinada de fungicidas de contacto y sistémicos. " +
        "Evalúe la posibilidad de cosecha anticipada si la infección está muy avanzada.",
    });
  } else if (a.severityScore > 30) {
    recs.push({
      severity: "warning",
      title: "Nivel de infección moderado",
      description:
        `El ${a.severityScore.toFixed(0)}% de las muestras presentan enfermedad. ` +
        "Intensifique el monitoreo y las aplicaciones preventivas. " +
        "Asegúrese de rotar principios activos para evitar resistencia.",
    });
  }

  if (a.recentTrend === "worsening") {
    recs.push({
      severity: "warning",
      title: "Tendencia negativa: la enfermedad está aumentando",
      description:
        "Las evaluaciones más recientes muestran mayor incidencia de enfermedad. " +
        "Revise las condiciones ambientales (humedad alta, temperaturas entre 15-22°C favorecen el tizón). " +
        "Aumente la frecuencia de aplicación de fungicidas y mejore la ventilación entre plantas.",
    });
  } else if (a.recentTrend === "improving") {
    recs.push({
      severity: "success",
      title: "Tendencia positiva: la enfermedad está disminuyendo",
      description:
        "Las evaluaciones recientes muestran mejoría. Mantenga el plan de tratamiento actual. " +
        "No suspenda las aplicaciones preventivas hasta completar el ciclo recomendado.",
    });
  }

  if (a.consensusRate < 70 && a.withClassification > 2) {
    recs.push({
      severity: "info",
      title: `Consenso entre modelos bajo (${a.consensusRate.toFixed(0)}%)`,
      description:
        "Los modelos de IA no coinciden en todas las predicciones. " +
        "Esto puede indicar síntomas ambiguos o iniciales. " +
        "Se recomienda capturar imágenes más cercanas y con mejor iluminación para mejorar la precisión.",
    });
  }

  if (healthy && healthy.count > 0 && a.severityScore < 20) {
    recs.push({
      severity: "success",
      title: "Cultivo mayormente saludable",
      description:
        "La mayoría de sus muestras indican plantas sanas. " +
        "Mantenga las buenas prácticas: rotación de cultivos, fertilización balanceada, " +
        "y monitoreo regular. Aplique fungicida preventivo si el clima favorece enfermedades.",
    });
  }

  recs.push({
    severity: "info",
    title: "Buenas prácticas generales",
    description:
      "Mantenga una distancia adecuada entre plantas (75-90cm entre surcos). " +
      "Riegue por goteo, no por aspersión. Realice aporques regulares. " +
      "Monitoree el cultivo al menos 2 veces por semana durante épocas húmedas. " +
      "Rote principios activos de fungicidas para evitar resistencia.",
  });

  return recs;
}

const SEVERITY_STYLES: Record<
  Recommendation["severity"],
  { bg: string; border: string; icon: string; text: string }
> = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-300",
    icon: "🚨",
    text: "text-red-800",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    icon: "⚠️",
    text: "text-amber-800",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    icon: "💡",
    text: "text-blue-800",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-300",
    icon: "✅",
    text: "text-green-800",
  },
};

const TREND_LABEL: Record<string, { text: string; color: string }> = {
  improving: { text: "Mejorando", color: "text-green-600" },
  worsening: { text: "Empeorando", color: "text-red-600" },
  stable: { text: "Estable", color: "text-slate-600" },
  unknown: { text: "Sin datos suficientes", color: "text-slate-400" },
};

export default function DiagnosisPage() {
  const [records, setRecords] = useState<PrediccionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPredictionHistory();
        setRecords(res.data ?? []);
      } catch {
        toast.error("No se pudo cargar el historial");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const analysis = useMemo(() => analyzeRecords(records), [records]);
  const recommendations = useMemo(
    () => generateRecommendations(analysis),
    [analysis],
  );

  const handleSaveDiagnosis = async () => {
    if (!records.length) {
      toast.info("No hay registros para guardar");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        total_evaluaciones: analysis.total,
        con_clasificacion: analysis.withClassification,
        sin_clasificacion: analysis.withoutClassification,
        confianza_promedio: analysis.overallAvgConfidence,
        total_detecciones: analysis.totalDetections,
        promedio_detecciones_por_imagen: analysis.avgDetectionsPerImage,
        imagenes_con_blight: analysis.blightDetected,
        tasa_consenso: analysis.consensusRate,
        indice_severidad: analysis.severityScore,
        tendencia: analysis.recentTrend,
        clase_reciente: analysis.recentDiseaseClass,
        distribucion_enfermedades: analysis.byDisease,
        recomendaciones: recommendations.map((rec) => ({
          titulo: rec.title,
          contenido: rec.description,
          severidad: rec.severity,
          etiquetas: [] as string[],
        })),
      };

      await createDiagnosisReport(payload);
      toast.success("Diagnóstico guardado correctamente");
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
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Analizando registros...</p>
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <p className="text-slate-500 text-lg">
            No hay registros para analizar.
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Realiza evaluaciones primero para obtener recomendaciones.
          </p>
        </div>
      </div>
    );
  }

  const trendInfo = TREND_LABEL[analysis.recentTrend];
  const sortedDiseases = Object.entries(analysis.byDisease).sort(
    ([, a], [, b]) => b.count - a.count,
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            Diagnóstico y Recomendaciones del Cultivo
          </h1>
          <p className="text-slate-500 mt-1">
            Análisis inteligente basado en {analysis.total} evaluaciones
            registradas.
          </p>
        </div>
        <button
          onClick={handleSaveDiagnosis}
          disabled={saving}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {saving ? "Guardando..." : "Guardar diagnóstico"}
        </button>
      </div>

      {/* Severity bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-800">
            Índice de Severidad del Cultivo
          </h2>
          <span
            className={`text-2xl font-black tabular-nums ${
              analysis.severityScore > 60
                ? "text-red-600"
                : analysis.severityScore > 30
                  ? "text-amber-600"
                  : "text-green-600"
            }`}
          >
            {analysis.severityScore.toFixed(0)}%
          </span>
        </div>
        <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              analysis.severityScore > 60
                ? "bg-red-500"
                : analysis.severityScore > 30
                  ? "bg-amber-500"
                  : "bg-green-500"
            }`}
            style={{ width: `${Math.max(analysis.severityScore, 2)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
          <span>Saludable</span>
          <span>Moderado</span>
          <span>Crítico</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total evaluaciones
          </p>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {analysis.total}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Con clasificación
          </p>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {analysis.withClassification}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Confianza promedio
          </p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {(analysis.overallAvgConfidence * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Detecciones totales
          </p>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {analysis.totalDetections}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Consenso modelos
          </p>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {analysis.consensusRate.toFixed(0)}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tendencia
          </p>
          <p className={`text-lg font-black mt-1 ${trendInfo.color}`}>
            {trendInfo.text}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-slate-800 text-lg">
            Distribución de Diagnósticos
          </h2>
          {sortedDiseases.length === 0 ? (
            <p className="text-slate-400 text-sm">Sin datos clasificados</p>
          ) : (
            <div className="space-y-4">
              {sortedDiseases.map(([cls, stats]) => {
                const pct = (
                  (stats.count / analysis.withClassification) *
                  100
                ).toFixed(1);
                return (
                  <div
                    key={cls}
                    className={`rounded-lg border p-4 ${classBorder(cls)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${classBadge(cls)}`}
                      >
                        {dn(cls)}
                      </span>
                      <span className="text-sm font-bold text-slate-700 tabular-nums">
                        {stats.count} muestras ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/80 overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full ${classColor(cls)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-medium">
                          Confianza prom.
                        </p>
                        <p className="text-sm font-bold text-slate-700 tabular-nums">
                          {(stats.avgConfidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-medium">
                          Prom. detecciones
                        </p>
                        <p className="text-sm font-bold text-slate-700 tabular-nums">
                          {stats.avgDetections.toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-medium">
                          Consenso
                        </p>
                        <p className="text-sm font-bold text-slate-700 tabular-nums">
                          {stats.count > 0
                            ? (
                                (stats.consensusCount / stats.count) *
                                100
                              ).toFixed(0)
                            : 0}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detections summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-slate-800 text-lg">
            Resumen de Detecciones por Imagen
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">
                Imágenes con lesiones de blight
              </span>
              <span className="font-bold text-slate-800">
                {analysis.blightDetected} / {analysis.total}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-red-400"
                style={{
                  width: `${analysis.total > 0 ? (analysis.blightDetected / analysis.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">
              Promedio de detecciones por imagen
            </span>
            <span className="font-bold text-slate-800">
              {analysis.avgDetectionsPerImage.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">
              Sin clasificación completa
            </span>
            <span className="font-bold text-slate-800">
              {analysis.withoutClassification}
            </span>
          </div>

          {analysis.recentDiseaseClass && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Última evaluación clasificada
              </p>
              <span
                className={`text-sm font-bold px-3 py-1 rounded-full ${classBadge(analysis.recentDiseaseClass)}`}
              >
                {dn(analysis.recentDiseaseClass)}
              </span>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Guía rápida de enfermedades
            </p>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                <p className="font-bold text-red-800 mb-1">
                  Tizón Tardío (Phytophthora infestans)
                </p>
                <p>
                  Manchas oscuras acuosas en hojas y tallos. Se propaga
                  rápidamente en condiciones húmedas (humedad {">"}90%) y
                  temperaturas frescas (15-22°C). Puede destruir un campo
                  entero en 7-10 días sin tratamiento.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                <p className="font-bold text-amber-800 mb-1">
                  Tizón Temprano (Alternaria solani)
                </p>
                <p>
                  Manchas concéntricas marrones en hojas inferiores. Progresa
                  más lento que el Tizón Tardío. Favorecido por estrés hídrico
                  y deficiencias nutricionales. Afecta rendimiento si no se
                  controla.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-xl">
            Recomendaciones para el Agricultor
          </h2>
          <a
            href="/dashboard/diagnosis-history"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
          >
            Ver historial guardado
          </a>
        </div>
        <div className="space-y-3">
          {recommendations.map((rec, i) => {
            const style = SEVERITY_STYLES[rec.severity];
            return (
              <div
                key={i}
                className={`rounded-xl border p-5 ${style.bg} ${style.border}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{style.icon}</span>
                  <div>
                    <h3 className={`font-bold ${style.text}`}>{rec.title}</h3>
                    <p className={`text-sm mt-1 ${style.text} opacity-80`}>
                      {rec.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan de acción */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 text-lg mb-4">
          Plan de Acción Recomendado
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2">
              Inmediato (0-48h)
            </p>
            <ul className="text-sm text-red-800 space-y-1.5">
              {analysis.severityScore > 30 ? (
                <>
                  <li>• Inspección visual de todo el campo</li>
                  <li>• Aplicación de fungicida sistémico</li>
                  <li>• Retiro de plantas severamente afectadas</li>
                  <li>• Documentar áreas con mayor infección</li>
                </>
              ) : (
                <>
                  <li>• Inspección de rutina del campo</li>
                  <li>• Verificar sistema de riego</li>
                  <li>• Registro fotográfico de plantas</li>
                </>
              )}
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">
              Corto plazo (1-2 semanas)
            </p>
            <ul className="text-sm text-amber-800 space-y-1.5">
              {analysis.severityScore > 30 ? (
                <>
                  <li>• Repetir aplicación de fungicida</li>
                  <li>• Análisis de suelo y nutrientes</li>
                  <li>• Mejorar drenaje si es necesario</li>
                  <li>• Consultar con un agrónomo</li>
                </>
              ) : (
                <>
                  <li>• Aplicación preventiva de fungicida</li>
                  <li>• Fertilización balanceada (NPK)</li>
                  <li>• Aporque de plantas</li>
                </>
              )}
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-xs font-bold uppercase tracking-wider text-green-600 mb-2">
              Mediano plazo (1 mes+)
            </p>
            <ul className="text-sm text-green-800 space-y-1.5">
              <li>• Continuar monitoreo con la app</li>
              <li>• Planificar rotación de cultivos</li>
              <li>• Evaluar variedades resistentes</li>
              <li>• Mantener registros de tratamientos</li>
              <li>• Capacitación en manejo integrado</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
