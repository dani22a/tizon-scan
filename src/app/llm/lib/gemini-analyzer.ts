/**
 * Módulo de análisis de video con Google Gemini.
 * Sube el video a la Files API, espera procesamiento (polling) y analiza con el modelo disponible.
 * El modelo se selecciona dinámicamente vía ListModels (generateContent).
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { getModelForGenerateContent } from "./gemini-models";
import type { AnalysisResult } from "../types/analysis";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minutos

const SYSTEM_PROMPT = `Eres un Agente experto en agronomía y fitopatología especializado en el cultivo de papa. Analiza el video frame por frame e identifica cada hoja visible del cultivo para diagnosticar masivamente el estado sanitario, enfocándote en Tizón Tardío (Phytophthora infestans).

El video muestra hojas de papa capturadas en campo. Debes:
1. Contar el total de hojas detectadas
2. Clasificar cada hoja como sana o con Tizón Tardío
3. Para cada hoja enferma, estimar el porcentaje de área foliar afectada y asignar severidad según la escala:
   - leve: manchas iniciales, menos del 25% de la hoja afectada
   - moderado: entre 25% y 60% de la hoja afectada
   - severo: más del 60% de la hoja necrosada o destruida
4. Generar recomendaciones fitosanitarias contextualizadas (tratamientos, fungicidas, frecuencia de aplicación, medidas preventivas)
5. Determinar el nivel de alerta según el porcentaje de enfermedad: bajo (<10%), moderado (10-25%), alto (25-50%), critico (>50%)

Debes responder ÚNICAMENTE con un JSON válido que tenga exactamente esta estructura (sin texto adicional antes o después):

{
  "analisis_general": {
    "total_hojas": number,
    "sanas": number,
    "enfermas": number,
    "porcentaje_sanas": number,
    "porcentaje_enfermas": number
  },
  "desglose_por_severidad": {
    "leve": number,
    "moderado": number,
    "severo": number
  },
  "nivel_alerta": "bajo" | "moderado" | "alto" | "critico",
  "recomendaciones": [string],
  "segmentos_analizados": [
    {
      "tiempo_inicio": number,
      "tiempo_fin": number,
      "confianza_porcentaje": number,
      "enfermedad_detectada": string
    }
  ],
  "timeline_anotaciones": [
    {
      "segundo": number,
      "juicio_experto": string,
      "recomendacion": string
    }
  ]
}`;

export interface UploadResult {
  fileUri: string;
  mimeType: string;
}
/**
 * Sube el video a Gemini Files API y espera hasta que esté ACTIVE.
 * Retorna el fileUri y mimeType para usarlos en el análisis.
 */
export async function uploadVideoToGemini(
  filePath: string,
  mimeType: string = "video/mp4"
): Promise<UploadResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno");
  }

  const fileManager = new GoogleAIFileManager(apiKey);

  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType,
    displayName: "video-papa-analisis",
  });

  const fileName = uploadResult.file.name;
  const startTime = Date.now();

  // Polling: esperar hasta que el archivo esté ACTIVE
  while (true) {
    const file = await fileManager.getFile(fileName);

    if (file.state === FileState.ACTIVE) {
      return {
        fileUri: file.uri,
        mimeType: file.mimeType,
      };
    }

    if (file.state === FileState.FAILED) {
      const errorMsg = file.error?.message ?? "Procesamiento del video falló";
      throw new Error(`El archivo de video falló al procesarse: ${errorMsg}`);
    }

    if (Date.now() - startTime > MAX_POLL_TIME_MS) {
      throw new Error(
        "Timeout: el video tardó demasiado en procesarse. Intenta con un video más corto."
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Analiza el video con Gemini y retorna el JSON estructurado.
 * Usa el modelo especificado o ListModels para seleccionar uno disponible.
 */
export async function analyzeVideoWithGemini(
  fileUri: string,
  mimeType: string,
  modelId?: string
): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno");
  }

  const modelName = modelId ?? (await getModelForGenerateContent());

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent([
    {
      fileData: {
        mimeType,
        fileUri,
      },
    },
    {
      text: "Analiza el video frame por frame, identifica cada hoja de papa, clasifica su estado sanitario (sana o con Tizón Tardío), asigna severidad a las enfermas (leve/moderado/severo), calcula porcentajes y genera recomendaciones fitosanitarias. Devuelve el JSON completo.",
    },
  ]);

  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error("Gemini no devolvió respuesta");
  }

  try {
    const parsed = JSON.parse(text) as AnalysisResult;

    // Validación básica del esquema
    if (!parsed.analisis_general || !Array.isArray(parsed.segmentos_analizados) || !Array.isArray(parsed.timeline_anotaciones)) {
      throw new Error("El JSON devuelto no tiene la estructura esperada");
    }

    // Normalizar porcentajes si faltan
    const ag = parsed.analisis_general;
    if (ag.porcentaje_sanas == null && ag.total_hojas > 0) {
      ag.porcentaje_sanas = Math.round((ag.sanas / ag.total_hojas) * 100);
    }
    if (ag.porcentaje_enfermas == null && ag.total_hojas > 0) {
      ag.porcentaje_enfermas = Math.round((ag.enfermas / ag.total_hojas) * 100);
    }

    // Asegurar desglose_por_severidad por defecto
    if (!parsed.desglose_por_severidad) {
      parsed.desglose_por_severidad = { leve: 0, moderado: 0, severo: 0 };
    }
    if (!parsed.recomendaciones) {
      parsed.recomendaciones = [];
    }
    if (!parsed.nivel_alerta) {
      const pct = ag.porcentaje_enfermas ?? (ag.total_hojas > 0 ? (ag.enfermas / ag.total_hojas) * 100 : 0);
      parsed.nivel_alerta = pct < 10 ? "bajo" : pct < 25 ? "moderado" : pct < 50 ? "alto" : "critico";
    }

    return parsed;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Gemini devolvió un JSON inválido: ${text.slice(0, 200)}...`);
    }
    throw err;
  }
}
