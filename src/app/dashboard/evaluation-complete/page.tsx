"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  evaluationImage,
  evaluationRoboflow,
  getSurcos,
  getPeriodos,
} from "@/service/evaluation";
import { evaluarSurco } from "@/service/hierarchy";
import {
  MultiModelEvaluationResult,
  ModelResult,
  RoboflowDetection,
  RoboflowPrediction,
  Surco,
  Periodo,
} from "@/types/evaluation";

type LoadingStep = "idle" | "step1" | "step2";

type RenderBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
};

const ZOOM_OPTIONS = [1, 2, 3, 4] as const;

const STORAGE_KEY_IMAGE = "evaluation-pending-image";
const STORAGE_KEY_FILENAME = "evaluation-pending-filename";
const STORAGE_KEY_TYPE = "evaluation-pending-type";

function dataUrlToFile(
  dataUrl: string,
  filename: string,
  mimeType: string,
): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || mimeType || "image/jpeg";
  const bstr = atob(arr[1] || "");
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([new Blob([u8arr], { type: mime })], filename, {
    type: mime,
  });
}

export default function EvaluationCompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const moduloId = searchParams.get("moduloId");
  const loteId = searchParams.get("loteId");
  const surcoIdParam = searchParams.get("surcoId");
  const hasHierarchyContext = Boolean(moduloId && loteId && surcoIdParam);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [roboflowResult, setRoboflowResult] =
    useState<RoboflowDetection | null>(null);
  const [classificationResult, setClassificationResult] =
    useState<MultiModelEvaluationResult | null>(null);
  const [roboflowMessage, setRoboflowMessage] = useState<string>("");
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("idle");
  const [error, setError] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState<(typeof ZOOM_OPTIONS)[number]>(1);
  const [surcos, setSurcos] = useState<Surco[]>([]);
  const [selectedSurcoId, setSelectedSurcoId] = useState<number | null>(null);
  const [loadingSurcos, setLoadingSurcos] = useState<boolean>(true);

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(
    null,
  );
  const [loadingPeriodos, setLoadingPeriodos] = useState<boolean>(true);

  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Pre-cargar imagen y surco desde predicciones (sessionStorage + URL)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dataUrl = sessionStorage.getItem(STORAGE_KEY_IMAGE);
    const filename = sessionStorage.getItem(STORAGE_KEY_FILENAME);
    const mimeType = sessionStorage.getItem(STORAGE_KEY_TYPE) || "image/jpeg";
    if (dataUrl && filename) {
      setPreview(dataUrl);
      const file = dataUrlToFile(dataUrl, filename, mimeType);
      setSelectedImage(file);
      sessionStorage.removeItem(STORAGE_KEY_IMAGE);
      sessionStorage.removeItem(STORAGE_KEY_FILENAME);
      sessionStorage.removeItem(STORAGE_KEY_TYPE);
    }
    if (surcoIdParam) {
      setSelectedSurcoId(parseInt(surcoIdParam, 10));
    }
  }, [surcoIdParam]);

  // Load surcos on component mount (solo si no hay contexto de jerarquía)
  useEffect(() => {
    if (hasHierarchyContext) {
      setLoadingSurcos(false);
      return;
    }
    const loadSurcos = async () => {
      try {
        setLoadingSurcos(true);
        const response = await getSurcos();
        setSurcos(response.data || []);
        if (response.data && response.data.length > 0 && !surcoIdParam) {
          setSelectedSurcoId(response.data[0].id);
        }
      } catch (err) {
        console.error("Error loading surcos:", err);
        toast.error("No se pudieron cargar los surcos");
      } finally {
        setLoadingSurcos(false);
      }
    };
    loadSurcos();

    const loadPeriodos = async () => {
      try {
        setLoadingPeriodos(true);
        const resp = await getPeriodos();
        setPeriodos(resp.data || []);
        if (resp.data && resp.data.length > 0 && !surcoIdParam) {
          setSelectedPeriodoId(resp.data[0].id);
        }
      } catch (err) {
        console.error("Error loading periodos:", err);
        toast.error("No se pudieron cargar los periodos");
      } finally {
        setLoadingPeriodos(false);
      }
    };
    loadPeriodos();
  }, [hasHierarchyContext, surcoIdParam]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona un archivo de imagen valido");
      return;
    }

    setSelectedImage(file);
    setError("");
    setRoboflowResult(null);
    setClassificationResult(null);
    setRoboflowMessage("");

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const updateImageSize = () => {
    const img = imageRef.current;
    if (!img) {
      return;
    }
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setDisplaySize({ width: img.clientWidth, height: img.clientHeight });
  };

  useEffect(() => {
    const onResize = () => updateImageSize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [preview]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    // Center the zoomed content inside the scroll viewport.
    container.scrollLeft = Math.max(
      0,
      (container.scrollWidth - container.clientWidth) / 2,
    );
    container.scrollTop = Math.max(
      0,
      (container.scrollHeight - container.clientHeight) / 2,
    );
  }, [zoomLevel, displaySize.width, displaySize.height, preview]);

  const getBoxColor = (className: string): string => {
    const normalized = className.toLowerCase();
    if (normalized.includes("blight")) {
      return "#dc2626";
    }
    if (normalized.includes("leaf")) {
      return "#7c3aed";
    }
    return "#16a34a";
  };

  const renderBoxes: RenderBox[] = useMemo(() => {
    if (!roboflowResult || !roboflowResult.predictions.length) {
      return [];
    }

    if (
      !naturalSize.width ||
      !naturalSize.height ||
      !displaySize.width ||
      !displaySize.height
    ) {
      return [];
    }

    const scaleX = displaySize.width / naturalSize.width;
    const scaleY = displaySize.height / naturalSize.height;

    return roboflowResult.predictions.map((prediction: RoboflowPrediction) => ({
      left: (prediction.x - prediction.width / 2) * scaleX,
      top: (prediction.y - prediction.height / 2) * scaleY,
      width: prediction.width * scaleX,
      height: prediction.height * scaleY,
      label: prediction.class,
      confidence: prediction.confidence,
    }));
  }, [roboflowResult, naturalSize, displaySize]);

  const getDiseaseName = (className: string): string => {
    const names: { [key: string]: string } = {
      Potato___Early_blight: "Tizon Temprano",
      Potato___Late_blight: "Tizon Tardio",
      Potato___healthy: "Saludable",
    };
    return names[className] || className;
  };

  const getClassificationColor = (className: string): string => {
    if (className.includes("healthy")) return "bg-green-600";
    if (className.includes("Early")) return "bg-yellow-500";
    return "bg-red-600";
  };

  const getClassificationBorder = (className: string): string => {
    if (className.includes("healthy")) return "border-green-300 bg-green-50";
    if (className.includes("Early")) return "border-yellow-300 bg-yellow-50";
    return "border-red-300 bg-red-50";
  };

  const MODEL_DISPLAY: Record<string, { label: string; color: string }> = {
    efficient: { label: "EfficientNet", color: "emerald" },
    resnet: { label: "ResNet", color: "blue" },
    mobilevit: { label: "MobileViT", color: "violet" },
  };

  const getModelMeta = (key: string) =>
    MODEL_DISPLAY[key] || { label: key, color: "slate" };

  const formatApiError = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      const first = value[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object" && "msg" in first) {
        const msg = (first as { msg?: unknown }).msg;
        if (typeof msg === "string") return msg;
      }
      return null;
    }
    if (typeof value === "object" && "msg" in value) {
      const msg = (value as { msg?: unknown }).msg;
      if (typeof msg === "string") return msg;
    }
    return null;
  };

  const getErrorMessage = (err: any): string => {
    const status = err?.response?.status;
    if (status === 401) return "Sesion expirada. Inicia sesion nuevamente.";
    if (status === 413) return "La imagen supera el tamano maximo permitido.";
    if (status === 504)
      return "Roboflow no respondio a tiempo. Intenta otra vez.";
    if (status === 502)
      return "Error del servicio de deteccion. Intenta mas tarde.";

    const apiDetail = formatApiError(err?.response?.data?.detail);
    if (apiDetail) return apiDetail;

    const apiMessage = formatApiError(err?.response?.data?.message);
    if (apiMessage) return apiMessage;

    return "Error al evaluar la imagen. Intenta de nuevo.";
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      setError("Por favor selecciona una imagen primero");
      return;
    }

    setError("");
    setRoboflowResult(null);
    setClassificationResult(null);
    setRoboflowMessage("");

    // Flujo con jerarquía: usar evaluarSurco y redirigir al detalle
    if (hasHierarchyContext && moduloId && loteId && surcoIdParam) {
      try {
        setLoadingStep("step1");
        const res = await evaluarSurco(
          moduloId,
          loteId,
          surcoIdParam,
          selectedImage,
        );
        if (res.data) {
          toast.success("Evaluación completada");
          router.push(
            `/dashboard/modulos/${moduloId}/lotes/${loteId}/surcos/${surcoIdParam}/predicciones/${res.data.id}`,
          );
          return;
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoadingStep("idle");
      }
      return;
    }

    // Flujo estándar: evaluación en 2 pasos
    try {
      setLoadingStep("step1");
      setClassificationResult(null);
      const detectionResponse = await evaluationRoboflow(
        selectedImage,
        selectedSurcoId ?? undefined,
        selectedPeriodoId ?? undefined,
      );
      setRoboflowResult(detectionResponse.data);

      if (
        !detectionResponse.data.has_matches ||
        !detectionResponse.data.predictions.length
      ) {
        const message =
          detectionResponse.message ||
          "No se detectó ninguna hoja en la imagen. Por favor sube una imagen donde la hoja sea claramente visible.";

        setRoboflowMessage(message);
        toast.info(message);
        setLoadingStep("idle");
        return;
      }

      setRoboflowMessage(detectionResponse.message || "Deteccion completada");

      setLoadingStep("step2");
      const classificationResponse = await evaluationImage(
        selectedImage,
        selectedPeriodoId ?? undefined,
      );
      setClassificationResult(classificationResponse.data.clasificacion);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingStep("idle");
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreview(null);
    setRoboflowResult(null);
    setClassificationResult(null);
    setRoboflowMessage("");
    setError("");
    setNaturalSize({ width: 0, height: 0 });
    setDisplaySize({ width: 0, height: 0 });
    setZoomLevel(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const stepMessage =
    hasHierarchyContext && loadingStep === "step1"
      ? "Evaluando imagen..."
      : loadingStep === "step1"
        ? "Paso 1/2: detectando zonas..."
        : loadingStep === "step2"
          ? "Paso 2/2: clasificando estado de la hoja..."
          : "";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Evaluacion Completa
        </h1>
        <p className="text-gray-600">
          Paso 1: deteccion con cudros delimitadores. Paso 2: clasificacion de
          enfermedad o estado saludable.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Seleccionar Imagen
          </h2>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                    PNG, JPG, JPEG o WEBP hasta 10MB
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {/* Periodo Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periodo (opcional)
              </label>
              {loadingPeriodos ? (
                <p className="text-sm text-gray-500">Cargando periodos...</p>
              ) : periodos.length > 0 ? (
                <select
                  value={selectedPeriodoId || ""}
                  onChange={(e) =>
                    setSelectedPeriodoId(
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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

            {/* Surco Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {hasHierarchyContext
                  ? "Surco seleccionado"
                  : "Seleccionar Surco (Opcional)"}
              </label>
              {hasHierarchyContext ? (
                <p className="text-sm text-emerald-700 font-medium py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  Surco {surcoIdParam} — Evaluación en contexto de módulo/lote
                </p>
              ) : loadingSurcos ? (
                <p className="text-sm text-gray-500">Cargando surcos...</p>
              ) : surcos.length > 0 ? (
                <select
                  value={selectedSurcoId || ""}
                  onChange={(e) =>
                    setSelectedSurcoId(
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Sin surco asignado</option>
                  {surcos.map((surco) => (
                    <option
                      key={surco.id}
                      value={surco.id}
                    >
                      {surco.modulo_nombre} → {surco.lote_identificador} → Surco{" "}
                      {surco.numero}
                      {surco.descripcion ? ` (${surco.descripcion})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500">
                  No hay surcos disponibles
                </p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!selectedImage || loadingStep !== "idle"}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingStep === "idle"
                ? "Iniciar Evaluacion de 2 Pasos"
                : stepMessage}
            </button>

            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Limpiar
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Resultado de Evaluacion Completa
          </h2>

          {preview ? (
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Zoom</p>
                <div className="flex items-center gap-2">
                  {ZOOM_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setZoomLevel(option)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                        zoomLevel === option
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      x{option}
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={scrollContainerRef}
                className="overflow-auto rounded-lg border border-gray-100 bg-gray-50 p-2"
              >
                <div
                  className="relative mx-auto"
                  style={{
                    width: displaySize.width
                      ? `${displaySize.width * zoomLevel}px`
                      : undefined,
                    height: displaySize.height
                      ? `${displaySize.height * zoomLevel}px`
                      : undefined,
                  }}
                >
                  <div
                    className="absolute top-0 left-0 origin-top-left"
                    style={{ transform: `scale(${zoomLevel})` }}
                  >
                    <div className="relative inline-block">
                      <img
                        ref={imageRef}
                        src={preview}
                        alt="Imagen analizada"
                        className="max-h-105 w-auto rounded-lg"
                        onLoad={updateImageSize}
                      />

                      {renderBoxes.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                          {renderBoxes.map((box, index) => {
                            const color = getBoxColor(box.label);
                            return (
                              <div
                                key={`${box.label}-${index}`}
                                className="absolute"
                                style={{
                                  left: `${box.left}px`,
                                  top: `${box.top}px`,
                                  width: `${box.width}px`,
                                  height: `${box.height}px`,
                                  border: `2px solid ${color}`,
                                }}
                              >
                                <div
                                  className="absolute -top-6 left-0 text-white text-xs px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: color,
                                    transform: `scale(${1 / zoomLevel})`,
                                    transformOrigin: "top left",
                                  }}
                                >
                                  {box.label}{" "}
                                  {(box.confidence * 100).toFixed(0)}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 border border-gray-200 rounded-lg">
              Sube una imagen para comenzar
            </div>
          )}

          <div className="space-y-3">
            <div className="p-4 rounded-lg border bg-slate-50 border-slate-200">
              <p className="text-sm font-semibold text-slate-700">
                Paso 1: Deteccion Cuadros Delimitadores
              </p>
              {roboflowResult ? (
                <>
                  <p className="text-sm text-slate-600 mt-1">
                    Modelo: {roboflowResult.model_id}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Detecciones: {roboflowResult.predictions.length}
                  </p>
                  <p className="text-sm mt-1 text-slate-700">
                    {roboflowMessage}
                  </p>
                  {!roboflowResult.has_matches && (
                    <p className="text-sm mt-2 text-blue-700">
                      No se detectó ninguna hoja en la imagen. No se ejecutó la
                      clasificación.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500 mt-1">Pendiente</p>
              )}
            </div>

            <div className="p-4 rounded-lg border bg-emerald-50 border-emerald-200">
              <p className="text-sm font-semibold text-emerald-700">
                Paso 2: Clasificacion de Enfermedad
              </p>
              {roboflowResult && !roboflowResult.has_matches ? (
                <p className="text-sm text-slate-600 mt-1">
                  No se realizó la clasificación porque no se detectó ninguna
                  hoja válida en la imagen.
                </p>
              ) : classificationResult ? (
                <>
                  {/* Resumen comparativo */}
                  <div className="mt-3 p-3 rounded-lg border border-emerald-200 bg-white">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Resumen Comparativo
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Mejor modelo:</span>
                        <p className="font-bold text-emerald-700">
                          {
                            getModelMeta(
                              classificationResult.resumen_comparativo
                                .modelo_mas_confiado,
                            ).label
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Confianza máx:</span>
                        <p className="font-bold text-slate-800">
                          {(
                            classificationResult.resumen_comparativo
                              .confianza_maxima * 100
                          ).toFixed(2)}
                          %
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Consenso:</span>
                        <p className="font-bold">
                          {classificationResult.resumen_comparativo.consenso ? (
                            <span className="text-emerald-600">
                              Sí -{" "}
                              {getDiseaseName(
                                classificationResult.resumen_comparativo
                                  .clase_consenso ?? "",
                              )}
                            </span>
                          ) : (
                            <span className="text-amber-600">
                              No hay consenso
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Más confiado:</span>
                        <p className="font-bold text-slate-800">
                          {
                            getModelMeta(
                              classificationResult.resumen_comparativo
                                .modelo_mas_confiado,
                            ).label
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tarjetas por modelo */}
                  <div className="mt-3 space-y-3">
                    {Object.entries(classificationResult.resultados).map(
                      ([key, result]) => {
                        const meta = getModelMeta(key);
                        const isBest =
                          key ===
                          classificationResult.resumen_comparativo
                            .modelo_mas_confiado;
                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-lg border ${
                              isBest
                                ? getClassificationBorder(result.clase_predicha)
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                {meta.label}
                                {isBest && (
                                  <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                                    Mejor
                                  </span>
                                )}
                              </span>
                              <span className="text-xs font-semibold text-slate-600">
                                {(result.confianza * 100).toFixed(2)}%
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800">
                              {getDiseaseName(result.clase_predicha)}
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                              <div
                                className={`h-1.5 rounded-full ${getClassificationColor(result.clase_predicha)}`}
                                style={{
                                  width: `${result.confianza * 100}%`,
                                }}
                              />
                            </div>

                            {/* Distribución de predicciones */}
                            <div className="mt-3 pt-2 border-t border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                Distribución de probabilidades
                              </p>
                              <div className="space-y-1">
                                {Object.entries(result.todas_predicciones)
                                  .sort(([, a], [, b]) => b - a)
                                  .map(([cls, prob]) => (
                                    <div
                                      key={cls}
                                      className="flex items-center gap-2"
                                    >
                                      <span className="text-[10px] text-slate-500 w-24 truncate">
                                        {getDiseaseName(cls)}
                                      </span>
                                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${getClassificationColor(cls)}`}
                                          style={{ width: `${prob * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] tabular-nums font-medium text-slate-600 w-14 text-right">
                                        {prob < 0.0001
                                          ? "<0.01%"
                                          : `${(prob * 100).toFixed(2)}%`}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {/* Métricas de entrenamiento */}
                            <div className="mt-3 pt-2 border-t border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                Métricas de entrenamiento
                              </p>
                              <div className="grid grid-cols-4 gap-1.5 text-center">
                                {(
                                  [
                                    [
                                      "Acc",
                                      result.metricas_entrenamiento.accuracy,
                                    ],
                                    [
                                      "Prec",
                                      result.metricas_entrenamiento.precision,
                                    ],
                                    [
                                      "Rec",
                                      result.metricas_entrenamiento.recall,
                                    ],
                                    [
                                      "F1",
                                      result.metricas_entrenamiento.f1_score,
                                    ],
                                  ] as const
                                ).map(([label, value]) => (
                                  <div
                                    key={label}
                                    className="bg-slate-50 rounded px-1 py-1"
                                  >
                                    <p className="text-[9px] text-slate-400 font-medium">
                                      {label}
                                    </p>
                                    <p className="text-xs font-bold text-slate-700 tabular-nums">
                                      {(value * 100).toFixed(1)}%
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 mt-1">Pendiente</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
