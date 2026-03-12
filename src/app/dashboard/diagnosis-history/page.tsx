"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDiagnosisRecommendations } from "@/service/evaluation";
import {
  DiagnosisRecommendationRecord,
  DiagnosisReportSummary,
} from "@/types/evaluation";

const DISEASE_SHORT: Record<string, string> = {
  Potato___Early_blight: "Tizón Temprano",
  Potato___Late_blight: "Tizón Tardío",
  Potato___healthy: "Saludable",
};

function dn(cls: string | null | undefined) {
  if (!cls) return "Desconocida";
  return DISEASE_SHORT[cls] ?? cls;
}

function classBadge(cls: string | null | undefined) {
  const v = cls || "";
  if (v.includes("healthy")) return "bg-green-100 text-green-800";
  if (v.includes("Early")) return "bg-amber-100 text-amber-800";
  if (v.includes("Late")) return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

type Severity = "critical" | "warning" | "info" | "success";

const SEVERITY_STYLES: Record<
  Severity,
  { bg: string; border: string; icon: string; text: string }
> = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-300",
    icon: "🚨",
    text: "text-red-800",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    icon: "⚠️",
    text: "text-amber-800",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    icon: "💡",
    text: "text-blue-800",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-300",
    icon: "✅",
    text: "text-green-800",
  },
};

function formatReportDate(report?: DiagnosisReportSummary, fallback?: string) {
  const iso = report?.fecha || fallback;
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-ES");
}

export default function DiagnosisHistoryPage() {
  const [items, setItems] = useState<DiagnosisRecommendationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getDiagnosisRecommendations();
        setItems(res.data ?? []);
      } catch {
        toast.error("No se pudo cargar el historial de recomendaciones");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">
            Cargando recomendaciones guardadas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            Historial de Recomendaciones de Diagnóstico
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Recomendaciones generadas en todos los reportes guardados.
          </p>
        </div>
        <a
          href="/dashboard/diagnosis"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
        >
          Volver al diagnóstico actual
        </a>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <p className="text-slate-500 text-lg">
            Aún no hay recomendaciones guardadas.
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Guarda un diagnóstico desde la vista de diagnóstico para ver su
            historial aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((rec) => {
            const sev: Severity =
              (rec.severidad as Severity | null) ?? "info";
            const style = SEVERITY_STYLES[sev];
            const r = rec.report;

            return (
              <div
                key={rec.id}
                className={`rounded-xl border p-4 ${style.bg} ${style.border}`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg shrink-0">{style.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400">
                      {formatReportDate(r, rec.fecha)}
                    </p>
                    <h3 className={`font-bold text-sm ${style.text} mt-0.5 line-clamp-2`}>
                      {rec.titulo || "Recomendación sin título"}
                    </h3>
                  </div>
                </div>
                <p className={`text-xs ${style.text} opacity-80 line-clamp-5`}>
                  {rec.contenido}
                </p>

                {r && (
                  <div className="mt-3 pt-2 border-t border-white/50 text-[11px] text-slate-600 flex flex-wrap gap-2 items-center">
                    <span className="font-semibold">
                      Índice {r.indice_severidad.toFixed(0)}%
                    </span>
                    <span className="w-px h-3 bg-slate-300" />
                    <span className="capitalize">
                      Tendencia: {r.tendencia || "desconocida"}
                    </span>
                    {r.clase_reciente && (
                      <span
                        className={`px-2 py-0.5 rounded-full ${classBadge(
                          r.clase_reciente,
                        )}`}
                      >
                        Última: {dn(r.clase_reciente)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
