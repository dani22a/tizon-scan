"use client";

import { useEffect, useMemo } from "react";
import { useWeatherStore } from "@/store/weather-store";
import {
  calculateBlightRisk,
  generateRecommendations,
} from "@/lib/recommendations";
import { Recommendation, RiskLevel } from "@/types/weather";

const RISK_STYLES: Record<
  RiskLevel,
  { bg: string; text: string; border: string; label: string }
> = {
  bajo: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-300",
    label: "Bajo",
  },
  moderado: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-300",
    label: "Moderado",
  },
  alto: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-300",
    label: "Alto",
  },
  critico: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-300",
    label: "Critico",
  },
};

const PRIORITY_STYLES: Record<
  Recommendation["priority"],
  { dot: string; label: string }
> = {
  baja: { dot: "bg-green-400", label: "Baja" },
  media: { dot: "bg-yellow-400", label: "Media" },
  alta: { dot: "bg-orange-500", label: "Alta" },
  urgente: { dot: "bg-red-600", label: "Urgente" },
};

const CATEGORY_ICONS: Record<Recommendation["category"], string> = {
  riego: "💧",
  fungicida: "🧪",
  monitoreo: "🔍",
  general: "📋",
  alerta: "⚠️",
};

function weatherIconUrl(icon: string) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function formatDate(unix: number, tz: string) {
  return new Date(unix * 1000).toLocaleDateString("es-PE", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function RiskGauge({
  label,
  score,
  level,
}: {
  label: string;
  score: number;
  level: RiskLevel;
}) {
  const s = RISK_STYLES[level];
  return (
    <div className={`rounded-xl border-2 ${s.border} ${s.bg} p-5`}>
      <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
      <div className="flex items-end gap-3">
        <span className={`text-4xl font-bold ${s.text}`}>{score}</span>
        <span className={`text-sm font-semibold ${s.text} mb-1`}>/ 100</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5 mt-3">
        <div
          className={`h-2.5 rounded-full transition-all ${
            level === "bajo"
              ? "bg-green-500"
              : level === "moderado"
                ? "bg-yellow-500"
                : level === "alto"
                  ? "bg-orange-500"
                  : "bg-red-600"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span
        className={`inline-block mt-2 text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}
      >
        {s.label}
      </span>
    </div>
  );
}

export default function RecommendationsPage() {
  const { geo, weather, loading, error, hydrate, forceRefresh, lastFetchedAt } =
    useWeatherStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const risk = useMemo(
    () => (weather ? calculateBlightRisk(weather) : null),
    [weather],
  );

  const recommendations = useMemo(
    () => (weather && risk ? generateRecommendations(weather, risk) : []),
    [weather, risk],
  );

  // ── Loading state ─────────────────────────────────────────
  if (loading && !weather) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <svg
            className="animate-spin h-10 w-10 text-emerald-600 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-slate-600">
            Obteniendo ubicacion y datos climaticos...
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error && !weather) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <p className="font-semibold mb-2">Error</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={forceRefresh}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!weather || !geo || !risk) return null;

  const c = weather.current;
  const urgentRecs = recommendations.filter((r) => r.priority === "urgente");
  const otherRecs = recommendations.filter((r) => r.priority !== "urgente");

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Recomendaciones Agricolas
          </h1>
          <p className="text-slate-500 mt-1">
            {geo.city}, {geo.regionName} &mdash; {geo.country}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastFetchedAt && (
            <span className="text-xs text-slate-400">
              Actualizado:{" "}
              {new Date(lastFetchedAt).toLocaleTimeString("es-PE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={forceRefresh}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {/* Clima actual */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Condiciones Actuales
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex flex-col items-center text-center">
            {c.weather[0] && (
              <img
                src={weatherIconUrl(c.weather[0].icon)}
                alt={c.weather[0].description}
                className="w-14 h-14"
              />
            )}
            <span className="text-sm capitalize text-slate-600">
              {c.weather[0]?.description}
            </span>
          </div>
          <Stat label="Temperatura" value={`${c.temp.toFixed(1)} °C`} />
          <Stat label="Humedad" value={`${c.humidity}%`} />
          <Stat label="Viento" value={`${c.wind_speed} m/s`} />
          <Stat label="UV" value={`${c.uvi}`} />
          <Stat
            label="Visibilidad"
            value={`${(c.visibility / 1000).toFixed(1)} km`}
          />
        </div>
      </div>

      {/* Métricas de riesgo */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Indice de Riesgo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RiskGauge
            label="Tizon Tardio (P. infestans)"
            score={risk.lateBlightScore}
            level={risk.lateBlightRisk}
          />
          <RiskGauge
            label="Tizon Temprano (A. solani)"
            score={risk.earlyBlightScore}
            level={risk.earlyBlightRisk}
          />
          <RiskGauge
            label="Riesgo General"
            score={risk.overallScore}
            level={risk.overallRisk}
          />
        </div>
      </div>

      {/* Alertas urgentes */}
      {urgentRecs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-red-700">
            Alertas Urgentes
          </h2>
          {urgentRecs.map((rec, i) => (
            <RecCard key={`urgent-${i}`} rec={rec} />
          ))}
        </div>
      )}

      {/* Recomendaciones */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Recomendaciones
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {otherRecs.map((rec, i) => (
            <RecCard key={`rec-${i}`} rec={rec} />
          ))}
        </div>
      </div>

      {/* Pronóstico diario */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Pronostico 8 Dias
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {weather.daily.map((d) => (
            <div
              key={d.dt}
              className="text-center bg-slate-50 rounded-lg p-3 space-y-1"
            >
              <p className="text-xs font-semibold text-slate-600">
                {formatDate(d.dt, weather.timezone)}
              </p>
              {d.weather[0] && (
                <img
                  src={weatherIconUrl(d.weather[0].icon)}
                  alt={d.weather[0].description}
                  className="w-10 h-10 mx-auto"
                />
              )}
              <p className="text-sm font-bold text-slate-800">
                {d.temp.max.toFixed(0)}°
                <span className="text-slate-400 font-normal">
                  {" "}
                  / {d.temp.min.toFixed(0)}°
                </span>
              </p>
              <p className="text-xs text-blue-600">{d.humidity}% hum</p>
              {d.pop > 0 && (
                <p className="text-xs text-blue-500">
                  💧 {(d.pop * 100).toFixed(0)}%
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Próximas 12 horas */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Proximas 12 Horas
        </h2>
        <div className="overflow-x-auto">
          <div className="flex gap-3 min-w-max">
            {weather.hourly.slice(0, 12).map((h) => (
              <div
                key={h.dt}
                className="text-center bg-slate-50 rounded-lg p-3 min-w-[80px] space-y-1"
              >
                <p className="text-xs font-semibold text-slate-600">
                  {new Date(h.dt * 1000).toLocaleTimeString("es-PE", {
                    timeZone: weather.timezone,
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {h.weather[0] && (
                  <img
                    src={weatherIconUrl(h.weather[0].icon)}
                    alt={h.weather[0].description}
                    className="w-8 h-8 mx-auto"
                  />
                )}
                <p className="text-sm font-bold text-slate-800">
                  {h.temp.toFixed(0)}°
                </p>
                <p className="text-xs text-slate-500">{h.humidity}%</p>
                {h.pop > 0 && (
                  <p className="text-xs text-blue-500">
                    💧 {(h.pop * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componentes auxiliares ───────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}

function RecCard({ rec }: { rec: Recommendation }) {
  const pStyle = PRIORITY_STYLES[rec.priority];
  const isUrgent = rec.priority === "urgente";

  return (
    <div
      className={`rounded-xl border p-5 ${
        isUrgent
          ? "border-red-300 bg-red-50"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">
          {CATEGORY_ICONS[rec.category]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`font-semibold ${isUrgent ? "text-red-800" : "text-slate-800"}`}
            >
              {rec.title}
            </h3>
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <span className={`w-2 h-2 rounded-full ${pStyle.dot}`} />
              {pStyle.label}
            </span>
          </div>
          <p
            className={`text-sm mt-1 ${isUrgent ? "text-red-700" : "text-slate-600"}`}
          >
            {rec.description}
          </p>
        </div>
      </div>
    </div>
  );
}
