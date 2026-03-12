"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPrediccionById } from "@/service/hierarchy";
import { Prediccion } from "@/types/hierarchy";
import {
  diseaseName,
  formatDate,
  classColor,
  classBadge,
  modelLabel,
  boxColor,
  resolveImageUrl,
} from "@/lib/prediction-utils";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ArrowLeft, Download } from "@/components/ui-icons";

const ZOOM_OPTIONS = [1, 2, 3] as const;

type RenderBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
};

interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

interface ModelResult {
  clase_predicha: string;
  confianza: number;
  metricas_entrenamiento: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
  todas_predicciones?: Record<string, number>;
}

interface MultiModelResult {
  mejor_modelo_global: string;
  resultados: Record<string, ModelResult>;
  resumen_comparativo?: {
    consenso: boolean;
    clase_consenso: string | null;
    modelo_mas_confiado: string;
  };
}

export default function PrediccionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { moduloId, loteId, surcoId, prediccionId } = params;

  const [prediccion, setPrediccion] = useState<Prediccion | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<(typeof ZOOM_OPTIONS)[number]>(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const modId = Array.isArray(moduloId) ? moduloId[0] : moduloId;
    const lotId = Array.isArray(loteId) ? loteId[0] : loteId;
    const surId = Array.isArray(surcoId) ? surcoId[0] : surcoId;
    const predId = Array.isArray(prediccionId) ? prediccionId[0] : prediccionId;
    if (!modId || !lotId || !surId || !predId) return;
    const load = async () => {
      try {
        const res = await getPrediccionById(modId, lotId, surId, predId);
        setPrediccion(res.data ?? null);
      } catch {
        toast.error("No se pudo cargar la predicción");
        setPrediccion(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [moduloId, loteId, surcoId, prediccionId]);

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
  }, [prediccion]);

  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    c.scrollLeft = Math.max(0, (c.scrollWidth - c.clientWidth) / 2);
    c.scrollTop = Math.max(0, (c.scrollHeight - c.clientHeight) / 2);
  }, [zoomLevel, displaySize.width, displaySize.height, prediccion]);

  const renderBoxes: RenderBox[] = useMemo(() => {
    const payload = prediccion?.fase1_payload as { predictions?: RoboflowPrediction[] } | null;
    const preds = payload?.predictions;
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

    return preds.map((p) => ({
      left: (p.x - p.width / 2) * sx,
      top: (p.y - p.height / 2) * sy,
      width: p.width * sx,
      height: p.height * sy,
      label: p.class,
      confidence: p.confidence,
    }));
  }, [prediccion, naturalSize, displaySize]);

  const fase2 = prediccion?.fase2_payload as MultiModelResult | null;

  const exportToPDF = async () => {
    if (!prediccion) {
      toast.error("No hay predicción seleccionada");
      return;
    }

    try {
      toast.loading("Generando PDF...");

      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.top = "-9999px";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = "800px";
      tempContainer.style.backgroundColor = "#ffffff";
      tempContainer.style.fontFamily = "Arial, sans-serif";
      tempContainer.style.padding = "40px";
      tempContainer.style.color = "#000";

      const diagnosis =
        prediccion.fase2_resumen?.clase_predicha ?? "Sin clasificar";
      const confidence = prediccion.fase2_resumen?.confianza ?? 0;
      const mejor_modelo = prediccion.fase2_resumen?.modelo ?? "N/A";

      const imgContainer = document.createElement("div");
      imgContainer.style.textAlign = "center";
      imgContainer.style.marginBottom = "30px";

      const img = document.createElement("img");
      img.src = resolveImageUrl(prediccion.imagen_url);
      img.style.maxWidth = "100%";
      img.style.maxHeight = "250px";
      img.style.borderRadius = "8px";
      img.style.border = "1px solid #ddd";
      img.crossOrigin = "anonymous";
      imgContainer.appendChild(img);
      tempContainer.appendChild(imgContainer);

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
      meta.textContent = `ID: #${prediccion.id} | Fecha: ${formatDate(
        prediccion.fecha ?? prediccion.created_at ?? "",
      )}`;
      meta.style.fontSize = "12px";
      meta.style.color = "#666";
      meta.style.margin = "0";
      header.appendChild(meta);
      tempContainer.appendChild(header);

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

      if (prediccion.fase1_resumen) {
        const f1Content = document.createElement("div");
        f1Content.style.fontSize = "13px";
        f1Content.style.lineHeight = "1.8";

        const hasMatches = prediccion.fase1_resumen.has_matches;
        const detections = prediccion.fase1_resumen.total_detecciones;
        const clases = prediccion.fase1_resumen.clases_detectadas
          .map((c) => diseaseName(c))
          .join(", ");

        f1Content.innerHTML = `
          <div style="margin-bottom: 8px"><strong>Estado:</strong> ${hasMatches ? "✓ Detecciones encontradas" : "✓ Sin detecciones"}</div>
          <div style="margin-bottom: 8px"><strong>Total:</strong> ${detections} objetos detectados</div>
          ${clases ? `<div style="margin-bottom: 8px"><strong>Clases:</strong> ${clases}</div>` : ""}
          <div><strong>Modelo:</strong> ${(prediccion.fase1_payload as { model_id?: string })?.model_id || "N/A"}</div>
        `;
        fase1.appendChild(f1Content);
      }
      tempContainer.appendChild(fase1);

      const fase2El = document.createElement("div");
      fase2El.style.marginBottom = "25px";
      fase2El.style.padding = "15px";
      fase2El.style.backgroundColor = "#fef3c7";
      fase2El.style.border = "1px solid #fcd34d";
      fase2El.style.borderRadius = "6px";

      const fase2Title = document.createElement("h2");
      fase2Title.textContent = "FASE 2: DIAGNÓSTICO";
      fase2Title.style.fontSize = "14px";
      fase2Title.style.fontWeight = "bold";
      fase2Title.style.margin = "0 0 12px 0";
      fase2Title.style.color = "#92400e";
      fase2El.appendChild(fase2Title);

      const f2Content = document.createElement("div");
      f2Content.style.fontSize = "13px";
      f2Content.style.lineHeight = "1.8";

      f2Content.innerHTML = `
        <div style="margin-bottom: 8px"><strong>Diagnóstico:</strong> ${diseaseName(diagnosis)}</div>
        <div style="margin-bottom: 8px"><strong>Confianza:</strong> ${(confidence * 100).toFixed(2)}%</div>
        <div><strong>Mejor Modelo:</strong> ${modelLabel(mejor_modelo)}</div>
      `;
      fase2El.appendChild(f2Content);
      tempContainer.appendChild(fase2El);

      document.body.appendChild(tempContainer);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 10, 10, imgWidth, imgHeight);

      const filename = `prediccion_${prediccion.id}_${formatDate(
        prediccion.fecha ?? prediccion.created_at ?? "",
      )
        .replace(/\s/g, "_")
        .replace(/:/g, "-")}.pdf`;

      pdf.save(filename);

      document.body.removeChild(tempContainer);

      toast.dismiss();
      toast.success("PDF exportado exitosamente");
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      toast.dismiss();
      toast.error("Error al exportar el PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando predicción...</p>
        </div>
      </div>
    );
  }

  const modId = Array.isArray(moduloId) ? moduloId[0] : moduloId;
  const lotId = Array.isArray(loteId) ? loteId[0] : loteId;
  const surId = Array.isArray(surcoId) ? surcoId[0] : surcoId;

  if (!prediccion) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Predicción no encontrada.</p>
        <Link
          href={`/dashboard/modulos/${modId}/lotes/${lotId}/surcos/${surId}/predicciones`}
          className="mt-4 inline-block text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Volver a predicciones
        </Link>
      </div>
    );
  }

  const backUrl = `/dashboard/modulos/${modId}/lotes/${lotId}/surcos/${surId}/predicciones`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={backUrl}
          className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver a predicciones
        </Link>
        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Download size={16} />
          Exportar a PDF
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Imagen con bounding boxes */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-lg">
              Predicción #{prediccion.id}
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
                  <img
                    ref={imageRef}
                    src={resolveImageUrl(prediccion.imagen_url)}
                    alt={`Predicción ${prediccion.id}`}
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
            {formatDate(prediccion.fecha ?? prediccion.created_at ?? "")}
          </p>
        </div>

        {/* Panel de información */}
        <div className="w-full lg:w-96 space-y-4 shrink-0">
          {/* Fase 1 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
              Fase 1 — Detección
            </h3>
            {prediccion.fase1_resumen ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Coincidencias</span>
                  <span
                    className={`font-bold ${prediccion.fase1_resumen.has_matches ? "text-red-600" : "text-green-600"}`}
                  >
                    {prediccion.fase1_resumen.has_matches ? "Sí" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Detecciones</span>
                  <span className="font-bold text-slate-800">
                    {prediccion.fase1_resumen.total_detecciones}
                  </span>
                </div>
                {prediccion.fase1_resumen.clases_detectadas?.length > 0 && (
                  <div>
                    <span className="text-slate-500 text-xs">Clases:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {prediccion.fase1_resumen.clases_detectadas.map((c) => (
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
                {prediccion.fase1_payload && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Modelo</span>
                    <span className="text-xs font-medium text-slate-700">
                      {(prediccion.fase1_payload as { model_id?: string })?.model_id ?? "N/A"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Sin datos</p>
            )}
          </div>

          {/* Fase 2 — Resumen */}
          {prediccion.fase2_resumen && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                Fase 2 — Diagnóstico (mejor modelo)
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${classBadge(prediccion.fase2_resumen.clase_predicha)}`}
                  >
                    {diseaseName(prediccion.fase2_resumen.clase_predicha)}
                  </span>
                  <span className="text-sm font-bold text-slate-800 tabular-nums">
                    {(prediccion.fase2_resumen.confianza * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${classColor(prediccion.fase2_resumen.clase_predicha)}`}
                    style={{
                      width: `${prediccion.fase2_resumen.confianza * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Modelo: {modelLabel(prediccion.fase2_resumen.modelo ?? "")}
                </p>
              </div>
            </div>
          )}

          {/* Fase 2 — Comparativo completo */}
          {fase2 && Object.keys(fase2.resultados ?? {}).length > 0 && (
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

                      {r.metricas_entrenamiento && (
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
                      )}
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
