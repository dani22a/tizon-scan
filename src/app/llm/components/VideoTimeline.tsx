"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { TimelineAnotacion } from "../types/analysis";

interface VideoTimelineProps {
  videoFile: File;
  timelineAnotaciones: TimelineAnotacion[];
}

interface TimelineItemWithFrame extends TimelineAnotacion {
  frameUrl: string | null;
  loading: boolean;
}

function formatSegundo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoTimeline({
  videoFile,
  timelineAnotaciones,
}: VideoTimelineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [items, setItems] = useState<TimelineItemWithFrame[]>([]);
  const [loading, setLoading] = useState(true);

  const captureFrameAt = useCallback(
    (segundo: number): Promise<string | null> => {
      return new Promise((resolve) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) {
          resolve(null);
          return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        const handleSeeked = () => {
          try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            resolve(dataUrl);
          } catch {
            resolve(null);
          }
          video.removeEventListener("seeked", handleSeeked);
          video.removeEventListener("error", handleError);
        };

        const handleError = () => {
          resolve(null);
          video.removeEventListener("seeked", handleSeeked);
          video.removeEventListener("error", handleError);
        };

        video.addEventListener("seeked", handleSeeked);
        video.addEventListener("error", handleError);
        video.currentTime = segundo;
      });
    },
    []
  );

  useEffect(() => {
    const videoUrl = URL.createObjectURL(videoFile);

    const video = videoRef.current;
    if (!video) return;

    video.src = videoUrl;

    const handleLoadedMetadata = async () => {
      const sorted = [...timelineAnotaciones].sort(
        (a, b) => a.segundo - b.segundo
      );

      setItems(
        sorted.map((a) => ({
          ...a,
          frameUrl: null,
          loading: true,
        }))
      );

      for (let i = 0; i < sorted.length; i++) {
        const frameUrl = await captureFrameAt(sorted[i].segundo);
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, frameUrl, loading: false }
              : item
          )
        );
      }

      setLoading(false);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      URL.revokeObjectURL(videoUrl);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [videoFile, timelineAnotaciones, captureFrameAt]);

  if (timelineAnotaciones.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-lg font-bold text-slate-800">
        Línea del tiempo del análisis
      </h3>

      <video
        ref={videoRef}
        className="hidden"
        muted
        playsInline
        preload="metadata"
      />

      <canvas ref={canvasRef} className="hidden" />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">
              Extrayendo capturas del video...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item, idx) => (
            <div
              key={`${item.segundo}-${idx}`}
              className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-emerald-200 transition-colors"
            >
              <div className="shrink-0">
                <div className="w-full sm:w-48 aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  {item.loading ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                      <div className="w-8 h-8 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                    </div>
                  ) : item.frameUrl ? (
                    <img
                      src={item.frameUrl}
                      alt={`Frame en ${formatSegundo(item.segundo)}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                      Sin captura
                    </div>
                  )}
                </div>
                <p className="mt-2 text-center text-sm font-semibold text-emerald-700">
                  {formatSegundo(item.segundo)}
                </p>
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Juicio experto
                  </p>
                  <p className="text-slate-700 text-sm">{item.juicio_experto}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Recomendación
                  </p>
                  <p className="text-slate-700 text-sm">{item.recomendacion}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
