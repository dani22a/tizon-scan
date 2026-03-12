/**
 * API Route: POST /api/analyze-video
 *
 * Recibe FormData con:
 * - video: archivo de video (.mp4 o .mov)
 * - email: correo del usuario para enviar el PDF
 *
 * Flujo: guardar temporalmente → subir a Gemini → polling hasta ACTIVE →
 * analizar con gemini-1.5-pro → generar PDF → enviar por webhook (igual que historial)
 */

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  uploadVideoToGemini,
  analyzeVideoWithGemini,
} from "@/app/llm/lib/gemini-analyzer";
import { generateReportPdf } from "@/app/llm/lib/pdf-generator";
import { sendReportViaWebhook } from "@/app/llm/lib/email-webhook";
import type { AnalysisResult } from "@/app/llm/types/analysis";

function buildWhatsAppSummary(analysis: AnalysisResult): string {
  const ag = analysis.analisis_general;
  const pctSanas = ag.porcentaje_sanas ?? (ag.total_hojas > 0 ? Math.round((ag.sanas / ag.total_hojas) * 100) : 0);
  const pctEnfermas = ag.porcentaje_enfermas ?? (ag.total_hojas > 0 ? Math.round((ag.enfermas / ag.total_hojas) * 100) : 0);
  const nivel = analysis.nivel_alerta ?? "bajo";

  let msg = `📊 *Reporte Tizón Tardío - Papa*\n\n`;
  msg += `Total hojas: ${ag.total_hojas}\n`;
  msg += `Sanas: ${ag.sanas} (${pctSanas}%)\n`;
  msg += `Con Tizón Tardío: ${ag.enfermas} (${pctEnfermas}%)\n\n`;
  msg += `🚨 Nivel de alerta: ${nivel.toUpperCase()}\n`;

  const desglose = analysis.desglose_por_severidad;
  if (desglose && (desglose.leve > 0 || desglose.moderado > 0 || desglose.severo > 0)) {
    msg += `\nSeveridad: Leve ${desglose.leve} | Moderado ${desglose.moderado} | Severo ${desglose.severo}`;
  }

  return msg;
}

const ALLOWED_MIMES = ["video/mp4", "video/quicktime"];

function getExtFromMime(mime: string): string {
  if (mime === "video/quicktime") return ".mov";
  return ".mp4";
}

export async function POST(request: Request) {
  let tempPath: string | null = null;

  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const modelId = formData.get("model") as string | null;

    if (!videoFile || typeof videoFile === "string") {
      return NextResponse.json(
        { error: "Debes subir un archivo de video" },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "El correo electrónico es requerido" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "El correo electrónico no es válido" },
        { status: 400 }
      );
    }

    const mime = videoFile.type;
    if (!ALLOWED_MIMES.includes(mime)) {
      return NextResponse.json(
        { error: "Solo se permiten archivos .mp4 o .mov" },
        { status: 400 }
      );
    }

    const ext = getExtFromMime(mime);
    tempPath = path.join(os.tmpdir(), `video-${Date.now()}${ext}`);

    const arrayBuffer = await videoFile.arrayBuffer();
    await fs.writeFile(tempPath, Buffer.from(arrayBuffer));

    const { fileUri, mimeType } = await uploadVideoToGemini(tempPath, mime);

    const analysisResult = await analyzeVideoWithGemini(
      fileUri,
      mimeType,
      modelId?.trim() || undefined
    );

    const pdfBuffer = await generateReportPdf(analysisResult);
    const pdfFileName = "reporte-analisis-papa.pdf";

    const whatsappSummary = phone?.trim() ? buildWhatsAppSummary(analysisResult) : undefined;

    await sendReportViaWebhook(
      email.trim(),
      pdfBuffer,
      pdfFileName,
      undefined,
      undefined,
      phone?.trim() || undefined,
      whatsappSummary
    );

    const response = {
      success: true,
      message: "Análisis completado. Revisa tu correo para el PDF.",
      analysis: analysisResult,
      pdfBase64: pdfBuffer.toString("base64"),
      pdfFileName,
    };
    console.log("[analyze-video] Respuesta OK:", JSON.stringify(response, null, 2));
    return NextResponse.json(response);
  } catch (err) {
    // Siempre imprimir la respuesta/error completa para depuración
    console.error("[analyze-video] Error completo:", err);
    if (err instanceof Error) {
      console.error("[analyze-video] message:", err.message);
      console.error("[analyze-video] stack:", err.stack);
      if (err.cause) console.error("[analyze-video] cause:", err.cause);
    }
    const errAny = err as Record<string, unknown> | null;
    if (errAny?.response) console.error("[analyze-video] response:", errAny.response);

    const message =
      err instanceof Error ? err.message : "Error interno del servidor";

    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { error: "Configuración del servidor incompleta. Contacta al administrador." },
        { status: 500 }
      );
    }

    if (message.includes("SEND_EMAIL_WEBHOOK") || message.includes("Webhook")) {
      return NextResponse.json(
        { error: "Error al enviar el correo. Verifica la configuración del webhook." },
        { status: 500 }
      );
    }

    const errorPayload = { error: message };
    if (err && typeof err === "object") {
      const extra: Record<string, unknown> = {};
      if ("cause" in err) extra.cause = String((err as Error).cause);
      if ("stack" in err) extra.stack = (err as Error).stack;
      Object.assign(errorPayload, extra);
    }
    return NextResponse.json(errorPayload, { status: 500 });
  } finally {
    if (tempPath) {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignorar errores de limpieza
      }
    }
  }
}
