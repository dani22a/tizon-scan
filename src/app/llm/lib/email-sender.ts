/**
 * Envío de correo con el reporte PDF adjunto usando Nodemailer.
 *
 * Variables de entorno requeridas:
 * - SMTP_HOST: Servidor SMTP (ej. smtp.gmail.com)
 * - SMTP_PORT: Puerto (587 para TLS)
 * - SMTP_USER: Usuario del correo
 * - SMTP_PASS: Contraseña o App Password
 * - SMTP_FROM: Correo remitente (ej. noreply@tudominio.com)
 */

import nodemailer from "nodemailer";

export async function sendReportEmail(
  to: string,
  pdfBuffer: Buffer,
  fileName: string = "reporte-analisis-papa.pdf"
): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;

  if (!host || !port || !user || !pass) {
    throw new Error(
      "Configuración SMTP incompleta. Asegúrate de definir SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS en .env"
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: port === "465",
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: from,
    to,
    subject: "Reporte de Análisis de Enfermedades en Papa - Tizon Scan",
    text: "Adjunto encontrará el reporte de análisis de su video de cultivo de papa. El documento incluye la detección de Tizón temprano (Alternaria solani) y Tizón tardío (Phytophthora infestans).",
    html: `
      <p>Adjunto encontrará el reporte de análisis de su video de cultivo de papa.</p>
      <p>El documento incluye la detección de:</p>
      <ul>
        <li>Tizón temprano (Alternaria solani)</li>
        <li>Tizón tardío (Phytophthora infestans)</li>
      </ul>
      <p>Saludos,<br/>Equipo Tizon Scan</p>
    `,
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
      },
    ],
  });
}
