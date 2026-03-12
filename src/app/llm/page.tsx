import VideoAnalyzerForm from "./components/VideoAnalyzerForm";

export default function LlmPage() {
  return (
    <div className="min-h-full w-full">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <VideoAnalyzerForm />
      </div>
    </div>
  );
}
