"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  createLote,
  createLoteDiagnosis,
  getModulo,
  getLoteDiagnosisHistory,
  getLotesByModulo,
  getPrediccionesBySurco,
  getSurcosByLote,
} from "@/service/hierarchy";
import {
  Modulo,
  Lote,
  LoteReportRecord,
  Prediccion,
  Surco,
} from "@/types/hierarchy";
import {
  analyzeSpatialPredicciones,
  buildSpatialRecommendations,
} from "@/lib/spatial-diagnosis";
import { toast } from "sonner";
import { ArrowLeft, Map, ChevronRight, Plus, X } from "@/components/ui-icons";

export default function LotesPage() {
  const params = useParams();
  const router = useRouter();
  const moduloId = params.moduloId as string;
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [identificador, setIdentificador] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [diagnosingLoteId, setDiagnosingLoteId] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLote, setHistoryLote] = useState<Lote | null>(null);
  const [historyReports, setHistoryReports] = useState<LoteReportRecord[]>([]);

  const loadData = async () => {
    if (!moduloId) {
      setLoading(false);
      return;
    }
    try {
      const [modRes, lotesRes] = await Promise.all([
        getModulo(moduloId),
        getLotesByModulo(moduloId),
      ]);
      setModulo(modRes.data ?? null);
      setLotes(lotesRes.data ?? []);
    } catch {
      toast.error("No se pudieron cargar los datos");
      setModulo(null);
      setLotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [moduloId]);

  const handleCreateLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador.trim()) {
      toast.error("El identificador es obligatorio");
      return;
    }
    setSubmitting(true);
    try {
      await createLote(moduloId, identificador.trim(), descripcion.trim());
      toast.success("Lote creado correctamente");
      setModalOpen(false);
      setIdentificador("");
      setDescripcion("");
      await loadData();
    } catch {
      toast.error("Error al crear el lote");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchLotePredicciones = async (loteIdParam: number) => {
    const surcosRes = await getSurcosByLote(moduloId, String(loteIdParam));
    const surcos = (surcosRes.data ?? []) as Surco[];

    const predGroups = await Promise.all(
      surcos.map((s) =>
        getPrediccionesBySurco(moduloId, String(loteIdParam), String(s.id)),
      ),
    );
    const predicciones = predGroups.flatMap(
      (g) => g.data ?? [],
    ) as Prediccion[];

    return {
      predicciones,
      surcosMonitoreados: surcos.map((s) => s.id),
    };
  };

  const openHistory = async (lote: Lote) => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryLote(lote);
    try {
      const res = await getLoteDiagnosisHistory(moduloId, String(lote.id));
      setHistoryReports(res.data ?? []);
    } catch {
      toast.error("No se pudo cargar el historial de diagnóstico");
      setHistoryReports([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleGenerateDiagnosis = async (lote: Lote) => {
    try {
      setDiagnosingLoteId(lote.id);
      const { predicciones, surcosMonitoreados } = await fetchLotePredicciones(
        lote.id,
      );

      if (!predicciones.length) {
        toast.info("Este lote no tiene predicciones para diagnosticar");
        return;
      }

      const analysis = analyzeSpatialPredicciones(predicciones);
      const recomendaciones = buildSpatialRecommendations(analysis);

      await createLoteDiagnosis(moduloId, String(lote.id), {
        ...analysis,
        surcos_monitoreados: surcosMonitoreados,
        recomendaciones,
      });
      toast.success("Diagnóstico de lote guardado");

      if (historyOpen && historyLote?.id === lote.id) {
        const res = await getLoteDiagnosisHistory(moduloId, String(lote.id));
        setHistoryReports(res.data ?? []);
      }
    } catch {
      toast.error("No se pudo guardar el diagnóstico del lote");
    } finally {
      setDiagnosingLoteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!modulo) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Módulo no encontrado.</p>
        <button
          onClick={() => router.push("/dashboard/modulos")}
          className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Volver a módulos
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/modulos")}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              {modulo.nombre}
            </h1>
            <p className="text-slate-500 mt-1">Lotes del módulo</p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus size={18} />
          Nuevo lote
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                Crear lote
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={handleCreateLote}
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Identificador *
                </label>
                <input
                  type="text"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="Ej: Lote A1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción opcional"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  {submitting ? "Creando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Historial de diagnosticos
                </h2>
                <p className="text-sm text-slate-500">
                  Lote: {historyLote?.identificador ?? "-"}
                </p>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {historyLoading ? (
                <p className="text-sm text-slate-500">Cargando historial...</p>
              ) : historyReports.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No hay diagnósticos guardados.
                </p>
              ) : (
                <div className="space-y-3">
                  {historyReports.map((r) => (
                    <div
                      key={r.id}
                      className="border border-slate-200 rounded-lg p-3 bg-slate-50"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-slate-700">
                          {new Date(r.fecha_reporte).toLocaleString("es-PE")}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                          Severidad {r.indice_severidad.toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-500">
                          {r.total_predicciones} predicciones
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Tendencia: {r.tendencia} · Recomendaciones:{" "}
                        {r.recomendaciones.length}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {lotes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <Map className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">No hay lotes en este módulo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {lotes.map((lote) => {
            const diagnosing = diagnosingLoteId === lote.id;
            return (
              <div
                key={lote.id}
                className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all"
              >
                <Link
                  href={`/dashboard/modulos/${moduloId}/lotes/${lote.id}/surcos`}
                  className="group flex items-center justify-between p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                      <Map size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">
                        {lote.identificador}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-1">
                        {lote.descripcion || "Sin descripción"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
                </Link>

                <div className="px-6 pb-5 flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateDiagnosis(lote)}
                    disabled={diagnosing}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                  >
                    {diagnosing ? "Generando..." : "Generar diagnostico"}
                  </button>
                  <button
                    onClick={() => openHistory(lote)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    Ver historial
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
