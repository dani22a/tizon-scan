/**
 * Lista modelos disponibles en la API de Gemini y selecciona uno para generateContent.
 * Útil cuando el modelo por defecto (ej. gemini-1.5-pro) está deprecado o no disponible.
 */

const MODELS_API = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiModel {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
  supported_generation_methods?: string[];
}

interface ListModelsResponse {
  models?: GeminiModel[];
  nextPageToken?: string;
}

/** Solo modelos flash-lite. Orden de preferencia. */
const PREFERRED_FLASH_LITE = [
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
];

let cachedModel: string | null = null;

/**
 * Obtiene la lista de modelos disponibles y selecciona uno que soporte generateContent.
 * Solo considera modelos flash-lite.
 */
export async function getModelForGenerateContent(): Promise<string> {
  if (cachedModel) {
    return cachedModel;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno");
  }

  const url = `${MODELS_API}?key=${apiKey}&pageSize=100`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Error al listar modelos Gemini: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as ListModelsResponse;
  const models = data.models ?? [];

  const methods = (m: GeminiModel) =>
    m.supportedGenerationMethods ?? m.supported_generation_methods ?? [];

  const supported = models.filter((m) => methods(m).includes("generateContent"));

  const getShortName = (name: string) =>
    name.startsWith("models/") ? name.slice(7) : name;

  // Solo flash-lite (sin fallback a otros modelos)
  const modelsToUse = supported.filter((m) => {
    const short = getShortName(m.name).toLowerCase();
    return short.includes("flash-lite") || short.includes("flash lite");
  });

  if (modelsToUse.length === 0) {
    throw new Error(
      "No se encontraron modelos Gemini flash-lite. Verifica tu API key."
    );
  }

  // Priorizar por lista de preferencia (flash-lite)
  for (const prefix of PREFERRED_FLASH_LITE) {
    const match = modelsToUse.find((m) => {
      const short = getShortName(m.name);
      return short === prefix || short.startsWith(prefix + "-");
    });
    if (match) {
      cachedModel = getShortName(match.name);
      return cachedModel;
    }
  }

  // Fallback: primer flash-lite disponible
  cachedModel = getShortName(modelsToUse[0].name);
  return cachedModel;
}

/**
 * Limpia la caché para forzar una nueva consulta en la próxima llamada.
 */
export function clearModelCache(): void {
  cachedModel = null;
}

export interface ModelInfo {
  id: string;
  name: string;
  displayName?: string;
}

let cachedModelsList: ModelInfo[] | null = null;

/**
 * Lista modelos flash-lite disponibles que soportan generateContent.
 * Retorna id (nombre corto), name y displayName para el selector.
 */
export async function listGeminiModels(): Promise<ModelInfo[]> {
  if (cachedModelsList) {
    return cachedModelsList;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno");
  }

  const url = `${MODELS_API}?key=${apiKey}&pageSize=100`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Error al listar modelos Gemini: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as ListModelsResponse;
  const models = data.models ?? [];

  const methods = (m: GeminiModel) =>
    m.supportedGenerationMethods ?? m.supported_generation_methods ?? [];

  const supported = models.filter((m) => methods(m).includes("generateContent"));

  const getShortName = (name: string) =>
    name.startsWith("models/") ? name.slice(7) : name;

  // Solo modelos que contengan "flash lite" (o "flash-lite")
  const modelsToUse = supported.filter((m) => {
    const short = getShortName(m.name).toLowerCase();
    return short.includes("flash-lite") || short.includes("flash lite");
  });

  cachedModelsList = modelsToUse.map((m) => ({
    id: getShortName(m.name),
    name: m.name,
    displayName: m.displayName ?? getShortName(m.name),
  }));

  // Ordenar por nombre
  cachedModelsList.sort((a, b) => a.id.localeCompare(b.id));

  return cachedModelsList;
}
