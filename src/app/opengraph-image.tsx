import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getBrand } from "@/config/brand";

// Renderes ved build (statisk), så skrifterne læses fra kildetræet.
export const dynamic = "force-static";
export const alt = `${getBrand().siteName} - Gratis Topografisk Kortudskrivning`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CONTOURS = [
  { rx: 330, ry: 230 },
  { rx: 270, ry: 186 },
  { rx: 210, ry: 144 },
  { rx: 150, ry: 102 },
  { rx: 92, ry: 62 },
];

async function mahojeOgImage() {
  const fontDir = join(process.cwd(), "src/fonts/og");
  const [brygada, brygadaSemi, schibsted] = await Promise.all([
    readFile(join(fontDir, "Brygada1918-Regular.ttf")),
    readFile(join(fontDir, "Brygada1918-SemiBold.ttf")),
    readFile(join(fontDir, "SchibstedGrotesk-Regular.ttf")),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f5f3ee",
          padding: "72px 80px",
          position: "relative",
          fontFamily: "Schibsted Grotesk",
          color: "#15181c",
        }}
      >
        {/* Højdekurver: kortets eget motiv, holdt i stregfarven. */}
        <svg
          viewBox="0 0 1200 630"
          style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630 }}
        >
          <g fill="none" stroke="#d9d6cd" strokeWidth="2">
            {CONTOURS.map((c, i) => (
              <ellipse key={i} cx={1090 - i * 6} cy={330 - i * 8} rx={c.rx} ry={c.ry} />
            ))}
          </g>
        </svg>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg viewBox="0 0 512 512" width="56" height="56">
            <polyline
              points="62,400 182,168 262,284 342,118 452,400"
              fill="none"
              stroke="#15181c"
              strokeWidth="46"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ fontFamily: "Brygada 1918", fontWeight: 600, fontSize: 52, letterSpacing: "-0.01em" }}>
            Mahoje
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
          <div
            style={{
              fontFamily: "Brygada 1918",
              fontSize: 96,
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
            }}
          >
            Topografiske kort
          </div>
          <div style={{ fontSize: 34, lineHeight: 1.35, color: "#41454c", marginTop: 24 }}>
            Vælg målestok og papirformat, og hent kortet som PDF. Gratis og uden login.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            borderTop: "2px solid #15181c",
            paddingTop: 18,
            fontSize: 28,
            width: 360,
          }}
        >
          kort.mahoje.dk
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Brygada 1918", data: brygada, weight: 400, style: "normal" },
        { name: "Brygada 1918", data: brygadaSemi, weight: 600, style: "normal" },
        { name: "Schibsted Grotesk", data: schibsted, weight: 400, style: "normal" },
      ],
    }
  );
}

export default async function OgImage() {
  const brand = getBrand();
  if (brand.id === "mahoje") return mahojeOgImage();
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
          background: brand.og.gradient,
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

        {/* Map icon. Satori (next/og) does not support SVG <text>, so the
            "N" compass label is rendered as an absolutely-positioned div. */}
        <div
          style={{
            position: "relative",
            display: "flex",
            width: 80,
            height: 80,
            marginBottom: 20,
          }}
        >
          <svg viewBox="0 0 80 80" style={{ width: 80, height: 80 }}>
            <path
              d="M12 62L27 54L40 62L53 54L68 62V18L53 26L40 18L27 26L12 18Z"
              fill="white"
              fillOpacity="0.2"
              stroke="white"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <polygon points="40,24 36,42 40,38 44,42" fill="white" />
          </svg>
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 0,
              width: 80,
              display: "flex",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "white",
              fontFamily: "system-ui",
            }}
          >
            N
          </div>
        </div>

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
            {brand.og.title}
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
