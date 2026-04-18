import { ImageResponse } from "next/og";

/**
 * Favicon — 32×32 PNG dynamically rendered from the same SVG that
 * `components/primitives/LogoMark.tsx` ships. Black square, pure white
 * P (mono-light variant) — maximum contrast in browser tabs whether
 * the tab strip is light or dark.
 */

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 40 40"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="0" y="0" width="40" height="40" fill="#111111" />
          <path
            d="M 8 8 L 32 8 L 32 22 L 20 22 L 20 32 L 8 32 Z M 12 12 L 28 12 L 28 18 L 12 18 Z"
            fill="#FFFFFF"
            fillRule="evenodd"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
