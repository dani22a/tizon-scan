"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { CampaignAggregatedData } from "../types";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const SEVERIDAD_COLORS = {
  leve: "#eab308",
  moderado: "#f97316",
  severo: "#ef4444",
};

interface CampaignsChartsProps {
  data: CampaignAggregatedData[];
}

const COLOR_SANAS = "#22c55e";
const COLOR_TIZON = "#ef4444";

export function ComparacionEnfermedadChart({ data }: CampaignsChartsProps) {
  const chartData = data.map((c) => ({
    nombre: c.nombre,
    "% enfermas": Math.round(c.porcentajeEnfermas * 10) / 10,
    "% sanas": Math.round(c.porcentajeSanas * 10) / 10,
    analisis: c.totalAnalisis,
  }));

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
          <XAxis
            dataKey="nombre"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            height={50}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 40px -15px rgba(15,23,42,0.2)",
            }}
            formatter={(value) => [value != null ? `${value}%` : "", ""]}
            labelFormatter={(_, payload) =>
              (payload?.[0]?.payload as { nombre?: string })?.nombre ?? ""
            }
          />
          <Legend />
          <Bar dataKey="% sanas" fill={COLOR_SANAS} radius={[4, 4, 0, 0]} name="Sanas" />
          <Bar dataKey="% enfermas" fill={COLOR_TIZON} radius={[4, 4, 0, 0]} name="Con Tizón" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SeveridadPorCampanaChart({ data }: CampaignsChartsProps) {
  const chartData = data.map((c) => ({
    nombre: c.nombre,
    leve: c.leve,
    moderado: c.moderado,
    severo: c.severo,
  }));

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 12, left: 0, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
          <XAxis
            dataKey="nombre"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            height={50}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 40px -15px rgba(15,23,42,0.2)",
            }}
            labelFormatter={(_, payload) =>
              (payload?.[0]?.payload as { nombre?: string })?.nombre ?? ""
            }
          />
          <Legend />
          <Bar dataKey="leve" stackId="a" fill={SEVERIDAD_COLORS.leve} radius={[0, 0, 0, 0]} name="Leve" />
          <Bar dataKey="moderado" stackId="a" fill={SEVERIDAD_COLORS.moderado} radius={[0, 0, 0, 0]} name="Moderado" />
          <Bar dataKey="severo" stackId="a" fill={SEVERIDAD_COLORS.severo} radius={[4, 4, 0, 0]} name="Severo" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EvolucionTemporalChart({
  data,
  campaignIndex,
}: CampaignsChartsProps & { campaignIndex?: number }) {
  const campaigns = campaignIndex != null ? [data[campaignIndex]] : data;
  const hasData = campaigns.some((c) => c.analisisPorFecha.length > 1);

  if (!hasData) return null;

  const uniqueDates = [
    ...new Set(campaigns.flatMap((c) => c.analisisPorFecha.map((p) => p.fecha))),
  ].filter(Boolean).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const chartData = uniqueDates.map((f) => {
    const point: Record<string, string | number> = {
      fecha: new Date(f).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
      }),
      fullDate: f,
    };
    campaigns.forEach((c, i) => {
      const key = `c${c.periodoId}`;
      const match = c.analisisPorFecha.find((p) => p.fecha === f);
      point[key] = match
        ? Math.round(match.porcentajeEnfermas * 10) / 10
        : 0;
    });
    return point;
  });

  const lines = campaigns.map((c, i) => (
    <Line
      key={c.periodoId}
      type="monotone"
      dataKey={`c${c.periodoId}`}
      stroke={CHART_COLORS[i % CHART_COLORS.length]}
      strokeWidth={2}
      dot={{ r: 4 }}
      name={c.nombre}
    />
  ));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 40px -15px rgba(15,23,42,0.2)",
            }}
            formatter={(value) => [value != null ? `${value}%` : "", ""]}
          />
          <Legend />
          {lines}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistribucionNivelAlertaChart({ data }: CampaignsChartsProps) {
  const totalByAlerta = data.reduce(
    (acc, c) => {
      Object.entries(c.nivelAlertaCounts).forEach(([k, v]) => {
        acc[k] = (acc[k] ?? 0) + v;
      });
      return acc;
    },
    {} as Record<string, number>
  );

  const pieData = Object.entries(totalByAlerta).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444"];

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {pieData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 40px -15px rgba(15,23,42,0.2)",
            }}
            formatter={(value) => [value ?? 0, "Análisis"]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
