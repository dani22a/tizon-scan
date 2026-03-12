"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SurcoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { moduloId, loteId, surcoId } = params;

  useEffect(() => {
    if (moduloId && loteId && surcoId) {
      router.replace(
        `/dashboard/modulos/${moduloId}/lotes/${loteId}/surcos/${surcoId}/predicciones`,
      );
    }
  }, [moduloId, loteId, surcoId, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Redirigiendo...</p>
      </div>
    </div>
  );
}
