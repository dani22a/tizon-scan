"use client";

import { useState } from "react";
import { toast } from "sonner";
import { evaluationImage, evaluationRoboflow } from "@/service/evaluation";
import {
  MultiModelEvaluationResult,
  ModelResult,
  RoboflowDetection,
} from "@/types/evaluation";

type BatchStatus = "pending" | "processing" | "done" | "skipped" | "error";

interface BatchItem {
  id: number;
  file: File;
  name: string;
  preview: string;
  status: BatchStatus;
  roboflow?: RoboflowDetection | null;
  classification?: MultiModelEvaluationResult | null;
  roboflowMessage?: string;
  error?: string;
}

const MODEL_DISPLAY: Record<string, { label: string }> = {
  efficient: { label: "EfficientNet" },
  resnet: { label: "ResNet" },
  mobilevit: { label: "MobileViT" },
};

function getModelMeta(key: string) {
  return MODEL_DISPLAY[key] || { label: key };
}

function getDiseaseName(cls: string): string {
  const map: Record<string, string> = {
    Potato___Early_blight: "Tizón Temprano",
    Potato___Late_blight: "Tizón Tardío",
    Potato___healthy: "Saludable",
  };
  return map[cls] ?? cls;
}

export default function EvaluationBatchPage() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const mapped: BatchItem[] = files.map((file, index) => ({
      id: Date.now() + index,
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
      status: "pending",
    }));

    setItems(mapped);
  };

  const runBatch = async () => {
    if (!items.length) {
      toast.info("Selecciona al menos una imagen para evaluar");
      return;
    }

    setIsProcessing(true);

    for (let i = 0; i < items.length; i++) {
      const current = items[i];

      setItems((prev) =>
        prev.map((it, idx) =>
          idx === i ? { ...it, status: "processing", error: undefined } : it,
        ),
      );

      try {
        const detection = await evaluationRoboflow(current.file);

        if (!detection.data.has_matches || !detection.data.predictions.length) {
          setItems((prev) =>
            prev.map((it, idx) =>
              idx === i
                ? {
                    ...it,
                    roboflow: detection.data,
                    status: "skipped",
                    roboflowMessage:
                      "No se detectó ninguna hoja válida. No se ejecutó la clasificación.",
                  }
                : it,
            ),
          );
          continue;
        }

        const classification = await evaluationImage(current.file);

        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  roboflow: detection.data,
                  classification: classification.data.clasificacion,
                  status: "done",
                  roboflowMessage: detection.message || "Detección completada",
                }
              : it,
          ),
        );
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Error al evaluar la imagen";
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: "error", error: msg } : it,
          ),
        );
      }
    }

    setIsProcessing(false);
  };

  const statusLabel: Record<BatchStatus, { text: string; color: string }> = {
    pending: { text: "Pendiente", color: "bg-slate-100 text-slate-700" },
    processing: { text: "Procesando", color: "bg-blue-100 text-blue-700" },
    done: { text: "Completado", color: "bg-emerald-100 text-emerald-700" },
    skipped: {
      text: "Sin clasificación",
      color: "bg-amber-100 text-amber-700",
    },
    error: { text: "Error", color: "bg-red-100 text-red-700" },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            Evaluación por Bloques
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Analiza múltiples imágenes de hojas de papa en un solo flujo. Para
            cada imagen se ejecuta primero la detección con YoloV8 y luego la
            clasificación con los modelos de enfermedad.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <label className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50">
            Seleccionar imágenes
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelect}
            />
          </label>
          <button
            onClick={runBatch}
            disabled={isProcessing || !items.length}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isProcessing ? "Procesando..." : "Iniciar evaluación"}
          </button>
        </div>
      </div>

      {!items.length ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <p className="text-slate-500 text-lg">
            Selecciona imágenes para comenzar la evaluación por bloques.
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Puedes cargar varias hojas de diferentes plantas y el sistema
            analizará cada una de forma secuencial.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((item) => {
            const status = statusLabel[item.status];
            const detection = item.roboflow;
            const result = item.classification;

            const bestModelKey = result?.mejor_modelo_global;
            const bestModel =
              bestModelKey && result ? result.resultados[bestModelKey] : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden"
              >
                <div className="relative h-40 bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.preview}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex flex-wrap gap-2">
                    <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {item.name}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}
                    >
                      {status.text}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col space-y-3">
                  {/* Paso 1: Detección */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-700 mb-1">
                      Paso 1 — Detección (YoloV8)
                    </p>
                    {detection ? (
                      <div className="text-xs text-slate-600 space-y-1">
                        <p>
                          Modelo:{" "}
                          <span className="font-mono">
                            {detection.model_id}
                          </span>
                        </p>
                        <p>
                          Detecciones:{" "}
                          <span className="font-semibold">
                            {detection.predictions.length}
                          </span>
                        </p>
                        <p>
                          Coincidencias:{" "}
                          <span className="font-semibold">
                            {detection.has_matches ? "Sí" : "No"}
                          </span>
                        </p>
                        {item.roboflowMessage && (
                          <p className="mt-1 text-slate-500">
                            {item.roboflowMessage}
                          </p>
                        )}
                      </div>
                    ) : item.status === "processing" ? (
                      <p className="text-xs text-slate-400">
                        Ejecutando detección...
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Aún no se ha ejecutado la detección.
                      </p>
                    )}
                  </div>

                  {/* Paso 2: Clasificación */}
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex-1">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">
                      Paso 2 — Clasificación por modelos
                    </p>
                    {result ? (
                      <div className="space-y-2 text-xs">
                        {bestModel && bestModelKey && (
                          <div className="mb-1">
                            <p className="text-[11px] text-emerald-600 font-semibold">
                              Mejor modelo: {getModelMeta(bestModelKey).label}
                            </p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">
                              {getDiseaseName(bestModel.clase_predicha)}
                            </p>
                            <p className="text-xs text-slate-600">
                              Confianza:{" "}
                              {(bestModel.confianza * 100).toFixed(2)}%
                            </p>
                          </div>
                        )}
                        <div className="space-y-1 mt-2">
                          {Object.entries(result.resultados).map(
                            ([key, m]: [string, ModelResult]) => (
                              <div
                                key={key}
                                className="flex items-center justify-between text-[11px] bg-white rounded-md px-2 py-1 border border-slate-100"
                              >
                                <span className="font-semibold text-slate-700">
                                  {getModelMeta(key).label}
                                </span>
                                <span className="text-slate-500">
                                  {getDiseaseName(m.clase_predicha)}
                                </span>
                                <span className="font-semibold text-slate-800 tabular-nums">
                                  {(m.confianza * 100).toFixed(1)}%
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ) : detection &&
                      !detection.has_matches &&
                      item.status !== "processing" ? (
                      <p className="text-xs text-slate-500 mt-1">
                        No se realizó la clasificación porque no se detectó
                        ninguna hoja válida.
                      </p>
                    ) : item.status === "processing" ? (
                      <p className="text-xs text-slate-400">
                        Clasificando imagen...
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Aún no se ha ejecutado la clasificación.
                      </p>
                    )}
                  </div>

                  {item.error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                      {item.error}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
