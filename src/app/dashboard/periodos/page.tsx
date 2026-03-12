"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createPeriodo,
  getPeriodos,
  getPredictionsByPeriodo,
} from "@/service/evaluation";
import { Periodo, PrediccionRecord } from "@/types/evaluation";

type DiseaseStats = Record<string, number>;

type EvolutionPoint = {
  periodoId: number;
  periodoNombre: string;
  total: number;
  avgConfidence: number;
  detections: number;
  classCounts: DiseaseStats;
};

type DetectionFilter = "all" | "with" | "without";

const DISEASE_LABELS: Record<string, string> = {
  Potato___Early_blight: "Tizon temprano",
  Potato___Late_blight: "Tizon tardio",
  Potato___healthy: "Saludable",
  "Sin clasificar": "Sin clasificar",
};

const DISEASE_COLORS: Record<string, string> = {
  Potato___Early_blight: "#f59e0b",
  Potato___Late_blight: "#dc2626",
  Potato___healthy: "#16a34a",
  "Sin clasificar": "#334155",
};

function diseaseName(key: string): string {
  return DISEASE_LABELS[key] ?? key;
}

function diseaseColor(key: string): string {
  return DISEASE_COLORS[key] ?? "#2563eb";
}

function formatDate(date: string): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: string): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function confidenceClass(confidence: number): string {
  if (confidence >= 0.75) return "bg-emerald-100 text-emerald-700";
  if (confidence >= 0.5) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function normalizeClass(cls?: string | null): string {
  return cls ?? "Sin clasificar";
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export default function PeriodosPage() {
  const router = useRouter();
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadingEvolution, setLoadingEvolution] = useState(false);

  const [selectedPeriodo, setSelectedPeriodo] = useState<Periodo | null>(null);
  const [predictions, setPredictions] = useState<PrediccionRecord[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  const [periodSearch, setPeriodSearch] = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState<string>("all");
  const [detectionFilter, setDetectionFilter] =
    useState<DetectionFilter>("all");
  const [confidenceMin, setConfidenceMin] = useState<number>(0);
  const [searchPrediction, setSearchPrediction] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    fecha_inicio: "",
    fecha_fin: "",
    descripcion: "",
  });

  const [evolution, setEvolution] = useState<EvolutionPoint[]>([]);

  const loadPeriodos = async () => {
    try {
      setLoading(true);
      const resp = await getPeriodos();
      setPeriodos(resp.data || []);
    } catch {
      toast.error("No se pudieron cargar los periodos");
    } finally {
      setLoading(false);
    }
  };

  const loadEvolution = async (items: Periodo[]) => {
    if (items.length === 0) {
      setEvolution([]);
      return;
    }

    setLoadingEvolution(true);
    try {
      const sorted = [...items].sort(
        (a, b) =>
          new Date(a.fecha_inicio).getTime() -
          new Date(b.fecha_inicio).getTime(),
      );
      const entries = await Promise.all(
        sorted.map(async (periodo) => {
          const resp = await getPredictionsByPeriodo(periodo.id);
          const list = resp.data || [];
          const classCounts: DiseaseStats = {};
          let confidenceSum = 0;
          let confidenceCount = 0;
          let detections = 0;

          list.forEach((p) => {
            const cls = normalizeClass(p.fase2_resumen?.clase_predicha);
            classCounts[cls] = (classCounts[cls] ?? 0) + 1;
            const conf = p.fase2_resumen?.confianza;
            if (typeof conf === "number") {
              confidenceSum += conf;
              confidenceCount += 1;
            }
            if (p.fase1_resumen?.has_matches) {
              detections += 1;
            }
          });

          const avgConfidence =
            confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

          return {
            periodoId: periodo.id,
            periodoNombre: periodo.nombre,
            total: list.length,
            avgConfidence,
            detections,
            classCounts,
          } as EvolutionPoint;
        }),
      );

      setEvolution(entries);
    } catch {
      toast.error("No se pudo generar la evolucion por periodos");
    } finally {
      setLoadingEvolution(false);
    }
  };

  const loadPredictionsForPeriod = async (periodo: Periodo) => {
    try {
      setLoadingPredictions(true);
      const resp = await getPredictionsByPeriodo(periodo.id);
      setPredictions(resp.data || []);
      setSelectedPeriodo(periodo);
    } catch {
      toast.error("No se pudieron cargar las predicciones del periodo");
    } finally {
      setLoadingPredictions(false);
    }
  };

  useEffect(() => {
    loadPeriodos();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadEvolution(periodos);
    }
  }, [loading, periodos]);

  const sortedPeriods = useMemo(() => {
    return [...periodos].sort(
      (a, b) =>
        new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime(),
    );
  }, [periodos]);

  const filteredPeriods = useMemo(() => {
    const query = periodSearch.trim().toLowerCase();
    if (!query) return sortedPeriods;
    return sortedPeriods.filter((p) => {
      return (
        p.nombre.toLowerCase().includes(query) ||
        (p.descripcion ?? "").toLowerCase().includes(query)
      );
    });
  }, [periodSearch, sortedPeriods]);

  const allClasses = useMemo(() => {
    const set = new Set<string>();
    evolution.forEach((e) => {
      Object.keys(e.classCounts).forEach((key) => set.add(key));
    });
    predictions.forEach((p) => {
      set.add(normalizeClass(p.fase2_resumen?.clase_predicha));
    });
    return Array.from(set);
  }, [evolution, predictions]);

  const classSeries = useMemo(() => {
    return allClasses.map((cls) => {
      const values = evolution.map((item) => item.classCounts[cls] ?? 0);
      return { cls, values };
    });
  }, [allClasses, evolution]);

  const maxClassValue = useMemo(() => {
    let max = 1;
    classSeries.forEach((series) => {
      series.values.forEach((value) => {
        if (value > max) max = value;
      });
    });
    return max;
  }, [classSeries]);

  const periodTotals = useMemo(() => {
    return evolution.reduce(
      (acc, item) => {
        acc.totalPredictions += item.total;
        acc.totalDetections += item.detections;
        acc.avgConfidenceWeighted += item.avgConfidence * item.total;
        acc.samples += item.total;
        return acc;
      },
      {
        totalPredictions: 0,
        totalDetections: 0,
        avgConfidenceWeighted: 0,
        samples: 0,
      },
    );
  }, [evolution]);

  const overallAvgConfidence = useMemo(() => {
    if (periodTotals.samples === 0) return 0;
    return periodTotals.avgConfidenceWeighted / periodTotals.samples;
  }, [periodTotals]);

  const filteredPredictions = useMemo(() => {
    const query = searchPrediction.trim().toLowerCase();
    return predictions.filter((p) => {
      const diagnosis = normalizeClass(p.fase2_resumen?.clase_predicha);
      const conf = p.fase2_resumen?.confianza ?? 0;
      const hasDetections = Boolean(p.fase1_resumen?.has_matches);
      const idMatches = query.length === 0 || `${p.id}`.includes(query);
      const diagnosisMatches =
        diagnosisFilter === "all" || diagnosis === diagnosisFilter;
      const confidenceMatches = conf >= confidenceMin / 100;
      const detectionMatches =
        detectionFilter === "all" ||
        (detectionFilter === "with" && hasDetections) ||
        (detectionFilter === "without" && !hasDetections);

      return (
        idMatches && diagnosisMatches && confidenceMatches && detectionMatches
      );
    });
  }, [
    predictions,
    searchPrediction,
    diagnosisFilter,
    confidenceMin,
    detectionFilter,
  ]);

  const predictionSummary = useMemo(() => {
    const summary: DiseaseStats = {};
    let totalConfidence = 0;
    let confidenceCount = 0;
    let detections = 0;

    filteredPredictions.forEach((p) => {
      const diagnosis = normalizeClass(p.fase2_resumen?.clase_predicha);
      summary[diagnosis] = (summary[diagnosis] ?? 0) + 1;
      const conf = p.fase2_resumen?.confianza;
      if (typeof conf === "number") {
        totalConfidence += conf;
        confidenceCount += 1;
      }
      if (p.fase1_resumen?.has_matches) detections += 1;
    });

    return {
      summary,
      detections,
      total: filteredPredictions.length,
      avgConfidence:
        confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
    };
  }, [filteredPredictions]);

  const confidencePoints = useMemo(() => {
    return filteredPredictions
      .slice()
      .sort(
        (a, b) =>
          new Date(a.fecha ?? a.created_at).getTime() -
          new Date(b.fecha ?? b.created_at).getTime(),
      )
      .map((p) => p.fase2_resumen?.confianza ?? 0);
  }, [filteredPredictions]);

  const maxClassCountFiltered = useMemo(() => {
    let max = 1;
    Object.values(predictionSummary.summary).forEach((v) => {
      if (v > max) max = v;
    });
    return max;
  }, [predictionSummary]);

  const detectionRate = useMemo(() => {
    if (predictionSummary.total === 0) return 0;
    return predictionSummary.detections / predictionSummary.total;
  }, [predictionSummary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre.trim() || !form.fecha_inicio || !form.fecha_fin) {
      toast.error("Nombre y rango de fechas son obligatorios");
      return;
    }

    if (
      new Date(form.fecha_inicio).getTime() > new Date(form.fecha_fin).getTime()
    ) {
      toast.error("La fecha de inicio no puede ser mayor que la fecha fin");
      return;
    }

    try {
      setCreating(true);
      await createPeriodo(
        form.nombre.trim(),
        form.fecha_inicio,
        form.fecha_fin,
        form.descripcion.trim() || undefined,
      );
      toast.success("Periodo creado correctamente");
      setForm({ nombre: "", fecha_inicio: "", fecha_fin: "", descripcion: "" });
      await loadPeriodos();
    } catch {
      toast.error("No se pudo crear el periodo");
    } finally {
      setCreating(false);
    }
  };

  const Hero = (
    <section className="rounded-3xl p-6 md:p-8 bg-linear-to-br from-slate-900 via-sky-900 to-cyan-700 text-white shadow-xl">
      <p className="text-cyan-200 text-sm tracking-[0.18em] uppercase font-semibold">
        Periodos
      </p>
      <h1 className="text-3xl md:text-4xl font-black mt-1">
        Gestor de periodos y evolucion
      </h1>
      <p className="text-cyan-100 mt-3 max-w-3xl">
        Revisa tendencias por periodo, abre las predicciones y filtra resultados
        para analizar confianza, detecciones y clases de enfermedad.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-4">
          <p className="text-cyan-100 text-sm">Total periodos</p>
          <p className="text-3xl font-black mt-1">{periodos.length}</p>
        </div>
        <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-4">
          <p className="text-cyan-100 text-sm">Predicciones registradas</p>
          <p className="text-3xl font-black mt-1">
            {periodTotals.totalPredictions}
          </p>
        </div>
        <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-4">
          <p className="text-cyan-100 text-sm">Confianza promedio</p>
          <p className="text-3xl font-black mt-1">
            {(overallAvgConfidence * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </section>
  );

  if (selectedPeriodo) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {Hero}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <button
                onClick={() => {
                  setSelectedPeriodo(null);
                  setPredictions([]);
                }}
                className="text-sky-700 font-semibold hover:text-sky-900"
              >
                Volver a periodos
              </button>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                Predicciones de {selectedPeriodo.nombre}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Del {formatDate(selectedPeriodo.fecha_inicio)} al{" "}
                {formatDate(selectedPeriodo.fecha_fin)}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
              <input
                value={searchPrediction}
                onChange={(e) => setSearchPrediction(e.target.value)}
                className="col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Buscar por ID"
              />
              <select
                value={diagnosisFilter}
                onChange={(e) => setDiagnosisFilter(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">Todas las clases</option>
                {allClasses.map((cls) => (
                  <option
                    key={cls}
                    value={cls}
                  >
                    {diseaseName(cls)}
                  </option>
                ))}
              </select>
              <select
                value={detectionFilter}
                onChange={(e) =>
                  setDetectionFilter(e.target.value as DetectionFilter)
                }
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">Con y sin detecciones</option>
                <option value="with">Solo con detecciones</option>
                <option value="without">Solo sin detecciones</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold text-slate-700">
              Confianza minima: {confidenceMin}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={confidenceMin}
              onChange={(e) => setConfidenceMin(Number(e.target.value))}
              className="w-full mt-2"
            />
          </div>
        </section>

        {loadingPredictions ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-slate-600">
            Cargando predicciones del periodo...
          </section>
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Filtradas
                </p>
                <p className="text-3xl font-black text-slate-900 mt-2">
                  {predictionSummary.total}
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Detecciones
                </p>
                <p className="text-3xl font-black text-slate-900 mt-2">
                  {predictionSummary.detections}
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Ratio deteccion
                </p>
                <p className="text-3xl font-black text-slate-900 mt-2">
                  {(detectionRate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  Confianza promedio
                </p>
                <p className="text-3xl font-black text-slate-900 mt-2">
                  {(predictionSummary.avgConfidence * 100).toFixed(1)}%
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <article className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  Tendencia de confianza
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Serie temporal de las predicciones filtradas
                </p>
                <div className="mt-5 h-56">
                  <svg
                    viewBox="0 0 800 220"
                    className="w-full h-full"
                  >
                    <defs>
                      <linearGradient
                        id="confidenceGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#0ea5e9"
                          stopOpacity="0.32"
                        />
                        <stop
                          offset="100%"
                          stopColor="#0ea5e9"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <rect
                      x={0}
                      y={0}
                      width={800}
                      height={220}
                      fill="#f8fafc"
                      rx={16}
                    />
                    {[0, 25, 50, 75, 100].map((tick) => (
                      <g key={tick}>
                        <line
                          x1={40}
                          y1={200 - tick * 1.6}
                          x2={780}
                          y2={200 - tick * 1.6}
                          stroke="#e2e8f0"
                        />
                        <text
                          x={10}
                          y={204 - tick * 1.6}
                          fontSize={11}
                          fill="#64748b"
                        >
                          {tick}%
                        </text>
                      </g>
                    ))}
                    {confidencePoints.length > 0 && (
                      <>
                        <polygon
                          points={[
                            ...confidencePoints.map((value, index) => {
                              const x =
                                confidencePoints.length === 1
                                  ? 410
                                  : 40 +
                                    (index / (confidencePoints.length - 1)) *
                                      740;
                              const y = 200 - value * 160;
                              return `${x.toFixed(2)},${y.toFixed(2)}`;
                            }),
                            "780,200",
                            "40,200",
                          ].join(" ")}
                          fill="url(#confidenceGradient)"
                        />
                        <polyline
                          points={confidencePoints
                            .map((value, index) => {
                              const x =
                                confidencePoints.length === 1
                                  ? 410
                                  : 40 +
                                    (index / (confidencePoints.length - 1)) *
                                      740;
                              const y = 200 - value * 160;
                              return `${x.toFixed(2)},${y.toFixed(2)}`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth={3}
                        />
                      </>
                    )}
                  </svg>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  Ratio de deteccion
                </h3>
                <div className="mt-5 flex items-center justify-center">
                  <svg
                    viewBox="0 0 220 220"
                    className="w-48 h-48"
                  >
                    <circle
                      cx={110}
                      cy={110}
                      r={78}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth={24}
                    />
                    <circle
                      cx={110}
                      cy={110}
                      r={78}
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth={24}
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 78}`}
                      strokeDashoffset={`${2 * Math.PI * 78 * (1 - detectionRate)}`}
                      transform="rotate(-90 110 110)"
                    />
                    <text
                      x={110}
                      y={106}
                      textAnchor="middle"
                      className="fill-slate-900 text-3xl font-black"
                    >
                      {(detectionRate * 100).toFixed(0)}%
                    </text>
                    <text
                      x={110}
                      y={130}
                      textAnchor="middle"
                      className="fill-slate-500 text-sm"
                    >
                      con detecciones
                    </text>
                  </svg>
                </div>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                Distribucion por clase
              </h3>
              <div className="mt-4 space-y-3">
                {Object.entries(predictionSummary.summary).length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay datos con los filtros actuales.
                  </p>
                ) : (
                  Object.entries(predictionSummary.summary)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cls, count]) => {
                      const percent =
                        (count / Math.max(predictionSummary.total, 1)) * 100;
                      return (
                        <div key={cls}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-700">
                              {diseaseName(cls)}
                            </span>
                            <span className="text-slate-500">
                              {count} ({percent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${clampPercent((count / maxClassCountFiltered) * 100)}%`,
                                backgroundColor: diseaseColor(cls),
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPredictions.map((pred) => {
                const diagnosis = normalizeClass(
                  pred.fase2_resumen?.clase_predicha,
                );
                const confidence = pred.fase2_resumen?.confianza ?? 0;
                const hasMatches = Boolean(pred.fase1_resumen?.has_matches);

                return (
                  <article
                    key={pred.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    <div className="relative h-40 bg-slate-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pred.imagen_url}
                        alt={`Prediccion ${pred.id}`}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        crossOrigin="anonymous"
                      />
                      <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
                        #{pred.id}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-xs text-slate-400">
                        {formatDateTime(pred.fecha ?? pred.created_at)}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: diseaseColor(diagnosis) }}
                        >
                          {diseaseName(diagnosis)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${confidenceClass(confidence)}`}
                        >
                          {(confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${clampPercent(confidence * 100)}%`,
                            backgroundColor: diseaseColor(diagnosis),
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        {hasMatches
                          ? "Con detecciones en fase 1"
                          : "Sin detecciones en fase 1"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {Hero}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Crear nuevo periodo
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Formulario optimizado para registrar periodos rapidamente.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Nombre del periodo
              </label>
              <input
                value={form.nombre}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, nombre: e.target.value }))
                }
                placeholder="Ejemplo: Periodo 2026-I"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Descripcion breve
              </label>
              <input
                value={form.descripcion}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                placeholder="Objetivo, clima, zona o notas"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Fecha inicio
              </label>
              <input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Fecha fin
              </label>
              <input
                type="date"
                value={form.fecha_fin}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fecha_fin: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2.5 disabled:opacity-60"
            >
              {creating ? "Creando..." : "Crear periodo"}
            </button>
            <button
              type="button"
              className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5"
              onClick={() => {
                setForm({
                  nombre: `Periodo ${new Date().getFullYear()}-${periodos.length + 1}`,
                  fecha_inicio: "",
                  fecha_fin: "",
                  descripcion: "Periodo generado con plantilla rapida",
                });
              }}
            >
              Plantilla rapida
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Periodos registrados
            </h2>
            <p className="text-sm text-slate-500">
              Haz clic en un periodo para abrir sus predicciones y análisis
              avanzado.
            </p>
          </div>
          <input
            value={periodSearch}
            onChange={(e) => setPeriodSearch(e.target.value)}
            placeholder="Filtrar por nombre o descripcion"
            className="w-full md:w-80 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {loading ? (
          <p className="text-slate-500">Cargando periodos...</p>
        ) : filteredPeriods.length === 0 ? (
          <p className="text-slate-500">
            No se encontraron periodos con ese filtro.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPeriods.map((p) => {
              const evo = evolution.find((item) => item.periodoId === p.id);
              const total = evo?.total ?? 0;
              const confidence = evo?.avgConfidence ?? 0;
              const detections = evo?.detections ?? 0;
              const detectionPct = total > 0 ? (detections / total) * 100 : 0;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm hover:shadow-lg transition-all flex flex-col"
                >
                  <p className="text-xs uppercase tracking-wider text-sky-700 font-semibold">
                    Periodo #{p.id}
                  </p>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    {p.nombre}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDate(p.fecha_inicio)} — {formatDate(p.fecha_fin)}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="rounded-xl bg-white border border-slate-200 p-2">
                      <p className="text-[11px] text-slate-500">Pred.</p>
                      <p className="font-black text-slate-900">{total}</p>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 p-2">
                      <p className="text-[11px] text-slate-500">Detec.</p>
                      <p className="font-black text-slate-900">{detections}</p>
                    </div>
                    <div className="rounded-xl bg-white border border-slate-200 p-2">
                      <p className="text-[11px] text-slate-500">Conf.</p>
                      <p className="font-black text-slate-900">
                        {(confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${clampPercent(detectionPct)}%` }}
                    />
                  </div>
                  {/* Acciones */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => loadPredictionsForPeriod(p)}
                      className="flex-1 text-sm font-semibold text-sky-700 border border-sky-200 rounded-lg py-1.5 hover:bg-sky-50 transition-colors"
                    >
                      Ver predicciones
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/periodos/${p.id}`)}
                      className="flex-1 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg py-1.5 transition-colors"
                    >
                      Diagnóstico →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Evolucion entre periodos
            </h2>
            <p className="text-sm text-slate-500">
              Comparativa avanzada de clases y volumen de predicciones por
              periodo.
            </p>
          </div>
          {loadingEvolution && (
            <p className="text-sm text-slate-500">Actualizando...</p>
          )}
        </div>

        {evolution.length === 0 ? (
          <p className="text-sm text-slate-500 mt-4">
            Aun no hay datos para graficar.
          </p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
            <article className="xl:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-800">
                Tendencia de enfermedades por periodo
              </h3>
              <div className="mt-3 h-72">
                <svg
                  viewBox="0 0 900 320"
                  className="w-full h-full"
                >
                  <rect
                    x={0}
                    y={0}
                    width={900}
                    height={320}
                    rx={16}
                    fill="#f8fafc"
                  />
                  {[0, 25, 50, 75, 100].map((tick) => (
                    <g key={tick}>
                      <line
                        x1={50}
                        y1={280 - tick * 2.3}
                        x2={860}
                        y2={280 - tick * 2.3}
                        stroke="#e2e8f0"
                      />
                      <text
                        x={16}
                        y={284 - tick * 2.3}
                        fontSize={11}
                        fill="#64748b"
                      >
                        {Math.round((tick / 100) * maxClassValue)}
                      </text>
                    </g>
                  ))}

                  {classSeries.map((series) => {
                    const points = series.values.map((value, index) => {
                      const x =
                        classSeries.length > 0 && evolution.length > 1
                          ? 60 + (index / (evolution.length - 1)) * 780
                          : 450;
                      const y =
                        280 - (value / Math.max(maxClassValue, 1)) * 230;
                      return `${x.toFixed(2)},${y.toFixed(2)}`;
                    });

                    return (
                      <g key={series.cls}>
                        <polyline
                          points={points.join(" ")}
                          fill="none"
                          stroke={diseaseColor(series.cls)}
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {points.map((point, idx) => {
                          const [x, y] = point.split(",").map(Number);
                          return (
                            <circle
                              key={`${series.cls}-${idx}`}
                              cx={x}
                              cy={y}
                              r={3.6}
                              fill={diseaseColor(series.cls)}
                            />
                          );
                        })}
                      </g>
                    );
                  })}

                  {evolution.map((item, idx) => {
                    const x =
                      evolution.length > 1
                        ? 60 + (idx / (evolution.length - 1)) * 780
                        : 450;
                    const label =
                      item.periodoNombre.length > 12
                        ? `${item.periodoNombre.slice(0, 12)}...`
                        : item.periodoNombre;
                    return (
                      <text
                        key={item.periodoId}
                        x={x}
                        y={304}
                        textAnchor="middle"
                        fontSize={11}
                        fill="#475569"
                      >
                        {label}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-800">Resumen por periodo</h3>
              <div className="mt-3 space-y-3">
                {evolution.map((item) => {
                  const pct =
                    periodTotals.totalPredictions > 0
                      ? (item.total / periodTotals.totalPredictions) * 100
                      : 0;
                  return (
                    <div
                      key={item.periodoId}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-800 text-sm">
                          {item.periodoNombre}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.total} pred.
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full"
                          style={{ width: `${clampPercent(pct)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Confianza: {(item.avgConfidence * 100).toFixed(1)}% |
                        Detecciones: {item.detections}
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>
        )}
      </section>
    </div>
  );
}
