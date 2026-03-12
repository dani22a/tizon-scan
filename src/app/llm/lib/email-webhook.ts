/**
 * Envío de reporte PDF por correo mediante webhook (n8n u otro).
 * Mismo mecanismo que el historial de predicciones.
 *
 * Variable de entorno: NEXT_PUBLIC_SEND_EMAIL_WEBHOOK
 */

export interface WebhookEmailPayload {
  email: string;
  phone?: string;
  subject: string;
  title: string;
  pdf: string;
  filename: string;
  /** Resumen ejecutivo para WhatsApp: porcentajes y nivel de alerta */
  whatsappSummary?: string;
}

export async function sendReportViaWebhook(
  email: string,
  pdfBuffer: Buffer,
  filename: string = "reporte-analisis-papa.pdf",
  subject?: string,
  title?: string,
  phone?: string,
  whatsappSummary?: string
): Promise<void> {
  const webhookUrl = process.env.NEXT_PUBLIC_SEND_EMAIL_WEBHOOK;
  if (!webhookUrl) {
    throw new Error(
      "NEXT_PUBLIC_SEND_EMAIL_WEBHOOK no está configurado. Configura el webhook en .env"
    );
  }

  const base64 = pdfBuffer.toString("base64");

  const payload: WebhookEmailPayload = {
    email,
    subject: subject ?? "Reporte de Análisis de Enfermedades en Papa - Tizon Scan",
    title: title ?? "Reporte de Análisis de Video",
    pdf: base64,
    filename,
  };
  if (phone?.trim()) {
    payload.phone = phone.trim();
  }
  if (whatsappSummary?.trim()) {
    payload.whatsappSummary = whatsappSummary.trim();
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Webhook HTTP ${res.status}`);
  }
}
