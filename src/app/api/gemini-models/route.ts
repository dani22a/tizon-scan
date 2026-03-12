/**
 * API Route: GET /api/gemini-models
 * Lista los modelos Gemini disponibles que soportan generateContent.
 */

import { NextResponse } from "next/server";
import { listGeminiModels } from "@/app/llm/lib/gemini-models";

export async function GET() {
  try {
    const models = await listGeminiModels();
    return NextResponse.json({ models });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al listar modelos";

    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { error: "Configuración del servidor incompleta." },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
