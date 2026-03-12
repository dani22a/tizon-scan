"use client";

import Link from "next/link";
import CampaignsVisualization from "./components/CampaignsVisualization";

export default function CampaignsPage() {
  return (
    <div className="min-h-full w-full llm-page-grid">
      <div className="mx-auto w-full max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-6">
        <section className="app-shell-panel overflow-hidden rounded-[32px] bg-linear-to-r from-brand-950 via-brand-900 to-brand-700 px-6 py-8 text-white md:px-8 md:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-100/80">
            Base histórica
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Visualización de campañas
          </h1>
          <p className="mt-4 text-sm leading-7 text-brand-100/85 md:text-base">
            Compara evaluaciones previas, identifica patrones de propagación del
            Tizón Tardío y proyecta el comportamiento de la enfermedad en
            campañas futuras.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/llm"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Nuevo análisis
            </Link>
            <Link
              href="/llm/videos-history"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Historial de videos
            </Link>
          </div>
        </section>

        <CampaignsVisualization />
      </div>
    </div>
  );
}
