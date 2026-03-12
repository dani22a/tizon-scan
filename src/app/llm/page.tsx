import VideoAnalyzerForm from "./components/VideoAnalyzerForm";
import Link from "next/link";

export default function LlmPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-slate-600 hover:text-emerald-700 mb-6"
        >
          ← Volver al dashboard
        </Link>
        <VideoAnalyzerForm />
      </div>
    </div>
  );
}
