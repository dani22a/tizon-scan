import VideoAnalyzerForm from "./components/VideoAnalyzerForm";

export default function LlmPage() {
  return (
    <div className="min-h-full w-full llm-page-grid">
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <section className="app-shell-panel rounded-[32px] overflow-hidden">
          <div className="bg-linear-to-r from-brand-950 via-brand-900 to-brand-700 px-6 py-8 md:px-8 md:py-10 text-white">
            <div className="w-full">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-100/80">
                Vision Suite
              </p>
              <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
                Diagnóstico audiovisual con una identidad más analítica
              </h1>
              <p className="mt-4 text-sm md:text-base leading-7 text-brand-100/85">
                Este flujo ahora prioriza una estética azul, más técnica y editorial,
                para separar el módulo de IA del resto del sistema operativo.
              </p>
            </div>
          </div>
        </section>

        <VideoAnalyzerForm />
      </div>
    </div>
  );
}
