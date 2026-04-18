import { ImageResponse } from "next/og";

/**
 * Apple touch icon — 180×180 PNG for iOS home-screen bookmarks and
 * `<link rel="apple-touch-icon">`. Same mono-light mark as the
 * favicon (black square, pure white P), scaled up.
 */

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
        }}
      >
        <svg
          width="180"
          height="180"
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
