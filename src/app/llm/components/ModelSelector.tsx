"use client";

import { useState, useEffect } from "react";

export interface ModelInfo {
  id: string;
  name: string;
  displayName?: string;
}

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

export default function ModelSelector({
  value,
  onChange,
  disabled = false,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/gemini-models");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? "Error al cargar modelos");
        }
        const list = data.models ?? [];
        if (!cancelled) {
          setModels(list);
          if (list.length > 0 && !value) {
            const preferred = list.find((m: ModelInfo) =>
              m.id.includes("pro")
            ) ?? list[0];
            onChange(preferred.id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error desconocido");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Modelo Gemini
        </label>
        <div className="flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-200 bg-slate-50">
          <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Cargando modelos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Modelo Gemini
        </label>
        <div className="py-3 px-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Modelo Gemini
        </label>
        <div className="py-3 px-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          No hay modelos disponibles
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="model-select"
        className="block text-sm font-medium text-slate-700"
      >
        Modelo Gemini
      </label>
      <div className="relative">
        <select
          id="model-select"
          value={value || models[0]?.id}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full py-3 pl-4 pr-10 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName ?? m.id}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        {models.length} modelo{models.length !== 1 ? "s" : ""} disponible
        {models.length !== 1 ? "s" : ""} con generateContent
      </p>
    </div>
  );
}
