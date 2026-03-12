"use client";

import { useState, useRef, useEffect } from "react";
import { evaluationImage, getPeriodos } from "@/service/evaluation";
import {
  MultiModelEvaluationResult,
  ModelResult,
  Periodo,
} from "@/types/evaluation";

const MODEL_DISPLAY: Record<string, { label: string; color: string }> = {
  efficient: { label: "EfficientNet", color: "emerald" },
  resnet: { label: "ResNet", color: "blue" },
  mobilevit: { label: "MobileViT", color: "violet" },
};

const getModelMeta = (key: string) =>
  MODEL_DISPLAY[key] || { label: key, color: "slate" };

const getDiseaseName = (className: string): string => {
  const names: Record<string, string> = {
    Potato___Early_blight: "Tizon Temprano",
    Potato___Late_blight: "Tizon Tardio",
    Potato___healthy: "Saludable",
  };
  return names[className] || className;
};

const getDiseaseColor = (className: string): string => {
  if (className.includes("healthy")) return "green";
  if (className.includes("Early")) return "yellow";
  return "red";
};

const getBarColor = (className: string): string => {
  if (className.includes("healthy")) return "bg-green-600";
  if (className.includes("Early")) return "bg-yellow-500";
  return "bg-red-600";
};

const getBorderStyle = (className: string): string => {
  if (className.includes("healthy")) return "border-green-300 bg-green-50";
  if (className.includes("Early")) return "border-yellow-300 bg-yellow-50";
  return "border-red-300 bg-red-50";
};

export default function EvaluationPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<MultiModelEvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(
    null,
  );
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // load periodos once when component mounts
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingPeriodos(true);
        const resp = await getPeriodos();
        setPeriodos(resp.data || []);
      } catch (err) {
        console.error("Error cargando periodos", err);
      } finally {
        setLoadingPeriodos(false);
      }
    };
    load();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPeriodoId(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona un archivo de imagen valido");
      return;
    }

    setSelectedImage(file);
    setError("");
    setResult(null);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      setError("Por favor selecciona una imagen primero");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await evaluationImage(
        selectedImage,
        selectedPeriodoId ?? undefined,
      );
      setResult(response.data.clasificacion);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Error al evaluar la imagen. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreview(null);
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const winner = result ? result.resultados[result.mejor_modelo_global] : null;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Evaluacion de Imagenes
        </h1>
        <p className="text-gray-600">
          Sube una imagen de una hoja de papa para detectar enfermedades con 3
          modelos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel izquierdo */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Seleccionar Imagen
          </h2>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              preview
                ? "border-green-300 bg-green-50"
                : "border-gray-300 hover:border-green-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {preview ? (
              <div className="space-y-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg shadow-md"
                />
                <p className="text-sm text-gray-600">{selectedImage?.name}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Cambiar imagen
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <p className="text-gray-700 font-medium">
                    Haz clic para seleccionar una imagen
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    PNG, JPG, JPEG o WEBP hasta 10 MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Periodo selector */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periodo (opcional)
            </label>
            {loadingPeriodos ? (
              <p className="text-sm text-gray-500">Cargando periodos...</p>
            ) : periodos.length > 0 ? (
              <select
                value={selectedPeriodoId ?? ""}
                onChange={(e) =>
                  setSelectedPeriodoId(
                    e.target.value ? parseInt(e.target.value) : null,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Sin periodo</option>
                {periodos.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.nombre} ({p.fecha_inicio} – {p.fecha_fin})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500">
                No hay periodos disponibles
              </p>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={!selectedImage || loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Evaluando con 3 modelos...
                </>
              ) : (
                "Evaluar Imagen"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Resultados de la Evaluacion
          </h2>

          {result && winner ? (
            <div className="space-y-6">
              {/* Resultado ganador */}
              <div
                className={`p-5 rounded-xl border-2 ${getBorderStyle(winner.clase_predicha)}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {winner.clase_predicha.includes("healthy") ? (
                    <svg
                      className="w-7 h-7 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-7 h-7 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  )}
                  <h3 className="text-xl font-bold text-slate-800">
                    {getDiseaseName(winner.clase_predicha)}
                  </h3>
                </div>

                <p className="text-sm text-slate-600 mt-1">
                  Modelo ganador:{" "}
                  <span className="font-semibold">
                    {getModelMeta(result.mejor_modelo_global).label}
                  </span>{" "}
                  &mdash; {(winner.confianza * 100).toFixed(2)}% confianza
                </p>

                {result.resumen_comparativo.consenso && (
                  <span className="inline-block mt-2 text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    Los 3 modelos coinciden
                  </span>
                )}

                <div className="w-full bg-slate-200 rounded-full h-2.5 mt-3">
                  <div
                    className={`h-2.5 rounded-full ${getBarColor(winner.clase_predicha)}`}
                    style={{ width: `${winner.confianza * 100}%` }}
                  />
                </div>
              </div>

              {/* Predicciones del modelo ganador */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Predicciones ({getModelMeta(result.mejor_modelo_global).label}
                  )
                </h4>
                <div className="space-y-2">
                  {Object.entries(winner.todas_predicciones)
                    .sort(([, a], [, b]) => b - a)
                    .map(([className, confidence]) => (
                      <div
                        key={className}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <span className="text-sm font-medium text-slate-700">
                          {getDiseaseName(className)}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                getDiseaseColor(className) === "green"
                                  ? "bg-green-600"
                                  : getDiseaseColor(className) === "yellow"
                                    ? "bg-yellow-500"
                                    : "bg-red-600"
                              }`}
                              style={{ width: `${confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-800 w-16 text-right">
                            {(confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Comparativa de los 3 modelos */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Comparativa de Modelos
                </h4>
                <div className="space-y-3">
                  {Object.entries(result.resultados)
                    .sort(([a], [b]) => {
                      if (a === result.mejor_modelo_global) return -1;
                      if (b === result.mejor_modelo_global) return 1;
                      return 0;
                    })
                    .map(([key, model]: [string, ModelResult]) => {
                      const meta = getModelMeta(key);
                      const isBest = key === result.mejor_modelo_global;

                      return (
                        <div
                          key={key}
                          className={`p-4 rounded-lg border ${
                            isBest
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">
                                {meta.label}
                              </span>
                              {isBest && (
                                <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                                  MEJOR
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-slate-700">
                              {(model.confianza * 100).toFixed(1)}%
                            </span>
                          </div>

                          <p className="text-sm text-slate-600 mb-2">
                            {getDiseaseName(model.clase_predicha)}
                          </p>

                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getBarColor(model.clase_predicha)}`}
                              style={{ width: `${model.confianza * 100}%` }}
                            />
                          </div>

                          {/* Métricas de entrenamiento */}
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            {(
                              [
                                [
                                  "Accuracy",
                                  model.metricas_entrenamiento.accuracy,
                                ],
                                [
                                  "Precision",
                                  model.metricas_entrenamiento.precision,
                                ],
                                ["Recall", model.metricas_entrenamiento.recall],
                                [
                                  "F1-Score",
                                  model.metricas_entrenamiento.f1_score,
                                ],
                              ] as [string, number][]
                            ).map(([label, val]) => (
                              <div
                                key={label}
                                className="text-center bg-white rounded-md px-2 py-1.5"
                              >
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                  {label}
                                </p>
                                <p className="text-sm font-bold text-slate-700">
                                  {(val * 100).toFixed(1)}%
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Nueva Evaluacion
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>
                Los resultados apareceran aqui despues de evaluar una imagen
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
