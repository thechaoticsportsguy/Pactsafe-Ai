"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileUp, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/cn";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/msword": [".doc"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};
const MAX_BYTES = 10 * 1024 * 1024;

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function Dropzone({ onFile, disabled }: DropzoneProps) {
  const [error, setError] = React.useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPT,
    multiple: false,
    maxSize: MAX_BYTES,
    noClick: true,
    disabled,
    onDrop: (accepted, rejected) => {
      setError(null);
      if (rejected.length > 0) {
        const r = rejected[0];
        setError(r.errors[0]?.message ?? `File rejected: ${r.file.name}`);
        return;
      }
      if (accepted[0]) onFile(accepted[0]);
    },
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "group relative overflow-hidden border-2 border-dashed border-ink-800/20 bg-beige-50 transition-all",
          "p-12 text-center cursor-pointer",
          "hover:border-ink-800/50 hover:bg-beige-100",
          isDragActive && "border-ink-800 bg-beige-100 scale-[1.01]",
          disabled && "opacity-60 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />

        <div className="relative mx-auto flex max-w-sm flex-col items-center gap-4">
          <div
            className={cn(
              "h-16 w-16 bg-beige-100 border border-ink-800/10 flex items-center justify-center",
              "transition-all",
              isDragActive && "scale-110 border-ink-800/40",
            )}
          >
            <UploadCloud
              className="h-7 w-7 text-ink-700"
              strokeWidth={1.75}
            />
          </div>
          <div>
            <p className="text-base font-semibold text-ink-800">
              {isDragActive
                ? "Drop your contract here"
                : "Drop a contract to analyze"}
            </p>
            <p className="mt-1 text-xs text-ink-600">
              PDF · DOCX · TXT · up to 10 MB
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className="mt-1 inline-flex h-9 items-center gap-1.5 bg-ink-800 px-4 text-sm font-medium text-beige-50 hover:bg-ink-700 active:translate-y-px transition-all"
            disabled={disabled}
          >
            <FileUp className="h-3.5 w-3.5" />
            Choose a file
          </button>
          <p className="mt-1 text-[11px] text-ink-500">
            or drag it right onto this card
          </p>
        </div>
      </div>
      {error && (
        <div
          className="flex items-start gap-2 border border-severity-critical-border bg-severity-critical-bg px-3 py-2.5 text-xs text-severity-critical-accent"
          role="alert"
        >
          <AlertOctagon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
