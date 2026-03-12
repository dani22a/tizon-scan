"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { TimelineAnotacion } from "../types/analysis";

interface VideoTimelineProps {
  /** URL del video (para thumbnails y seek). Puede ser blob URL o /videos/xxx.mp4 */
  videoSrc: string;
  /** Ref del video para seek al hacer click en timestamp. Debe apuntar al mismo video que videoSrc. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
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
  videoSrc,
  videoRef,
  timelineAnotaciones,
}: VideoTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [items, setItems] = useState<TimelineItemWithFrame[]>([]);
  const [loading, setLoading] = useState(true);

  const seekToSecond = useCallback((segundo: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = segundo;
      video.play().catch(() => {});
    }
  }, [videoRef]);

  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  const captureFrameAt = useCallback(
    (segundo: number): Promise<string | null> => {
      return new Promise((resolve) => {
        const video = hiddenVideoRef.current;
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
    const video = hiddenVideoRef.current;
    if (!video || !videoSrc) return;

    video.src = videoSrc;

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
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [videoSrc, timelineAnotaciones, captureFrameAt]);

  if (timelineAnotaciones.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-lg font-bold text-slate-800">
        Línea del tiempo del análisis
      </h3>

      <video
        ref={hiddenVideoRef}
        className="hidden"
        muted
        playsInline
        preload="metadata"
      />

      <canvas ref={canvasRef} className="hidden" />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
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
              className="flex flex-col sm:flex-row gap-4 p-4 rounded-[24px] border border-brand-100 bg-white shadow-sm hover:border-brand-200 transition-colors"
            >
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => seekToSecond(item.segundo)}
                  className="w-full sm:w-48 aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 block text-left hover:ring-2 hover:ring-brand-500 hover:ring-offset-2 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  {item.loading ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                      <div className="w-8 h-8 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
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
                </button>
                <button
                  type="button"
                  onClick={() => seekToSecond(item.segundo)}
                  className="mt-2 w-full text-center text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
                >
                  {formatSegundo(item.segundo)}
                </button>
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
