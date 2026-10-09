import { ImageResponse } from "next/og";

// Link preview for chats and social networks. Colors are the design-system tokens (CSS vars don't apply here).
export const alt = "Status Board: salud del proyecto y status report ejecutivo con un clic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BARS = [
  { height: 150, color: "#9b8aa8" },
  { height: 110, color: "#ffffff" },
  { height: 60, color: "#e11d48" },
  { height: 130, color: "#16a34a" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(120deg, #300840 0%, #7800C0 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 3, opacity: 0.8 }}>STATUS DEL PROYECTO</div>
          <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2, marginTop: 12 }}>Status Board</div>
          <div style={{ fontSize: 34, marginTop: 20, lineHeight: 1.3, opacity: 0.9 }}>
            Semáforo de salud, KPIs y status report ejecutivo con un clic
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            height: 220,
            padding: "28px 32px",
            borderRadius: 18,
            background: "rgba(255,255,255,.14)",
          }}
        >
          {BARS.map((bar, i) => (
            <div
              key={i}
              style={{ width: 48, height: bar.height, marginLeft: i === 0 ? 0 : 20, borderRadius: 8, background: bar.color }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
