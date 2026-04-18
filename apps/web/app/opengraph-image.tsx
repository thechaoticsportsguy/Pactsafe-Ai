import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "PactSafe AI — AI contract review for freelancers. Never sign a bad contract again.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "radial-gradient(circle at 15% -5%, rgba(124,92,252,0.38) 0%, transparent 55%), radial-gradient(circle at 95% 100%, rgba(99,102,241,0.18) 0%, transparent 55%), #07080c",
          color: "#ecedf5",
          fontFamily: "sans-serif",
        }}
      >
        {/* top row: logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#FFFFFF",
            }}
          >
            {/* New geometric LogoMark — white square, dark P cutout.
                Workspace variant on the dark OG card so the mark reads
                clearly against the #07080c background. */}
            <svg width="56" height="56" viewBox="0 0 40 40">
              <rect x="0" y="0" width="40" height="40" fill="#FFFFFF" />
              <path
                d="M 8 8 L 32 8 L 32 22 L 20 22 L 20 32 L 8 32 Z M 12 12 L 28 12 L 28 18 L 12 18 Z"
                fill="#0a0a0f"
                fillRule="evenodd"
              />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            <span>PactSafe</span>
            <span style={{ color: "#a78bfa", marginLeft: 8 }}>AI</span>
          </div>
        </div>

        {/* middle: headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            maxWidth: "900px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(124,92,252,0.4)",
              background: "rgba(124,92,252,0.12)",
              color: "#a78bfa",
              fontSize: 20,
              fontWeight: 500,
            }}
          >
            AI contract review · built for freelancers
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: "-0.035em",
              lineHeight: 1.02,
              background:
                "linear-gradient(180deg, #ffffff 0%, #b8bad0 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Never sign a bad contract again.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#8b8fa6",
              lineHeight: 1.4,
              maxWidth: "780px",
            }}
          >
            Drop a freelance contract. Get a risk score, red flags, and
            ready-to-send negotiation language in under a minute.
          </div>
        </div>

        {/* bottom row: stats */}
        <div
          style={{
            display: "flex",
            gap: "56px",
            alignItems: "center",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: "28px",
            fontSize: 20,
            color: "#8b8fa6",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "#ecedf5", fontWeight: 600 }}>10,000+</span>
            <span>contracts analyzed</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "#ecedf5", fontWeight: 600 }}>&lt; 60 s</span>
            <span>average review</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "#ecedf5", fontWeight: 600 }}>100%</span>
            <span>private by default</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
