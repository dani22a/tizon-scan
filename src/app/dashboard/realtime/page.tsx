"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { toast } from "sonner";
import {
  evaluationImage,
  evaluationRoboflow,
  getSurcos,
  getPeriodos,
} from "@/service/evaluation";
import {
  MultiModelEvaluationResult,
  RoboflowDetection,
  RoboflowPrediction,
  Surco,
  Periodo,
} from "@/types/evaluation";

// ── Roboflow inferencejs config ─────────────────────────────────────────────
// Añade en tu .env.local:  NEXT_PUBLIC_ROBOFLOW_PUBLISHABLE_KEY=rf_XXXXXXXX
// Usa la clave PUBLICABLE (publishable), nunca la privada.
const RF_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_ROBOFLOW_PUBLISHABLE_KEY ?? "";
// Verifica que el ID y la versión coincidan con tu workspace en Roboflow
const RF_MODEL_ID = "potato_late_blight_yolov8n";
const RF_MODEL_VERSION = "10";

// ── Tipos para el global de inferencejs ───────────────────────────────────
interface LivePrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

declare global {
  interface Window {
    inferencejs: {
      InferenceEngine: new () => {
        startWorker(
          modelId: string,
          version: string,
          apiKey: string,
        ): Promise<string>;
        infer(
          workerId: string,
          image: unknown,
        ): Promise<{ predictions?: LivePrediction[] } | LivePrediction[]>;
        stopWorker(workerId: string): void;
      };
      CVImage: new (src: HTMLVideoElement) => unknown;
    };
  }
}

// ── Helpers puros (fuera del componente) ──────────────────────────────────

function normalizePrediction(p: Record<string, unknown>): LivePrediction {
  if (p.bbox && typeof p.bbox === "object") {
    const b = p.bbox as { x: number; y: number; width: number; height: number };
    return {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      confidence: (p.confidence as number) ?? 0,
      class: (p.class as string) ?? "",
    };
  }
  return p as unknown as LivePrediction;
}

function normalizePredictions(raw: unknown): LivePrediction[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === "object" && "predictions" in raw) {
    const preds = (raw as { predictions?: unknown }).predictions;
    if (Array.isArray(preds)) arr = preds;
  }
  return arr
    .filter(
      (p): p is Record<string, unknown> => p != null && typeof p === "object",
    )
    .map(normalizePrediction);
}

function drawPredictions(
  canvas: HTMLCanvasElement,
  predictions: LivePrediction[],
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  predictions.forEach((p) => {
    const color = getBoxColor(p.class);
    const x = p.x - p.width / 2;
    const y = p.y - p.height / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, p.width, p.height);
    const label = `${p.class} ${(p.confidence * 100).toFixed(0)}%`;
    ctx.font = "bold 14px sans-serif";
    const textW = ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 22, textW + 10, 22);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x + 5, y - 5);
  });
}

function getBoxColor(className: string): string {
  const n = className.toLowerCase();
  if (n.includes("blight")) return "#dc2626";
  if (n.includes("leaf")) return "#7c3aed";
  return "#16a34a";
}

function getDiseaseName(className: string): string {
  const names: Record<string, string> = {
    Potato___Early_blight: "Tizon Temprano",
    Potato___Late_blight: "Tizon Tardio",
    Potato___healthy: "Saludable",
  };
  return names[className] ?? className;
}

function getClassificationColor(className: string): string {
  if (className.includes("healthy")) return "bg-green-600";
  if (className.includes("Early")) return "bg-yellow-500";
  return "bg-red-600";
}

function getClassificationBorder(className: string): string {
  if (className.includes("healthy")) return "border-green-300 bg-green-50";
  if (className.includes("Early")) return "border-yellow-300 bg-yellow-50";
  return "border-red-300 bg-red-50";
}

const MODEL_DISPLAY: Record<string, { label: string }> = {
  efficient: { label: "EfficientNet" },
  resnet: { label: "ResNet" },
  mobilevit: { label: "MobileViT" },
};

function getModelMeta(key: string) {
  return MODEL_DISPLAY[key] ?? { label: key };
}

function formatApiError(value: unknown): string | null {
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
}

function getErrorMessage(err: unknown): string {
  const e = err as Record<string, unknown>;
  const status = (e?.response as Record<string, unknown>)?.status;
  if (status === 401) return "Sesion expirada. Inicia sesion nuevamente.";
  if (status === 413) return "La imagen supera el tamano maximo permitido.";
  if (status === 504) return "YoloV8 no respondio a tiempo. Intenta otra vez.";
  if (status === 502)
    return "Error del servicio de deteccion. Intenta mas tarde.";
  const data = (e?.response as Record<string, unknown>)?.data;
  const apiDetail = formatApiError(
    (data as Record<string, unknown> | undefined)?.detail,
  );
  if (apiDetail) return apiDetail;
  const apiMessage = formatApiError(
    (data as Record<string, unknown> | undefined)?.message,
  );
  if (apiMessage) return apiMessage;
  return "Error al evaluar la imagen. Intenta de nuevo.";
}

// ── Tipos locales ─────────────────────────────────────────────────────────
type CameraPhase = "idle" | "starting" | "active" | "error";
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

// ── Componente ────────────────────────────────────────────────────────────
export default function RealtimePage() {
  // Script inferencejs CDN
  const [isScriptReady, setIsScriptReady] = useState(false);

  // ── Fase 1: Webcam ─────────────────────────────────────────────────────
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>("idle");
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inferEngineRef = useRef<InstanceType<
    Window["inferencejs"]["InferenceEngine"]
  > | null>(null);
  const workerIdRef = useRef<string | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);

  // ── Fase 2: Foto capturada + evaluación backend ────────────────────────
  const blobUrlRef = useRef<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [roboflowResult, setRoboflowResult] =
    useState<RoboflowDetection | null>(null);
  const [classificationResult, setClassificationResult] =
    useState<MultiModelEvaluationResult | null>(null);
  const [roboflowMessage, setRoboflowMessage] = useState("");
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("idle");
  const [error, setError] = useState("");
  const [zoomLevel, setZoomLevel] = useState<(typeof ZOOM_OPTIONS)[number]>(1);

  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  const [surcos, setSurcos] = useState<Surco[]>([]);
  const [selectedSurcoId, setSelectedSurcoId] = useState<number | null>(null);
  const [loadingSurcos, setLoadingSurcos] = useState(true);

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(
    null,
  );
  const [loadingPeriodos, setLoadingPeriodos] = useState(true);

  const imageRef = useRef<HTMLImageElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── Cargar surcos al montar ────────────────────────────────────────────
  useEffect(() => {
    const loadSurcos = async () => {
      try {
        setLoadingSurcos(true);
        const response = await getSurcos();
        const data = response.data ?? [];
        setSurcos(data);
        if (data.length > 0) {
          setSelectedSurcoId(data[0].id);
        }
      } catch (err) {
        console.error("Error cargando surcos:", err);
        toast.error("No se pudieron cargar los surcos");
      } finally {
        setLoadingSurcos(false);
      }
    };
    loadSurcos();

    // load periodos
    const loadPeriodos = async () => {
      try {
        setLoadingPeriodos(true);
        const resp = await getPeriodos();
        const pd = resp.data ?? [];
        setPeriodos(pd);
        if (pd.length > 0) {
          setSelectedPeriodoId(pd[0].id);
        }
      } catch (err) {
        console.error("Error cargando periodos:", err);
        toast.error("No se pudieron cargar los periodos");
      } finally {
        setLoadingPeriodos(false);
      }
    };
    loadPeriodos();
  }, []);

  // ── Limpieza al desmontar ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isDetectingRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (workerIdRef.current && inferEngineRef.current) {
        try {
          inferEngineRef.current.stopWorker(workerIdRef.current);
        } catch {}
      }
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  // ── Centrar scroll al hacer zoom ──────────────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollLeft = Math.max(
      0,
      (container.scrollWidth - container.clientWidth) / 2,
    );
    container.scrollTop = Math.max(
      0,
      (container.scrollHeight - container.clientHeight) / 2,
    );
  }, [zoomLevel, displaySize.width, displaySize.height]);

  useEffect(() => {
    const onResize = () => {
      const img = imageRef.current;
      if (!img) return;
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setDisplaySize({ width: img.clientWidth, height: img.clientHeight });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const updateImageSize = () => {
    const img = imageRef.current;
    if (!img) return;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setDisplaySize({ width: img.clientWidth, height: img.clientHeight });
  };

  // ── Detener cámara ────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    isDetectingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (workerIdRef.current && inferEngineRef.current) {
      try {
        inferEngineRef.current.stopWorker(workerIdRef.current);
      } catch {}
      workerIdRef.current = null;
    }
    inferEngineRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraPhase("idle");
  }, []);

  // ── Iniciar cámara ────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (!isScriptReady) {
      toast.error(
        "El motor de inferencia aún no está listo. Espera un momento.",
      );
      return;
    }
    if (!RF_PUBLISHABLE_KEY) {
      toast.error(
        "Configura NEXT_PUBLIC_ROBOFLOW_PUBLISHABLE_KEY en tu .env.local",
      );
      return;
    }

    setCameraPhase("starting");
    setCameraError("");

    try {
      // 1. Inicializar inferencejs y cargar el modelo (como en el ejemplo del usuario)
      const { InferenceEngine, CVImage } = window.inferencejs;
      const engine = new InferenceEngine();
      inferEngineRef.current = engine;
      const workerId = await engine.startWorker(
        RF_MODEL_ID,
        RF_MODEL_VERSION,
        RF_PUBLISHABLE_KEY,
      );
      workerIdRef.current = workerId;

      // 2. Encender la webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;

      setCameraPhase("active");
      isDetectingRef.current = true;

      // 3. Bucle de detección en tiempo real (inicia cuando el video empiece a reproducirse)
      const detectarFrame = async (): Promise<void> => {
        if (!isDetectingRef.current) return;

        const canvas = canvasRef.current;
        const eng = inferEngineRef.current;
        const wid = workerIdRef.current;
        const vid = videoRef.current;

        if (canvas && eng && wid && vid && vid.readyState >= 2) {
          if (
            canvas.width !== vid.videoWidth ||
            canvas.height !== vid.videoHeight
          ) {
            canvas.width = vid.videoWidth;
            canvas.height = vid.videoHeight;
          }
          try {
            const cvimg = new CVImage(vid);
            const predictions = await eng.infer(wid, cvimg);
            drawPredictions(canvas, normalizePredictions(predictions));
          } catch {
            // Ignorar errores de frame individual
          }
        }

        if (isDetectingRef.current) {
          animFrameRef.current = requestAnimationFrame(detectarFrame);
        }
      };

      // Iniciar el bucle cuando el video empiece a reproducirse (tiempo real real)
      video.onplaying = () => {
        detectarFrame();
      };

      await video.play();
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      const msg =
        e?.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Por favor, permite el acceso en tu navegador."
          : e?.name === "NotFoundError"
            ? "No se encontró ninguna cámara en este dispositivo."
            : `Error al iniciar la cámara: ${e?.message ?? "desconocido"}`;
      setCameraError(msg);
      setCameraPhase("error");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [isScriptReady, stopCamera]);

  // ── Evaluación backend (fase 2) ───────────────────────────────────────
  const runEvaluation = async (file: File) => {
    setError("");
    setRoboflowResult(null);
    setClassificationResult(null);
    setRoboflowMessage("");

    try {
      setLoadingStep("step1");
      setClassificationResult(null);
      const detectionResponse = await evaluationRoboflow(
        file,
        selectedSurcoId ?? undefined,
        selectedPeriodoId ?? undefined,
      );
      setRoboflowResult(detectionResponse.data);
      const rbf = detectionResponse.data;

      if (!rbf.has_matches || !rbf.predictions.length) {
        const message =
          detectionResponse.message ||
          "No se detectó ninguna hoja en la imagen. Por favor, captura un ángulo donde la hoja sea claramente visible.";
        setRoboflowMessage(message);
        toast.info(message);
        setLoadingStep("idle");
        return;
      }

      setRoboflowMessage(detectionResponse.message || "Deteccion completada");
      setLoadingStep("step2");
      const classificationResponse = await evaluationImage(
        file,
        selectedPeriodoId ?? undefined,
      );
      setClassificationResult(classificationResponse.data.clasificacion);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingStep("idle");
    }
  };

  // ── Tomar foto ────────────────────────────────────────────────────────
  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      toast.error("El video aún no está listo.");
      return;
    }

    const captureCanvas = captureCanvasRef.current!;
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    const ctx = captureCanvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    captureCanvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("No se pudo capturar el frame.");
          return;
        }

        // Revocar blob URL anterior
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }

        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const file = new File([blob], `captura-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        setCapturedPreview(url);
        setRoboflowResult(null);
        setClassificationResult(null);
        setRoboflowMessage("");
        setError("");
        setZoomLevel(1);
        setNaturalSize({ width: 0, height: 0 });
        setDisplaySize({ width: 0, height: 0 });

        // Iniciar evaluación automáticamente al tomar la foto
        runEvaluation(file);
      },
      "image/jpeg",
      0.92,
    );
  }, []);

  const discardPhoto = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setCapturedPreview(null);
    setRoboflowResult(null);
    setClassificationResult(null);
    setRoboflowMessage("");
    setError("");
  };

  // ── Bounding boxes para la foto capturada ─────────────────────────────
  const roboflow = roboflowResult ?? null;

  const renderBoxes: RenderBox[] = useMemo(() => {
    if (!roboflow?.predictions.length) return [];
    if (
      !naturalSize.width ||
      !naturalSize.height ||
      !displaySize.width ||
      !displaySize.height
    )
      return [];
    const scaleX = displaySize.width / naturalSize.width;
    const scaleY = displaySize.height / naturalSize.height;
    return roboflow.predictions.map((p: RoboflowPrediction) => ({
      left: (p.x - p.width / 2) * scaleX,
      top: (p.y - p.height / 2) * scaleY,
      width: p.width * scaleX,
      height: p.height * scaleY,
      label: p.class,
      confidence: p.confidence,
    }));
  }, [roboflow, naturalSize, displaySize]);

  const stepMessage =
    loadingStep === "step1"
      ? "Paso 1/2: detectando zonas..."
      : loadingStep === "step2"
        ? "Paso 2/2: clasificando enfermedad..."
        : "";

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <Script
        id="inferencejs-cdn"
        src="https://cdn.jsdelivr.net/npm/inferencejs@1.2.2"
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
      />
      {/* Canvas oculto para la captura de foto */}
      <canvas
        ref={captureCanvasRef}
        className="hidden"
      />

      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Tiempo Real</h1>
          <p className="text-gray-600">
            Fase 1: detección en vivo mediante la webcam con inferencejs. Fase
            2: toma una foto para análisis completo con cuadros delimitadores
            (YoloV8) y clasificación multi-modelo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Columna izquierda: Fase 1 (Webcam) ──────────────────── */}
          <div className="space-y-6">
            {/* Panel Webcam */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0">
                  1
                </span>
                Webcam en Tiempo Real
              </h2>

              {/* Video + Canvas overlay */}
              <div
                className="relative bg-gray-900 rounded-lg overflow-hidden"
                style={{ minHeight: 240 }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg block"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Overlay: cámara apagada */}
                {cameraPhase === "idle" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
                    <div className="text-center text-white space-y-3">
                      <svg
                        className="w-14 h-14 mx-auto opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 10l4.553-2.069A1 1 0 0121 8.867V15.13a1 1 0 01-1.447.898L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                        />
                      </svg>
                      <p className="text-sm text-gray-300">Cámara apagada</p>
                    </div>
                  </div>
                )}

                {/* Overlay: iniciando */}
                {cameraPhase === "starting" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
                    <div className="text-center text-white space-y-3">
                      <div className="animate-spin w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full mx-auto" />
                      <p className="text-sm text-gray-300">
                        Iniciando cámara y cargando modelo...
                      </p>
                    </div>
                  </div>
                )}

                {/* Overlay: error */}
                {cameraPhase === "error" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 rounded-lg p-4">
                    <p className="text-sm text-white text-center">
                      {cameraError}
                    </p>
                  </div>
                )}

                {/* Badge "En vivo" */}
                {cameraPhase === "active" && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    En vivo
                  </div>
                )}
              </div>

              {/* Selector de periodo */}
              <div className="mt-4">
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
                        e.target.value ? parseInt(e.target.value, 10) : null,
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
                  <p className="text-sm text-amber-600">
                    No hay periodos disponibles. Crea uno para agrupar.
                  </p>
                )}
              </div>

              {/* Selector de surco */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surco (requerido para guardar)
                </label>
                {loadingSurcos ? (
                  <p className="text-sm text-gray-500">Cargando surcos...</p>
                ) : surcos.length > 0 ? (
                  <select
                    value={selectedSurcoId ?? ""}
                    onChange={(e) =>
                      setSelectedSurcoId(
                        e.target.value ? parseInt(e.target.value, 10) : null,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Selecciona un surco</option>
                    {surcos.map((surco) => (
                      <option
                        key={surco.id}
                        value={surco.id}
                      >
                        {surco.modulo_nombre} → {surco.lote_identificador} →
                        Surco {surco.numero}
                        {surco.descripcion ? ` (${surco.descripcion})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-amber-600">
                    No hay surcos disponibles. Crea surcos antes de capturar.
                  </p>
                )}
              </div>

              {/* Controles de cámara */}
              <div className="mt-4 flex gap-3">
                {cameraPhase === "active" ? (
                  <>
                    <button
                      onClick={stopCamera}
                      className="flex-1 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors text-sm"
                    >
                      Detener Cámara
                    </button>
                    <button
                      onClick={takePhoto}
                      disabled={
                        loadingStep !== "idle" ||
                        !selectedSurcoId ||
                        surcos.length === 0
                      }
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {loadingStep !== "idle"
                        ? stepMessage
                        : !selectedSurcoId
                          ? "Selecciona un surco"
                          : "📷 Tomar Foto"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startCamera}
                    disabled={
                      cameraPhase === "starting" ||
                      cameraPhase === "error" ||
                      !isScriptReady
                    }
                    className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {cameraPhase === "starting"
                      ? "Iniciando..."
                      : !isScriptReady
                        ? "Cargando motor de inferencia..."
                        : "Iniciar Cámara"}
                  </button>
                )}
              </div>

              {cameraPhase === "error" && (
                <button
                  onClick={() => setCameraPhase("idle")}
                  className="mt-2 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                >
                  Reintentar
                </button>
              )}

              {!isScriptReady && cameraPhase === "idle" && (
                <p className="mt-2 text-xs text-amber-600 text-center">
                  Cargando inferencejs desde CDN, espera un momento...
                </p>
              )}
            </div>

            {/* Panel: foto capturada */}
            {capturedPreview && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-emerald-600 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0">
                    2
                  </span>
                  Foto Capturada
                </h2>
                <img
                  src={capturedPreview}
                  alt="Foto capturada"
                  className="w-full rounded-lg shadow-sm"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={takePhoto}
                    disabled={
                      cameraPhase !== "active" ||
                      loadingStep !== "idle" ||
                      !selectedSurcoId ||
                      surcos.length === 0
                    }
                    className="flex-1 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Nueva foto
                  </button>
                  <button
                    onClick={discardPhoto}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Columna derecha: Resultados fase 2 ───────────────────── */}
          <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-600 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0">
                2
              </span>
              Resultado del Análisis Completo
            </h2>

            {/* Imagen con bounding boxes */}
            {capturedPreview ? (
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
                          src={capturedPreview}
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
              <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-sm">
                  Inicia la cámara y toma una foto para comenzar el análisis
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Paso 1: Detección */}
            <div className="p-4 rounded-lg border bg-slate-50 border-slate-200">
              <p className="text-sm font-semibold text-slate-700">
                Paso 1: Deteccion Cuadros Delimitadores
              </p>
              {roboflow ? (
                <>
                  <p className="text-sm text-slate-600 mt-1">
                    Modelo: {roboflow.model_id}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Detecciones: {roboflow.predictions.length}
                  </p>
                  <p className="text-sm mt-1 text-slate-700">
                    {roboflowMessage}
                  </p>
                  {!roboflow.has_matches && (
                    <p className="text-sm mt-2 text-blue-700">
                      No se detectó ninguna hoja. No se ejecutó la
                      clasificación.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500 mt-1">
                  {loadingStep === "step1" ? "Detectando..." : "Pendiente"}
                </p>
              )}
            </div>

            {/* Paso 2: Clasificación */}
            <div className="p-4 rounded-lg border bg-emerald-50 border-emerald-200">
              <p className="text-sm font-semibold text-emerald-700">
                Paso 2: Clasificacion de Enfermedad
              </p>

              {roboflow && !roboflow.has_matches ? (
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
                              Sí —{" "}
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
                          key === classificationResult.resumen_comparativo.modelo_mas_confiado;
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

                            {/* Distribución de probabilidades */}
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
                <p className="text-sm text-slate-500 mt-1">
                  {loadingStep === "step2" ? "Clasificando..." : "Pendiente"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
