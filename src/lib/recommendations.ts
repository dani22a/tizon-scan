import {
  WeatherData,
  DailyWeather,
  CurrentWeather,
  BlightRiskMetrics,
  Recommendation,
  RiskLevel,
} from "@/types/weather";

// ── Umbrales agronómicos para papa ──────────────────────────────
// Phytophthora infestans (tizón tardío): temp 10-25 °C, humedad > 80 %, lluvia
// Alternaria solani (tizón temprano): temp 24-29 °C, ciclos húmedo/seco, estrés

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function scoreToLevel(score: number): RiskLevel {
  if (score < 25) return "bajo";
  if (score < 50) return "moderado";
  if (score < 75) return "alto";
  return "critico";
}

// ── Cálculo de riesgo de Tizón Tardío ───────────────────────────
function calcLateBlightScore(current: CurrentWeather): number {
  let score = 0;

  // Temperatura: pico de riesgo entre 12-22 °C
  const t = current.temp;
  if (t >= 10 && t <= 25) {
    const ideal = 17;
    const dist = Math.abs(t - ideal);
    score += clamp(35 - dist * 3, 0, 35);
  }

  // Humedad: > 80 % incrementa riesgo drásticamente
  const h = current.humidity;
  if (h >= 80) score += clamp((h - 80) * 1.6, 0, 35);
  else if (h >= 60) score += clamp((h - 60) * 0.5, 0, 10);

  // Lluvia / visibilidad baja (niebla, neblina)
  if (current.rain) score += 15;
  if (current.visibility < 5000) score += 10;

  // Nubes densas
  if (current.clouds > 80) score += 5;

  return clamp(Math.round(score), 0, 100);
}

// ── Cálculo de riesgo de Tizón Temprano ─────────────────────────
function calcEarlyBlightScore(current: CurrentWeather): number {
  let score = 0;

  // Temperatura: pico 24-29 °C
  const t = current.temp;
  if (t >= 24 && t <= 32) {
    const ideal = 27;
    const dist = Math.abs(t - ideal);
    score += clamp(30 - dist * 3, 0, 30);
  }

  // Humedad moderada-alta (60-85 %)
  const h = current.humidity;
  if (h >= 60 && h <= 85) score += clamp((h - 60) * 1.0, 0, 25);
  if (h > 85) score += 15;

  // UVI alto = estrés térmico en la planta
  if (current.uvi >= 8) score += 15;
  else if (current.uvi >= 5) score += 8;

  // Viento bajo = aire estancado
  if (current.wind_speed < 2) score += 10;

  return clamp(Math.round(score), 0, 100);
}

export function calculateBlightRisk(weather: WeatherData): BlightRiskMetrics {
  const late = calcLateBlightScore(weather.current);
  const early = calcEarlyBlightScore(weather.current);
  const overall = Math.round(late * 0.6 + early * 0.4);

  return {
    lateBlightScore: late,
    lateBlightRisk: scoreToLevel(late),
    earlyBlightScore: early,
    earlyBlightRisk: scoreToLevel(early),
    overallScore: overall,
    overallRisk: scoreToLevel(overall),
  };
}

// ── Generador de recomendaciones ────────────────────────────────
export function generateRecommendations(
  weather: WeatherData,
  risk: BlightRiskMetrics,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const c = weather.current;
  const next24h = weather.hourly.slice(0, 24);
  const rainNext24 = next24h.some((h) => h.pop > 0.4);
  const avgHumidity24 =
    next24h.reduce((s, h) => s + h.humidity, 0) / next24h.length;

  // ── Alertas de riesgo ─────────────────────────────────────
  if (risk.lateBlightRisk === "critico") {
    recs.push({
      category: "alerta",
      priority: "urgente",
      title: "Riesgo critico de Tizon Tardio",
      description: `Las condiciones actuales (${c.temp.toFixed(1)} °C, ${c.humidity}% humedad) son ideales para Phytophthora infestans. Aplique fungicida protector de forma inmediata y monitoree hojas inferiores.`,
    });
  } else if (risk.lateBlightRisk === "alto") {
    recs.push({
      category: "alerta",
      priority: "alta",
      title: "Riesgo alto de Tizon Tardio",
      description: `Humedad de ${c.humidity}% y temperatura de ${c.temp.toFixed(1)} °C favorecen el desarrollo del patogeno. Considere aplicacion preventiva de fungicida en las proximas 24 h.`,
    });
  }

  if (risk.earlyBlightRisk === "critico" || risk.earlyBlightRisk === "alto") {
    recs.push({
      category: "alerta",
      priority: risk.earlyBlightRisk === "critico" ? "urgente" : "alta",
      title: `Riesgo ${risk.earlyBlightRisk} de Tizon Temprano`,
      description: `Temperatura de ${c.temp.toFixed(1)} °C con UVI de ${c.uvi} generan estres en la planta, favoreciendo Alternaria solani. Inspeccione hojas inferiores buscando lesiones concentricas.`,
    });
  }

  // ── Fungicida ─────────────────────────────────────────────
  if (risk.overallScore >= 50) {
    recs.push({
      category: "fungicida",
      priority: risk.overallScore >= 75 ? "urgente" : "alta",
      title: "Aplicacion de fungicida recomendada",
      description: rainNext24
        ? "Se esperan lluvias en las proximas 24 h. Aplique fungicida sistémico (metalaxyl o fosetyl-Al) que no se lave con la lluvia."
        : "Aplique fungicida de contacto (mancozeb, clorotalonil) en horas de baja radiacion solar (manana temprano o tarde).",
    });
  } else if (risk.overallScore >= 25) {
    recs.push({
      category: "fungicida",
      priority: "media",
      title: "Monitoreo preventivo de fungicidas",
      description:
        "Riesgo moderado. Si lleva mas de 10 dias sin aplicacion, considere un fungicida preventivo de contacto.",
    });
  }

  // ── Riego ─────────────────────────────────────────────────
  if (c.humidity < 50 && c.temp > 25) {
    recs.push({
      category: "riego",
      priority: "alta",
      title: "Riego necesario",
      description: `Humedad baja (${c.humidity}%) y temperatura elevada (${c.temp.toFixed(1)} °C). Riegue por la manana temprano para evitar estres hidrico. Evite riego por aspersion para no favorecer enfermedades foliares.`,
    });
  } else if (avgHumidity24 > 85) {
    recs.push({
      category: "riego",
      priority: "media",
      title: "Suspenda el riego temporalmente",
      description: `Humedad promedio de ${avgHumidity24.toFixed(0)}% en las proximas 24 h. No riegue para evitar exceso de humedad que favorece enfermedades.`,
    });
  } else {
    recs.push({
      category: "riego",
      priority: "baja",
      title: "Riego normal",
      description:
        "Condiciones adecuadas. Mantenga riego por goteo regular evitando mojar el follaje.",
    });
  }

  // ── Monitoreo ─────────────────────────────────────────────
  if (c.humidity > 80 || c.temp < 15) {
    recs.push({
      category: "monitoreo",
      priority: "alta",
      title: "Inspeccion visual diaria",
      description:
        "Revise el enves de las hojas buscando manchas acuosas (tizon tardio) o lesiones concentricas oscuras (tizon temprano). Preste atencion especial a las hojas inferiores.",
    });
  }

  if (c.wind_speed < 1.5) {
    recs.push({
      category: "monitoreo",
      priority: "media",
      title: "Ventilacion deficiente",
      description:
        "Viento casi nulo. El aire estancado favorece la acumulacion de humedad en el follaje. Si es posible, mejore espaciado entre plantas.",
    });
  }

  // ── UVI alto ──────────────────────────────────────────────
  if (c.uvi >= 11) {
    recs.push({
      category: "general",
      priority: "media",
      title: "Radiacion UV extrema",
      description: `UVI de ${c.uvi}. Evite labores de campo entre 10:00 y 15:00. Las aplicaciones foliares deben hacerse temprano en la manana.`,
    });
  }

  // ── Lluvia próxima ────────────────────────────────────────
  if (rainNext24) {
    const maxPop = Math.max(...next24h.map((h) => h.pop));
    recs.push({
      category: "general",
      priority: "media",
      title: "Lluvia pronosticada",
      description: `Probabilidad de lluvia de hasta ${(maxPop * 100).toFixed(0)}% en las proximas 24 h. Ajuste labores de campo y aplicaciones en consecuencia.`,
    });
  }

  // ── Pronóstico diario ─────────────────────────────────────
  const dangerDays = weather.daily.filter(
    (d: DailyWeather) => d.humidity > 80 && d.temp.day >= 10 && d.temp.day <= 25,
  );
  if (dangerDays.length >= 3) {
    recs.push({
      category: "alerta",
      priority: "alta",
      title: "Condiciones sostenidas de riesgo",
      description: `${dangerDays.length} de los proximos ${weather.daily.length} dias presentan condiciones favorables para tizon tardio (humedad > 80%, temp 10-25 °C). Refuerce el programa de fungicidas.`,
    });
  }

  return recs;
}
