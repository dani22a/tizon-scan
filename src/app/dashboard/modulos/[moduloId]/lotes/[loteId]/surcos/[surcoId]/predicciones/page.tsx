"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getModulo,
  getLotesByModulo,
  getSurcosByLote,
  getPrediccionesBySurco,
  evaluarSurco,
} from "@/service/hierarchy";
import { Modulo, Lote, Surco, Prediccion } from "@/types/hierarchy";
import {
  diseaseName,
  formatDate,
  classBadge,
  classColor,
  resolveImageUrl,
} from "@/lib/prediction-utils";
import { toast } from "sonner";
import { ArrowLeft, Upload, Camera, ChevronRight } from "@/components/ui-icons";

export default function PrediccionesPage() {
  const params = useParams();
  const router = useRouter();
  const moduloId = params.moduloId as string;
  const loteId = params.loteId as string;
  const surcoId = params.surcoId as string;

  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [lote, setLote] = useState<Lote | null>(null);
  const [surco, setSurco] = useState<Surco | null>(null);
  const [predicciones, setPredicciones] = useState<Prediccion[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    if (!moduloId || !loteId || !surcoId) return;
    try {
      const [modRes, lotesRes, surcosRes, predRes] = await Promise.all([
        getModulo(moduloId),
        getLotesByModulo(moduloId),
        getSurcosByLote(moduloId, loteId),
        getPrediccionesBySurco(moduloId, loteId, surcoId),
      ]);
      setModulo(modRes.data ?? null);
      const lotes = lotesRes.data ?? [];
      setLote(lotes.find((l) => l.id === Number(loteId)) ?? lotes[0] ?? null);
      const surcos = surcosRes.data ?? [];
      setSurco(surcos.find((s) => s.id === Number(surcoId)) ?? surcos[0] ?? null);
      setPredicciones(predRes.data ?? []);
    } catch {
      toast.error("No se pudieron cargar los datos");
      setModulo(null);
      setLote(null);
      setSurco(null);
      setPredicciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [moduloId, loteId, surcoId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !moduloId || !loteId || !surcoId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen válido");
      return;
    }
    try {
      setLoading(true);
      const res = await evaluarSurco(moduloId, loteId, surcoId, file);
      if (res.data?.id) {
        toast.success("Evaluación completada");
        router.push(
          `/dashboard/modulos/${moduloId}/lotes/${loteId}/surcos/${surcoId}/predicciones/${res.data.id}`,
        );
      }
    } catch (err) {
      console.error("Error al evaluar imagen:", err);
      toast.error("Error al evaluar la imagen. Intenta de nuevo.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  if (!modulo || !lote || !surco) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">No se encontró el recurso.</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              router.push(
                `/dashboard/modulos/${moduloId}/lotes/${loteId}/surcos`,
              )
            }
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              Predicciones — Surco {surco.numero}
            </h1>
            <p className="text-slate-500 mt-1">
              {modulo.nombre} → {lote.identificador}
            </p>
          </div>
        </div>

        <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Upload size={18} />
          Nueva evaluación
        </label>
      </div>

      {predicciones.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <Camera className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">
            No hay predicciones en este surco.
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Sube una foto para comenzar las evaluaciones.
          </p>
          <label className="mt-6 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium cursor-pointer transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <Upload size={18} />
            Subir imagen
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {predicciones.map((pred) => {
            const hasMatches = pred.fase1_resumen?.has_matches;
            const diagnosis =
              pred.fase2_resumen?.clase_predicha ?? "Sin clasificar";
            const confidence = pred.fase2_resumen?.confianza ?? 0;

            return (
              <Link
                key={pred.id}
                href={`/dashboard/modulos/${moduloId}/lotes/${loteId}/surcos/${surcoId}/predicciones/${pred.id}`}
                className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col"
              >
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={resolveImageUrl(pred.imagen_url)}
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
                        {pred.fase1_resumen?.total_detecciones ?? 0} detección
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
                    {formatDate(pred.fecha ?? pred.created_at ?? "")}
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
                    <ChevronRight size={14} />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
