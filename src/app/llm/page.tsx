import Link from "next/link";
import VideoAnalyzerForm from "./components/VideoAnalyzerForm";

export default function LlmPage() {
  return (
    <div className="min-h-full w-full llm-page-grid">
      <div className="mx-auto w-full max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-6">
        <section className="app-shell-panel overflow-hidden rounded-[32px] bg-linear-to-r from-brand-950 via-brand-900 to-brand-700 px-6 py-8 text-white md:px-8 md:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-100/80">
            Vision Suite
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Diagnóstico audiovisual con una identidad más analítica
          </h1>
          <p className="mt-4 text-sm leading-7 text-brand-100/85 md:text-base">
            Este flujo ahora prioriza una estética azul, más técnica y editorial,
            para separar el módulo de IA del resto del sistema operativo.
          </p>
        </section>

        <VideoAnalyzerForm />

        <section className="app-shell-panel overflow-hidden rounded-[28px]">
          <Link
            href="/llm/campaigns"
            className="flex flex-col gap-4 p-6 transition-colors hover:bg-brand-50/60 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="rounded-[22px] border border-brand-100 bg-linear-to-br from-brand-50 to-white px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-brand-600/80">
                Base histórica por campaña
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-800">
                Visualización de campañas
              </h2>
              <p className="mt-1.5 text-sm leading-5 text-slate-600">
                Compara evaluaciones previas, identifica patrones de propagación
                y proyecta el comportamiento del Tizón Tardío en campañas futuras.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-100 px-4 py-2.5 text-sm font-medium text-brand-700">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Ver gráficos y análisis
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}
