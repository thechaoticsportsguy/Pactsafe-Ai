"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
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
        setError(
          r.errors[0]?.message ??
            `File rejected: ${r.file.name}`,
        );
        return;
      }
      if (accepted[0]) onFile(accepted[0]);
    },
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "rounded-xl border-2 border-dashed border-border bg-surface/60",
          "p-10 text-center cursor-pointer transition-colors",
          isDragActive && "border-accent bg-accent/5",
          disabled && "opacity-60 cursor-not-allowed",
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-accent-soft flex items-center justify-center">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium">
              {isDragActive ? "Drop the contract here…" : "Drop a contract to analyze"}
            </p>
            <p className="mt-1 text-xs text-muted">
              PDF, DOCX, or TXT · up to 10 MB
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className="mt-2 h-9 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
            disabled={disabled}
          >
            Choose a file
          </button>
        </div>
      </div>
      {error && (
        <p className="text-sm text-severity-critical" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
