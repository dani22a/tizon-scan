"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getPredictionHistory } from "@/service/evaluation";
import {
  PrediccionRecord,
  RoboflowPrediction,
  ModelResult,
  MultiModelEvaluationResult,
} from "@/types/evaluation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { X } from "@/components/ui-icons";

const ZOOM_OPTIONS = [1, 2, 3] as const;

const DISEASE_NAMES: Record<string, string> = {
  Potato___Early_blight: "Tizón Temprano",
  Potato___Late_blight: "Tizón Tardío",
  Potato___healthy: "Saludable",
};

const MODEL_LABELS: Record<string, string> = {
  efficient: "EfficientNet",
  resnet: "ResNet",
  mobilevit: "MobileViT",
};

function diseaseName(cls: string) {
  return DISEASE_NAMES[cls] ?? cls;
}

function modelLabel(key: string) {
  return MODEL_LABELS[key] ?? key;
}

function classColor(cls: string | null | undefined) {
  if (!cls) return "bg-gray-600";
  if (cls.includes("healthy")) return "bg-green-600";
  if (cls.includes("Early")) return "bg-amber-500";
  return "bg-red-600";
}

function classBadge(cls: string | null | undefined) {
  if (!cls) return "bg-gray-100 text-gray-800";
  if (cls.includes("healthy")) return "bg-green-100 text-green-800";
  if (cls.includes("Early")) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function boxColor(cls: string) {
  const c = cls.toLowerCase();
  if (c.includes("blight")) return "#dc2626";
  if (c.includes("leaf")) return "#7c3aed";
  return "#16a34a";
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type RenderBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function HistoryPage() {
  const [predictions, setPredictions] = useState<PrediccionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PrediccionRecord | null>(null);
  const [zoomLevel, setZoomLevel] = useState<(typeof ZOOM_OPTIONS)[number]>(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const generatePDFBlob = async (
    pred: PrediccionRecord,
  ): Promise<{ blob: Blob; filename: string }> => {
    const tempContainer = document.createElement("div");
    try {
      const diagnosis = pred.fase2_resumen?.clase_predicha ?? "Sin clasificar";
      const confidence = pred.fase2_resumen?.confianza ?? 0;
      const mejor_modelo = pred.fase2_resumen?.modelo ?? "N/A";
      tempContainer.style.position = "absolute";
      tempContainer.style.top = "-9999px";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = "800px";
      tempContainer.style.backgroundColor = "#ffffff";
      tempContainer.style.fontFamily = "Arial, sans-serif";
      tempContainer.style.padding = "40px";
      tempContainer.style.color = "#000";

      // Contenedor de imagen
      const imgContainer = document.createElement("div");
      imgContainer.style.textAlign = "center";
      imgContainer.style.marginBottom = "30px";

      const img = document.createElement("img");
      img.src = pred.imagen_url;
      img.style.maxWidth = "100%";
      img.style.maxHeight = "250px";
      img.style.borderRadius = "8px";
      img.style.border = "1px solid #ddd";
      img.crossOrigin = "anonymous";
      imgContainer.appendChild(img);
      tempContainer.appendChild(imgContainer);

      // Encabezado
      const header = document.createElement("div");
      header.style.borderBottom = "3px solid #059669";
      header.style.paddingBottom = "20px";
      header.style.marginBottom = "25px";

      const title = document.createElement("h1");
      title.textContent = "REPORTE DE PREDICCIÓN";
      title.style.fontSize = "24px";
      title.style.fontWeight = "bold";
      title.style.margin = "0 0 8px 0";
      title.style.color = "#059669";
      header.appendChild(title);

      const meta = document.createElement("p");
      meta.textContent = `ID: #${pred.id} | Fecha: ${formatDate(
        pred.fecha ?? pred.created_at,
      )}`;
      meta.style.fontSize = "12px";
      meta.style.color = "#666";
      meta.style.margin = "0";
      header.appendChild(meta);
      tempContainer.appendChild(header);

      // Fase 1
      const fase1 = document.createElement("div");
      fase1.style.marginBottom = "25px";
      fase1.style.padding = "15px";
      fase1.style.backgroundColor = "#f0fdf4";
      fase1.style.border = "1px solid #bbf7d0";
      fase1.style.borderRadius = "6px";

      const fase1Title = document.createElement("h2");
      fase1Title.textContent = "FASE 1: DETECCIÓN (YoloV8)";
      fase1Title.style.fontSize = "14px";
      fase1Title.style.fontWeight = "bold";
      fase1Title.style.margin = "0 0 12px 0";
      fase1Title.style.color = "#15803d";
      fase1.appendChild(fase1Title);

      if (pred.fase1_resumen) {
        const f1Content = document.createElement("div");
        f1Content.style.fontSize = "13px";
        f1Content.style.lineHeight = "1.8";

        const hasMatches = pred.fase1_resumen.has_matches;
        const detections = pred.fase1_resumen.total_detecciones;
        const clases = pred.fase1_resumen.clases_detectadas
          .map((c) => diseaseName(c))
          .join(", ");

        f1Content.innerHTML = `
          <div style="margin-bottom: 8px"><strong>Estado:</strong> ${hasMatches ? "✓ Detecciones encontradas" : "✓ Sin detecciones"}</div>
          <div style="margin-bottom: 8px"><strong>Total:</strong> ${detections} objetos detectados</div>
          ${clases ? `<div style="margin-bottom: 8px"><strong>Clases:</strong> ${clases}</div>` : ""}
          <div><strong>Modelo:</strong> ${pred.fase1_payload?.model_id || "N/A"}</div>
        `;
        fase1.appendChild(f1Content);
      }
      tempContainer.appendChild(fase1);

      // Fase 2
      const fase2 = document.createElement("div");
      fase2.style.marginBottom = "25px";
      fase2.style.padding = "15px";
      fase2.style.backgroundColor = "#fef3c7";
      fase2.style.border = "1px solid #fcd34d";
      fase2.style.borderRadius = "6px";

      const fase2Title = document.createElement("h2");
      fase2Title.textContent = "FASE 2: DIAGNÓSTICO";
      fase2Title.style.fontSize = "14px";
      fase2Title.style.fontWeight = "bold";
      fase2Title.style.margin = "0 0 12px 0";
      fase2Title.style.color = "#92400e";
      fase2.appendChild(fase2Title);

      const f2Content = document.createElement("div");
      f2Content.style.fontSize = "13px";
      f2Content.style.lineHeight = "1.8";

      f2Content.innerHTML = `
        <div style="margin-bottom: 8px"><strong>Diagnóstico:</strong> ${diseaseName(diagnosis)}</div>
        <div style="margin-bottom: 8px"><strong>Confianza:</strong> ${(confidence * 100).toFixed(2)}%</div>
        <div><strong>Mejor Modelo:</strong> ${modelLabel(mejor_modelo)}</div>
      `;
      fase2.appendChild(f2Content);
      tempContainer.appendChild(fase2);

      // Métricas si existe fase2 payload
      if (pred.fase2_payload) {
        const metricas = document.createElement("div");
        metricas.style.padding = "15px";
        metricas.style.backgroundColor = "#f3f4f6";
        metricas.style.border = "1px solid #d1d5db";
        metricas.style.borderRadius = "6px";
        metricas.style.fontSize = "11px";

        const metricasTitle = document.createElement("h3");
        metricasTitle.textContent = "COMPARATIVA DE MODELOS";
        metricasTitle.style.fontSize = "13px";
        metricasTitle.style.fontWeight = "bold";
        metricasTitle.style.margin = "0 0 10px 0";
        metricasTitle.style.color = "#374151";
        metricas.appendChild(metricasTitle);

        const modelsDiv = document.createElement("div");
        modelsDiv.style.lineHeight = "2";

        const fase2Payload = pred.fase2_payload;
        Object.entries(fase2Payload.resultados).forEach(
          ([key, r]: [string, ModelResult]) => {
            const isBest = key === fase2Payload.mejor_modelo_global;
            const modelRow = document.createElement("div");
            modelRow.style.marginBottom = "8px";
            modelRow.style.padding = "8px";
            modelRow.style.backgroundColor = isBest ? "#dbeafe" : "#fff";
            modelRow.style.border = isBest
              ? "1px solid #0ea5e9"
              : "1px solid #e5e7eb";
            modelRow.style.borderRadius = "4px";

            modelRow.innerHTML = `
              <div style="font-weight: bold; margin-bottom: 4px">
                ${modelLabel(key)} ${isBest ? " ⭐ (Mejor)" : ""}
              </div>
              <div style="font-size: 11px; color: #666">
                Confianza: ${(r.confianza * 100).toFixed(2)}% | 
                Predicción: ${diseaseName(r.clase_predicha)}
              </div>
              <div style="font-size: 10px; color: #999; margin-top: 4px">
                Acc: ${(r.metricas_entrenamiento.accuracy * 100).toFixed(1)}% | 
                Prec: ${(r.metricas_entrenamiento.precision * 100).toFixed(1)}% | 
                Rec: ${(r.metricas_entrenamiento.recall * 100).toFixed(1)}% | 
                F1: ${(r.metricas_entrenamiento.f1_score * 100).toFixed(1)}%
              </div>
            `;
            modelsDiv.appendChild(modelRow);
          },
        );

        metricas.appendChild(modelsDiv);
        tempContainer.appendChild(metricas);
      }

      // Agregar al DOM
      document.body.appendChild(tempContainer);

      // Esperar a que carguen las imágenes
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Capturar
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Generar PDF
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 10, 10, imgWidth, imgHeight);

      const filename = `prediccion_${pred.id}_${formatDate(
        pred.fecha ?? pred.created_at,
      )
        .replace(/\s/g, "_")
        .replace(/:/g, "-")}.pdf`;

      const blob = pdf.output("blob");
      return { blob, filename };
    } finally {
      if (tempContainer.parentNode) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  const exportToPDF = async () => {
    if (!selected) {
      toast.error("No hay predicción seleccionada");
      return;
    }
    try {
      toast.loading("Generando PDF...");
      const { blob, filename } = await generatePDFBlob(selected);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("PDF exportado exitosamente");
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      toast.dismiss();
      toast.error("Error al exportar el PDF");
    }
  };

  const sendEmailWithPDF = async () => {
    if (!selected) return;
    const email = emailInput.trim();
    if (!email) {
      toast.error("Ingresa un correo electrónico");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }

    const webhookUrl = process.env.NEXT_PUBLIC_SEND_EMAIL_WEBHOOK;
    if (!webhookUrl) {
      toast.error("Webhook de envío no configurado");
      return;
    }

    setSendingEmail(true);
    try {
      toast.loading("Generando PDF y enviando...");
      const { blob, filename } = await generatePDFBlob(selected);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const payload: Record<string, string> = {
        email,
        subject: `Reporte de Predicción #${selected.id} - ${diseaseName(selected.fase2_resumen?.clase_predicha ?? "Sin clasificar")}`,
        title: `Reporte de Predicción #${selected.id}`,
        pdf: base64,
        filename,
      };
      if (phoneInput.trim()) {
        payload.phone = phoneInput.trim();
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      toast.dismiss();
      toast.success("Reporte enviado por correo exitosamente");
      setEmailModalOpen(false);
      setEmailInput("");
      setPhoneInput("");
    } catch (error) {
      console.error("Error al enviar correo:", error);
      toast.dismiss();
      toast.error("Error al enviar el reporte por correo");
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await getPredictionHistory();
        setPredictions(res.data ?? []);
      } catch {
        toast.error("No se pudo cargar el historial de predicciones");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateImageSize = () => {
    const img = imageRef.current;
    if (!img) return;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setDisplaySize({ width: img.clientWidth, height: img.clientHeight });
  };

  useEffect(() => {
    const onResize = () => updateImageSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [selected]);

  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    c.scrollLeft = Math.max(0, (c.scrollWidth - c.clientWidth) / 2);
    c.scrollTop = Math.max(0, (c.scrollHeight - c.clientHeight) / 2);
  }, [zoomLevel, displaySize.width, displaySize.height, selected]);

  const renderBoxes: RenderBox[] = useMemo(() => {
    const preds = selected?.fase1_payload?.predictions;
    if (!preds?.length) return [];
    if (
      !naturalSize.width ||
      !naturalSize.height ||
      !displaySize.width ||
      !displaySize.height
    )
      return [];

    const sx = displaySize.width / naturalSize.width;
    const sy = displaySize.height / naturalSize.height;

    return preds.map((p: RoboflowPrediction) => ({
      left: (p.x - p.width / 2) * sx,
      top: (p.y - p.height / 2) * sy,
      width: p.width * sx,
      height: p.height * sy,
      label: p.class,
      confidence: p.confidence,
    }));
  }, [selected, naturalSize, displaySize]);

  const fase2 = selected?.fase2_payload as MultiModelEvaluationResult | null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setSelected(null);
              setZoomLevel(1);
              setNaturalSize({ width: 0, height: 0 });
              setDisplaySize({ width: 0, height: 0 });
            }}
            className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line
                x1="19"
                y1="12"
                x2="5"
                y2="12"
              />
              <polyline points="12,19 5,12 12,5" />
            </svg>
            Volver al historial
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEmailModalOpen(true)}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Enviar por correo
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line
                  x1="12"
                  y1="19"
                  x2="12"
                  y2="5"
                />
                <polyline points="9 15 12 18 15 15" />
              </svg>
              Exportar a PDF
            </button>
          </div>
        </div>

        {emailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800">
                  Enviar reporte por correo
                </h2>
                <button
                  onClick={() => {
                    if (!sendingEmail) {
                      setEmailModalOpen(false);
                      setEmailInput("");
                      setPhoneInput("");
                    }
                  }}
                  disabled={sendingEmail}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm text-slate-600">
                  Se generará el PDF del reporte y se enviará al correo que
                  indiques. Opcionalmente por WhatsApp.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    disabled={sendingEmail}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Teléfono (WhatsApp, opcional)
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+51987654321"
                    disabled={sendingEmail}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end p-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    if (!sendingEmail) {
                      setEmailModalOpen(false);
                      setEmailInput("");
                      setPhoneInput("");
                    }
                  }}
                  disabled={sendingEmail}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={sendEmailWithPDF}
                  disabled={sendingEmail}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {sendingEmail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Generar y enviar"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Imagen con bounding boxes */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-lg">
                Predicción #{selected.id}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Zoom</span>
                {ZOOM_OPTIONS.map((o) => (
                  <button
                    key={o}
                    onClick={() => setZoomLevel(o)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                      zoomLevel === o
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    x{o}
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="overflow-auto rounded-lg border border-slate-100 bg-slate-50"
              style={{ maxHeight: "70vh" }}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imageRef}
                      src={selected.imagen_url}
                      alt={`Predicción ${selected.id}`}
                      className="max-w-full h-auto rounded-lg"
                      onLoad={updateImageSize}
                      crossOrigin="anonymous"
                    />
                    {renderBoxes.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none">
                        {renderBoxes.map((box, i) => {
                          const color = boxColor(box.label);
                          return (
                            <div
                              key={i}
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
                                className="absolute -top-6 left-0 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap"
                                style={{
                                  backgroundColor: color,
                                  transform: `scale(${1 / zoomLevel})`,
                                  transformOrigin: "top left",
                                }}
                              >
                                {box.label} {(box.confidence * 100).toFixed(0)}%
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

            <p className="text-xs text-slate-400">
              {formatDate(selected.fecha ?? selected.created_at)}
            </p>
          </div>

          {/* Panel de información */}
          <div className="w-full lg:w-96 space-y-4 shrink-0">
            {/* Fase 1 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                Fase 1 — Detección
              </h3>
              {selected.fase1_resumen ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Coincidencias</span>
                    <span
                      className={`font-bold ${selected.fase1_resumen.has_matches ? "text-red-600" : "text-green-600"}`}
                    >
                      {selected.fase1_resumen.has_matches ? "Sí" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Detecciones</span>
                    <span className="font-bold text-slate-800">
                      {selected.fase1_resumen.total_detecciones}
                    </span>
                  </div>
                  {selected.fase1_resumen.clases_detectadas.length > 0 && (
                    <div>
                      <span className="text-slate-500 text-xs">Clases:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selected.fase1_resumen.clases_detectadas.map((c) => (
                          <span
                            key={c}
                            className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selected.fase1_payload && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Modelo</span>
                      <span className="text-xs font-medium text-slate-700">
                        {selected.fase1_payload.model_id}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sin datos</p>
              )}
            </div>

            {/* Fase 2 — Resumen */}
            {selected.fase2_resumen && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Fase 2 — Diagnóstico (mejor modelo)
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${classBadge(selected.fase2_resumen.clase_predicha)}`}
                    >
                      {diseaseName(selected.fase2_resumen.clase_predicha)}
                    </span>
                    <span className="text-sm font-bold text-slate-800 tabular-nums">
                      {(selected.fase2_resumen.confianza * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${classColor(selected.fase2_resumen.clase_predicha)}`}
                      style={{
                        width: `${selected.fase2_resumen.confianza * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Modelo: {modelLabel(selected.fase2_resumen.modelo)}
                  </p>
                </div>
              </div>
            )}

            {/* Fase 2 — Comparativo completo */}
            {fase2 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                  Comparativa de Modelos
                </h3>

                {fase2.resumen_comparativo && (
                  <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <span className="text-slate-400">Consenso</span>
                      <p className="font-bold">
                        {fase2.resumen_comparativo.consenso ? (
                          <span className="text-emerald-600">
                            Sí —{" "}
                            {diseaseName(
                              fase2.resumen_comparativo.clase_consenso ?? "",
                            )}
                          </span>
                        ) : (
                          <span className="text-amber-600">No</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Más confiado</span>
                      <p className="font-bold text-slate-800">
                        {modelLabel(
                          fase2.resumen_comparativo.modelo_mas_confiado,
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {Object.entries(fase2.resultados).map(
                  ([key, r]: [string, ModelResult]) => {
                    const isBest = key === fase2.mejor_modelo_global;
                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-lg border ${
                          isBest
                            ? "border-emerald-300 bg-emerald-50/60"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            {modelLabel(key)}
                            {isBest && (
                              <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                                Mejor
                              </span>
                            )}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-slate-600">
                            {(r.confianza * 100).toFixed(2)}%
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mb-1.5">
                          {diseaseName(r.clase_predicha)}
                        </p>

                        <div className="space-y-1 mb-2">
                          {r.todas_predicciones &&
                            Object.entries(r.todas_predicciones)
                              .sort(([, a], [, b]) => b - a)
                              .map(([cls, prob]) => (
                                <div
                                  key={cls}
                                  className="flex items-center gap-1.5"
                                >
                                  <span className="text-[10px] text-slate-500 w-20 truncate">
                                    {diseaseName(cls)}
                                  </span>
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${classColor(cls)}`}
                                      style={{ width: `${prob * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] tabular-nums font-medium text-slate-600 w-12 text-right">
                                    {prob < 0.0001
                                      ? "<0.01%"
                                      : `${(prob * 100).toFixed(2)}%`}
                                  </span>
                                </div>
                              ))}
                        </div>

                        <div className="grid grid-cols-4 gap-1 text-center pt-2 border-t border-slate-100">
                          {(
                            [
                              ["Acc", r.metricas_entrenamiento.accuracy],
                              ["Prec", r.metricas_entrenamiento.precision],
                              ["Rec", r.metricas_entrenamiento.recall],
                              ["F1", r.metricas_entrenamiento.f1_score],
                            ] as const
                          ).map(([label, val]) => (
                            <div
                              key={label}
                              className="bg-slate-50 rounded px-1 py-0.5"
                            >
                              <p className="text-[9px] text-slate-400">
                                {label}
                              </p>
                              <p className="text-[11px] font-bold text-slate-700 tabular-nums">
                                {(val * 100).toFixed(1)}%
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
          Historial de Predicciones
        </h1>
        <p className="text-slate-500 mt-1">
          Todas las evaluaciones realizadas por tu usuario.
        </p>
      </div>

      {predictions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500 text-lg">
            Aún no tienes predicciones registradas.
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Realiza una evaluación para verla aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {predictions.map((pred) => {
            const hasMatches = pred.fase1_resumen?.has_matches;
            const diagnosis =
              pred.fase2_resumen?.clase_predicha ?? "Sin clasificar";
            const confidence = pred.fase2_resumen?.confianza ?? 0;

            return (
              <div
                key={pred.id}
                className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col"
                onClick={() => setSelected(pred)}
              >
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pred.imagen_url}
                    alt={`Predicción ${pred.id}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      #{pred.id}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    {hasMatches ? (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {pred.fase1_resumen?.total_detecciones} detección
                        {(pred.fase1_resumen?.total_detecciones ?? 0) > 1
                          ? "es"
                          : ""}
                      </span>
                    ) : (
                      <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Sin detección
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-xs text-slate-400 mb-2">
                    {formatDate(pred.fecha ?? pred.created_at)}
                    {pred.periodo_id ? (
                      <span className="ml-2 text-xs text-blue-500">
                        Periodo #{pred.periodo_id}
                      </span>
                    ) : null}
                  </p>

                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${classBadge(diagnosis)}`}
                    >
                      {diseaseName(diagnosis)}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-slate-600">
                      {(confidence * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full ${classColor(diagnosis)}`}
                      style={{ width: `${confidence * 100}%` }}
                    />
                  </div>

                  <p className="mt-auto text-emerald-600 text-xs font-semibold flex items-center gap-1">
                    Ver detalle
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9,6 15,12 9,18" />
                    </svg>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
