import { apiUrl } from "@/config/config";

export const DISEASE_NAMES: Record<string, string> = {
  Potato___Early_blight: "Tizón Temprano",
  Potato___Late_blight: "Tizón Tardío",
  Potato___healthy: "Saludable",
};

export const MODEL_LABELS: Record<string, string> = {
  efficient: "EfficientNet",
  resnet: "ResNet",
  mobilevit: "MobileViT",
};

export function diseaseName(cls: string | null | undefined): string {
  if (!cls) return "Sin clasificar";
  return DISEASE_NAMES[cls] ?? cls;
}

export function modelLabel(key: string): string {
  return MODEL_LABELS[key] ?? key;
}

export function classColor(cls: string | null | undefined): string {
  if (!cls) return "bg-gray-600";
  if (cls.includes("healthy")) return "bg-green-600";
  if (cls.includes("Early")) return "bg-amber-500";
  return "bg-red-600";
}

export function classBadge(cls: string | null | undefined): string {
  if (!cls) return "bg-gray-100 text-gray-800";
  if (cls.includes("healthy")) return "bg-green-100 text-green-800";
  if (cls.includes("Early")) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export function boxColor(cls: string): string {
  const c = cls.toLowerCase();
  if (c.includes("blight")) return "#dc2626";
  if (c.includes("leaf")) return "#7c3aed";
  return "#16a34a";
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const API_BASE = apiUrl.replace(/\/api\/v1\/?$/, "");

export function resolveImageUrl(imagenUrl: string | null | undefined): string {
  if (!imagenUrl) return "";
  if (imagenUrl.startsWith("http://") || imagenUrl.startsWith("https://")) {
    return imagenUrl;
  }
  if (imagenUrl.startsWith("/")) {
    return `${API_BASE}${imagenUrl}`;
  }
  if (imagenUrl.startsWith("uploaded://")) {
    const filename = imagenUrl.replace("uploaded://", "");
    return `${API_BASE}/public/predictions/${filename}`;
  }
  return `${API_BASE}/public/predictions/${imagenUrl}`;
}
