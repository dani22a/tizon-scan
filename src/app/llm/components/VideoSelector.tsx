"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VideoSelectorProps {
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  onValidationError?: (message: string | null) => void;
  disabled?: boolean;
  error?: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideoSelector({
  selectedFile,
  onFileChange,
  onValidationError,
  disabled = false,
  error = null,
}: VideoSelectorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const validTypes = ["video/mp4", "video/quicktime"];
  const validExt = /\.(mp4|mov)$/i;

  const isValidFile = useCallback((file: File) => {
    return validTypes.includes(file.type) || validExt.test(file.name);
  }, []);

  const handleFile = useCallback(
    (file: File | null) => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);
      setDuration(null);

      if (!file) {
        onFileChange(null);
        return;
      }

      if (!isValidFile(file)) {
        onFileChange(null);
        onValidationError?.("Solo se permiten archivos .mp4 o .mov");
        return;
      }

      onValidationError?.(null);
      onFileChange(file);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewUrl(url);

      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        setDuration(video.duration);
      };
      video.src = url;
    },
    [onFileChange, isValidFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFile(file ?? null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    handleFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Video (.mp4 o .mov)
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mov,video/mp4,video/quicktime"
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
            ${isDragging ? "border-brand-500 bg-brand-50/80 scale-[1.01]" : "border-brand-200 hover:border-brand-400 hover:bg-brand-50/70"}
            ${disabled ? "opacity-60 cursor-not-allowed" : ""}
            ${error ? "border-red-300 bg-red-50/30" : ""}
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-brand-700/10 pointer-events-none" />
          <div className="relative flex flex-col items-center justify-center py-10 sm:py-12 px-6 text-center min-h-[180px]">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center mb-3 sm:mb-4 shadow-inner">
              <svg
                className="w-8 h-8 text-brand-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold mb-1">
              Arrastra tu video aquí o haz clic para seleccionar
            </p>
            <p className="text-slate-500 text-sm">
              Formatos soportados: MP4, MOV
            </p>
            {isDragging && (
              <p className="mt-3 text-brand-600 text-sm font-medium animate-pulse">
                Suelta el archivo aquí
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-[28px] border-2 border-brand-200 bg-white overflow-hidden shadow-lg shadow-brand-500/10">
          <div className="relative">
            <div className="aspect-video bg-slate-900 relative">
              {previewUrl ? (
                <video
                  src={previewUrl}
                  className="w-full h-full object-contain"
                  controls
                  muted
                  playsInline
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                </div>
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <span className="px-3 py-1 rounded-full bg-brand-600/90 text-white text-xs font-semibold backdrop-blur-sm">
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled}
                  className="p-2 rounded-full bg-white/90 hover:bg-red-500 hover:text-white text-slate-600 shadow-md transition-colors disabled:opacity-50"
                  title="Quitar video"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-brand-50/70 border-t border-slate-100 flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                {selectedFile.name}
              </span>
              <span className="text-xs text-slate-500">
                {formatFileSize(selectedFile.size)}
              </span>
              {duration !== null && (
                <span className="text-xs text-brand-600 font-medium">
                  {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
                </span>
              )}
              <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                className="ml-auto text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                Cambiar video
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
