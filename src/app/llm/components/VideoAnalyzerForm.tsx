"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import VideoTimeline from "./VideoTimeline";
import VideoSelector from "./VideoSelector";
import ModelSelector from "./ModelSelector";
import { getPeriodos, saveVideoAnalisis } from "@/service/evaluation";
import type { Periodo } from "@/types/evaluation";
import type { AnalysisResult } from "../types/analysis";

export default function VideoAnalyzerForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | "">("");
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [videoForTimeline, setVideoForTimeline] = useState<File | null>(null);

  useEffect(() => {
    getPeriodos()
      .then((res) => setPeriodos(res.data || []))
      .catch(() => setPeriodos([]));
  }, []);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
  };

  const handleValidationError = (message: string | null) => {
    if (message) {
      setError(message);
    } else {
      setError((prev) => (prev === "Solo se permiten archivos .mp4 o .mov" ? null : prev));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setAnalysisResult(null);
    setVideoForTimeline(null);

    if (!selectedFile) {
      setError("Debes seleccionar un archivo de video");
      return;
    }

    if (!email.trim()) {
      setError("El correo electrónico es requerido");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("El correo electrónico no es válido");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("video", selectedFile);
      formData.append("email", email.trim());
      if (phone.trim()) {
        formData.append("phone", phone.trim());
      }
      if (selectedModel) {
        formData.append("model", selectedModel);
      }
      if (selectedPeriodoId !== "") {
        formData.append("periodo_id", String(selectedPeriodoId));
      }

      const res = await fetch("/api/analyze-video", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Error al analizar el video");
      }

      setSuccess(true);
      if (data.analysis) {
        setAnalysisResult(data.analysis);
        setVideoForTimeline(selectedFile);

        const periodoId =
          selectedPeriodoId !== "" ? Number(selectedPeriodoId) : null;
        saveVideoAnalisis({
          periodo_id: periodoId,
          nombre_archivo: selectedFile.name,
          analysis_payload: data.analysis as Record<string, unknown>,
        }).catch((err) => {
          console.warn("No se pudo guardar en historial:", err);
        });
      }
      setSelectedFile(null);
      setEmail("");
      setPhone("");
      toast.success("Análisis completado. Revisa tu correo para el PDF.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatSegundo = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = Math.floor(seg % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const hasResult = success && analysisResult;

  return (
    <div
      className={`grid gap-6 xl:gap-8 items-start ${
        hasResult
          ? "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)_minmax(320px,400px)]"
          : "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]"
      }`}
    >
      {/* Columna izquierda: video + resultado (cuando hay) */}
      <div className="space-y-6 min-w-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <VideoSelector
            selectedFile={selectedFile}
            onFileChange={handleFileChange}
            onValidationError={handleValidationError}
            disabled={loading}
            error={error === "Solo se permiten archivos .mp4 o .mov" ? error : null}
          />
        </div>

        {success && videoForTimeline && analysisResult?.timeline_anotaciones && analysisResult.timeline_anotaciones.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Timeline del video
            </p>
            <VideoTimeline
              videoFile={videoForTimeline}
              timelineAnotaciones={analysisResult.timeline_anotaciones}
            />
          </div>
        )}
      </div>

      {/* Columna derecha: formulario */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4 xl:sticky xl:top-8 xl:self-start"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Análisis de video con IA
          </h2>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Sube un video de hojas de papa para diagnosticar masivamente Tizón Tardío.
            El reporte se envía por correo y resumen por WhatsApp.
          </p>
        </div>

        <ModelSelector
          value={selectedModel}
          onChange={setSelectedModel}
          disabled={loading}
        />

        <div>
          <label
            htmlFor="periodo"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Campaña (periodo)
          </label>
          <select
            id="periodo"
            value={selectedPeriodoId}
            onChange={(e) =>
              setSelectedPeriodoId(e.target.value === "" ? "" : Number(e.target.value))
            }
            disabled={loading}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 text-sm disabled:opacity-50"
          >
            <option value="">Sin campaña</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Vincula el análisis a una campaña para el historial
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 text-sm placeholder:text-slate-400 disabled:opacity-50"
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Teléfono (WhatsApp)
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+51987654321"
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 text-sm placeholder:text-slate-400 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">
              Código de país (ej. +51)
            </p>
          </div>
        </div>

        {error && error !== "Solo se permiten archivos .mp4 o .mov" && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
            Análisis completado. Revisa tu correo para el PDF.
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedFile || !email.trim()}
          className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analizando... Espera unos minutos
            </>
          ) : (
            "Analizar y enviar reporte"
          )}
        </button>

        {loading && (
          <p className="text-center text-xs text-slate-500">
            Subida, análisis con Gemini y generación del PDF.
          </p>
        )}
      </form>

      {success && analysisResult && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5 xl:sticky xl:top-8 xl:self-start overflow-y-auto max-h-[calc(100vh-7rem)]">
          <h3 className="text-lg font-bold text-slate-800">
            Resultado del análisis
          </h3>

          {/* Nivel de alerta */}
          {analysisResult.nivel_alerta && (
            <div
              className={`p-3 rounded-lg border text-center ${
                analysisResult.nivel_alerta === "critico"
                  ? "bg-red-50 border-red-200"
                  : analysisResult.nivel_alerta === "alto"
                    ? "bg-orange-50 border-orange-200"
                    : analysisResult.nivel_alerta === "moderado"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-green-50 border-green-200"
              }`}
            >
              <p
                className={`text-lg font-bold ${
                  analysisResult.nivel_alerta === "critico"
                    ? "text-red-700"
                    : analysisResult.nivel_alerta === "alto"
                      ? "text-orange-700"
                      : analysisResult.nivel_alerta === "moderado"
                        ? "text-amber-700"
                        : "text-green-700"
                }`}
              >
                Nivel de alerta: {analysisResult.nivel_alerta.toUpperCase()}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <p className="text-2xl font-bold text-slate-800">
                {analysisResult.analisis_general.total_hojas}
              </p>
              <p className="text-xs text-slate-500">Total hojas</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
              <p className="text-2xl font-bold text-green-700">
                {analysisResult.analisis_general.sanas}
              </p>
              <p className="text-xs text-slate-500">
                Sanas ({analysisResult.analisis_general.porcentaje_sanas ?? "-"}%)
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
              <p className="text-2xl font-bold text-amber-700">
                {analysisResult.analisis_general.enfermas}
              </p>
              <p className="text-xs text-slate-500">
                Tizón Tardío ({analysisResult.analisis_general.porcentaje_enfermas ?? "-"}%)
              </p>
            </div>
          </div>

          {/* Desglose por severidad */}
          {analysisResult.desglose_por_severidad &&
            (analysisResult.desglose_por_severidad.leve > 0 ||
              analysisResult.desglose_por_severidad.moderado > 0 ||
              analysisResult.desglose_por_severidad.severo > 0) && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Desglose por severidad
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-yellow-50 border border-yellow-200 text-center">
                    <span className="text-lg font-bold text-yellow-700">
                      {analysisResult.desglose_por_severidad.leve}
                    </span>
                    <p className="text-xs text-yellow-600">Leve (&lt;25%)</p>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-50 border border-orange-200 text-center">
                    <span className="text-lg font-bold text-orange-700">
                      {analysisResult.desglose_por_severidad.moderado}
                    </span>
                    <p className="text-xs text-orange-600">Moderado (25-60%)</p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-center">
                    <span className="text-lg font-bold text-red-700">
                      {analysisResult.desglose_por_severidad.severo}
                    </span>
                    <p className="text-xs text-red-600">Severo (&gt;60%)</p>
                  </div>
                </div>
              </div>
            )}

          {/* Recomendaciones fitosanitarias */}
          {analysisResult.recomendaciones &&
            analysisResult.recomendaciones.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Recomendaciones fitosanitarias
                </p>
                <ul className="space-y-2 list-decimal list-inside text-sm text-slate-700">
                  {analysisResult.recomendaciones.map((rec, idx) => (
                    <li key={idx} className="pl-1">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {analysisResult.segmentos_analizados.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Segmentos analizados
              </p>
              <div className="space-y-2">
                {analysisResult.segmentos_analizados.map((seg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                  >
                    <span className="font-mono text-slate-600">
                      {formatSegundo(seg.tiempo_inicio)} – {formatSegundo(seg.tiempo_fin)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        seg.enfermedad_detectada === "ninguna"
                          ? "bg-slate-200 text-slate-600"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {seg.enfermedad_detectada}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {seg.confianza_porcentaje <= 1
                        ? `${(seg.confianza_porcentaje * 100).toFixed(0)}%`
                        : `${seg.confianza_porcentaje}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
