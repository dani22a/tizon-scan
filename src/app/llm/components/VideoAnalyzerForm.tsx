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
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState("reporte-analisis-papa.pdf");

  useEffect(() => {
    return () => {
      if (pdfDownloadUrl) {
        URL.revokeObjectURL(pdfDownloadUrl);
      }
    };
  }, [pdfDownloadUrl]);

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
    if (pdfDownloadUrl) {
      URL.revokeObjectURL(pdfDownloadUrl);
      setPdfDownloadUrl(null);
    }
    setPdfFileName("reporte-analisis-papa.pdf");

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
      if (typeof data.pdfBase64 === "string" && data.pdfBase64) {
        const binary = atob(data.pdfBase64);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const nextUrl = URL.createObjectURL(blob);
        setPdfDownloadUrl(nextUrl);
        setPdfFileName(
          typeof data.pdfFileName === "string" && data.pdfFileName
            ? data.pdfFileName
            : "reporte-analisis-papa.pdf"
        );
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
      className={`grid items-start gap-5 xl:gap-6 ${
        hasResult
          ? "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)_minmax(320px,390px)]"
          : "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]"
      }`}
    >
      <div className="min-w-0 space-y-4">
        <div className="app-shell-panel overflow-hidden rounded-[26px]">
          <VideoSelector
            selectedFile={selectedFile}
            onFileChange={handleFileChange}
            onValidationError={handleValidationError}
            disabled={loading}
            error={error === "Solo se permiten archivos .mp4 o .mov" ? error : null}
          />
        </div>

        {success && videoForTimeline && analysisResult?.timeline_anotaciones && analysisResult.timeline_anotaciones.length > 0 && (
          <div className="app-shell-panel overflow-hidden rounded-[26px] p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
              Timeline del video
            </p>
            <VideoTimeline
              videoFile={videoForTimeline}
              timelineAnotaciones={analysisResult.timeline_anotaciones}
            />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="app-shell-panel space-y-4 rounded-[26px] p-1.5 xl:sticky xl:top-6 xl:self-start"
      >
        <div className="rounded-[22px] bg-linear-to-br from-brand-950 via-brand-900 to-brand-700 px-4 py-4 text-white">
          <p className="text-[10px] uppercase tracking-[0.26em] text-brand-100/75">
            Submit node
          </p>
          <h2 className="mt-1.5 text-base font-semibold sm:text-lg">
            Análisis de video con IA
          </h2>
          <p className="mt-1.5 text-xs leading-5 text-brand-100/80">
            Sube un video de hojas de papa para diagnosticar masivamente Tizón Tardío.
            El reporte se envía por correo y resumen por WhatsApp.
          </p>
        </div>

        <div className="space-y-3 rounded-[22px] border border-slate-100/80 bg-white/55 p-3.5">
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={loading}
          />

          <div>
          <label
            htmlFor="periodo"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
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
            className="w-full rounded-xl border border-brand-100 bg-white/90 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          >
            <option value="">Sin campaña</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            Vincula el análisis a una campaña para el historial
          </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-[22px] border border-slate-100/80 bg-white/55 p-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
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
              className="w-full rounded-xl border border-brand-100 bg-white/90 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
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
              className="w-full rounded-xl border border-brand-100 bg-white/90 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Código de país (ej. +51)
            </p>
          </div>
        </div>

        {error && error !== "Solo se permiten archivos .mp4 o .mov" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="space-y-3 rounded-[20px] border border-brand-200 bg-brand-50 px-3 py-3 text-sm text-brand-800">
            <p>Análisis completado. Revisa tu correo para el PDF.</p>
            {pdfDownloadUrl && (
              <a
                href={pdfDownloadUrl}
                download={pdfFileName}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar PDF
              </a>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedFile || !email.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_20px_40px_-25px_rgba(37,99,235,0.9)] transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand-600"
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
        <div className="app-shell-panel max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto rounded-[26px] p-4 sm:p-5 xl:sticky xl:top-6 xl:self-start">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Resultado del análisis
          </h3>

          {analysisResult.nivel_alerta && (
            <div
              className={`p-4 rounded-[24px] border text-center ${
                analysisResult.nivel_alerta === "critico"
                  ? "bg-red-50 border-red-200"
                  : analysisResult.nivel_alerta === "alto"
                    ? "bg-orange-50 border-orange-200"
                    : analysisResult.nivel_alerta === "moderado"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-brand-50 border-brand-200"
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
                        : "text-brand-700"
                }`}
              >
                Nivel de alerta: {analysisResult.nivel_alerta.toUpperCase()}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-2xl font-bold text-slate-800">
                {analysisResult.analisis_general.total_hojas}
              </p>
              <p className="text-xs text-slate-500">Total hojas</p>
            </div>
            <div className="p-3 rounded-2xl bg-brand-50 border border-brand-200 text-center">
              <p className="text-2xl font-bold text-brand-700">
                {analysisResult.analisis_general.sanas}
              </p>
              <p className="text-xs text-slate-500">
                Sanas ({analysisResult.analisis_general.porcentaje_sanas ?? "-"}%)
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
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
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 mb-2">
                  Desglose por severidad
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-2xl bg-yellow-50 border border-yellow-200 text-center">
                    <span className="text-lg font-bold text-yellow-700">
                      {analysisResult.desglose_por_severidad.leve}
                    </span>
                    <p className="text-xs text-yellow-600">Leve (&lt;25%)</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-orange-50 border border-orange-200 text-center">
                    <span className="text-lg font-bold text-orange-700">
                      {analysisResult.desglose_por_severidad.moderado}
                    </span>
                    <p className="text-xs text-orange-600">Moderado (25-60%)</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-red-50 border border-red-200 text-center">
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
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 mb-2">
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
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 mb-2">
                Segmentos analizados
              </p>
              <div className="space-y-2">
                {analysisResult.segmentos_analizados.map((seg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
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
