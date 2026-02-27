import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kort.mahoje.dk - Gratis Topografisk Kortudskrivning";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #2563eb 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Contour line decorations */}
        <svg
          viewBox="0 0 1200 630"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
          <g fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="3">
            <ellipse cx="900" cy="400" rx="400" ry="250" />
            <ellipse cx="890" cy="390" rx="340" ry="210" />
            <ellipse cx="880" cy="380" rx="280" ry="170" />
            <ellipse cx="870" cy="370" rx="220" ry="130" />
            <ellipse cx="860" cy="360" rx="160" ry="90" />
            <ellipse cx="300" cy="150" rx="250" ry="180" />
            <ellipse cx="295" cy="145" rx="200" ry="140" />
            <ellipse cx="290" cy="140" rx="150" ry="100" />
            <ellipse cx="285" cy="135" rx="100" ry="65" />
          </g>
          {/* UTM grid */}
          <g stroke="white" strokeOpacity="0.06" strokeWidth="1">
            <line x1="200" y1="0" x2="200" y2="630" />
            <line x1="400" y1="0" x2="400" y2="630" />
            <line x1="600" y1="0" x2="600" y2="630" />
            <line x1="800" y1="0" x2="800" y2="630" />
            <line x1="1000" y1="0" x2="1000" y2="630" />
            <line x1="0" y1="160" x2="1200" y2="160" />
            <line x1="0" y1="320" x2="1200" y2="320" />
            <line x1="0" y1="480" x2="1200" y2="480" />
          </g>
        </svg>

        {/* Map icon */}
        <svg
          viewBox="0 0 80 80"
          style={{ width: 80, height: 80, marginBottom: 20 }}
        >
          <path
            d="M12 62L27 54L40 62L53 54L68 62V18L53 26L40 18L27 26L12 18Z"
            fill="white"
            fillOpacity="0.2"
            stroke="white"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <polygon points="40,24 36,42 40,38 44,42" fill="white" />
          <text
            x="40"
            y="22"
            textAnchor="middle"
            fill="white"
            fontFamily="system-ui"
            fontWeight="700"
            fontSize="10"
          >
            N
          </text>
        </svg>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Kort.mahoje.dk
          </div>
          <div
            style={{
              fontSize: 26,
              color: "rgba(255,255,255,0.8)",
              fontWeight: 400,
            }}
          >
            Gratis topografisk kortudskrivning
          </div>
        </div>

        {/* Feature tags */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 32,
          }}
        >
          {["PDF-eksport", "UTM-gitter", "Ingen login", "Open source"].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 24,
                  padding: "8px 20px",
                  fontSize: 18,
                  color: "rgba(255,255,255,0.9)",
                  fontWeight: 500,
                }}
              >
                {tag}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
