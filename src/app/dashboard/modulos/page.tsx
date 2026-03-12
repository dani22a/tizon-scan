"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  createModulo,
  createModuloDiagnosis,
  getLotesByModulo,
  getModuloDiagnosisHistory,
  getModulos,
  getPrediccionesBySurco,
  getSurcosByLote,
} from "@/service/hierarchy";
import { Modulo, ModuloReportRecord, Prediccion } from "@/types/hierarchy";
import {
  analyzeSpatialPredicciones,
  buildSpatialRecommendations,
} from "@/lib/spatial-diagnosis";
import { toast } from "sonner";
import { Layers, ChevronRight, Plus, X } from "@/components/ui-icons";

export default function ModulosPage() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [diagnosingModuloId, setDiagnosingModuloId] = useState<number | null>(
    null,
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyModulo, setHistoryModulo] = useState<Modulo | null>(null);
  const [historyReports, setHistoryReports] = useState<ModuloReportRecord[]>(
    [],
  );

  const loadModulos = async () => {
    try {
      const res = await getModulos();
      setModulos(res.data ?? []);
    } catch {
      toast.error("No se pudieron cargar los módulos");
      setModulos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModulos();
  }, []);

  const handleCreateModulo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSubmitting(true);
    try {
      await createModulo(nombre.trim(), descripcion.trim());
      toast.success("Módulo creado correctamente");
      setModalOpen(false);
      setNombre("");
      setDescripcion("");
      await loadModulos();
    } catch {
      toast.error("Error al crear el módulo");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchModuloPredicciones = async (moduloId: number) => {
    const lotesRes = await getLotesByModulo(String(moduloId));
    const lotes = lotesRes.data ?? [];

    const surcosGroups = await Promise.all(
      lotes.map((l) => getSurcosByLote(String(moduloId), String(l.id))),
    );
    const surcos = surcosGroups.flatMap((g) => g.data ?? []);

    const predGroups = await Promise.all(
      surcos.map((s) =>
        getPrediccionesBySurco(
          String(moduloId),
          String(s.lote_id),
          String(s.id),
        ),
      ),
    );
    const predicciones = predGroups.flatMap(
      (g) => g.data ?? [],
    ) as Prediccion[];

    return {
      predicciones,
      lotesMonitoreados: lotes.map((l) => l.id),
      surcosMonitoreados: surcos.map((s) => s.id),
    };
  };

  const openHistory = async (modulo: Modulo) => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryModulo(modulo);
    try {
      const res = await getModuloDiagnosisHistory(String(modulo.id));
      setHistoryReports(res.data ?? []);
    } catch {
      toast.error("No se pudo cargar el historial de diagnóstico");
      setHistoryReports([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleGenerateDiagnosis = async (modulo: Modulo) => {
    try {
      setDiagnosingModuloId(modulo.id);
      const { predicciones, lotesMonitoreados, surcosMonitoreados } =
        await fetchModuloPredicciones(modulo.id);

      if (!predicciones.length) {
        toast.info("Este módulo no tiene predicciones para diagnosticar");
        return;
      }

      const analysis = analyzeSpatialPredicciones(predicciones);
      const recomendaciones = buildSpatialRecommendations(analysis);

      await createModuloDiagnosis(String(modulo.id), {
        ...analysis,
        lotes_monitoreados: lotesMonitoreados,
        surcos_monitoreados: surcosMonitoreados,
        recomendaciones,
      });
      toast.success("Diagnóstico de módulo guardado");

      if (historyOpen && historyModulo?.id === modulo.id) {
        const res = await getModuloDiagnosisHistory(String(modulo.id));
        setHistoryReports(res.data ?? []);
      }
    } catch {
      toast.error("No se pudo guardar el diagnóstico del módulo");
    } finally {
      setDiagnosingModuloId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando módulos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            Módulos
          </h1>
          <p className="text-slate-500 mt-1">
            Selecciona un módulo para ver sus lotes y surcos.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus size={18} />
          Nuevo módulo
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                Crear módulo
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={handleCreateModulo}
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Módulo Norte"
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
                  Modulo: {historyModulo?.nombre ?? "-"}
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

      {modulos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <Layers className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">No hay módulos registrados.</p>
          <p className="text-slate-400 text-sm mt-1">
            Crea un módulo con el botón de arriba.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {modulos.map((modulo) => {
            const diagnosing = diagnosingModuloId === modulo.id;
            return (
              <div
                key={modulo.id}
                className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all"
              >
                <Link
                  href={`/dashboard/modulos/${modulo.id}/lotes`}
                  className="group flex items-center justify-between p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <Layers size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">
                        Modulo: {modulo.nombre}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-1">
                        {modulo.descripcion || "Sin descripción"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
                </Link>

                <div className="px-6 pb-5 flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateDiagnosis(modulo)}
                    disabled={diagnosing}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                  >
                    {diagnosing ? "Generando..." : "Generar diagnostico"}
                  </button>
                  <button
                    onClick={() => openHistory(modulo)}
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
