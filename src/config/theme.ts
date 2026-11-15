import { useEffect, useState } from "react";

export type ThemePreset = "classic" | "pastel";

export interface ThemePalette {
  preset: ThemePreset;
  primary: string;
  primaryHover: string;
  primaryRgb: string;
  accent: string;
  accentRgb: string;
  accentGradientFrom: string;
  accentGradientTo: string;
  cardBg: string;
  cardBgStops: [string, string, string, string, string];
  waveFill: string;
  subText: string;
  bodyText: string;
  universeBg: string;
  fogHex: number;
  accentHex: number;
  starColors: [number, number, number, number];
  starGlowRgba: string;
  wishGradients: [string, string][];
  sheenRgba: string;
}

const CLASSIC_PALETTE: ThemePalette = {
  preset: "classic",
  primary: "#233169",
  primaryHover: "#1b2654",
  primaryRgb: "35, 49, 105",
  accent: "#fbb719",
  accentRgb: "251, 183, 25",
  accentGradientFrom: "#c8960c",
  accentGradientTo: "#fde047",
  cardBg:
    "linear-gradient(135deg, #f8fafc 0%, #e7edf5 32%, #ffffff 55%, #dfe7f2 82%, #f4f7fb 100%)",
  cardBgStops: ["#f8fafc", "#e7edf5", "#ffffff", "#dfe7f2", "#f4f7fb"],
  waveFill: "#cbd5e1",
  subText: "#64748b",
  bodyText: "#334155",
  universeBg:
    "radial-gradient(circle at 50% 30%, #233169 0%, #151f42 52%, #0a1024 100%)",
  fogHex: 0x0b122c,
  accentHex: 0xfbb719,
  starColors: [0xfbb719, 0xffffff, 0x93c5fd, 0xfde68a],
  starGlowRgba: "rgba(147, 197, 253, 0.35)",
  wishGradients: [
    ["#233169", "#3b82f6"],
    ["#1e3a8a", "#fbb719"],
    ["#172554", "#60a5fa"],
    ["#1e293b", "#38bdf8"],
    ["#233169", "#d97706"],
  ],
  sheenRgba: "rgba(251, 183, 25, 0.55)",
};

const PASTEL_PALETTE: ThemePalette = {
  preset: "pastel",
  primary: "#8C3B60",
  primaryHover: "#732D4D",
  primaryRgb: "140, 59, 96",
  accent: "#E889AD",
  accentRgb: "232, 137, 173",
  accentGradientFrom: "#d9779b",
  accentGradientTo: "#fbcfe8",
  cardBg:
    "linear-gradient(135deg, #fff9fb 0%, #fcebf2 32%, #ffffff 55%, #f9e0eb 82%, #fff6f9 100%)",
  cardBgStops: ["#fff9fb", "#fcebf2", "#ffffff", "#f9e0eb", "#fff6f9"],
  waveFill: "#f5d0e0",
  subText: "#7a5a6a",
  bodyText: "#4a303d",
  universeBg:
    "radial-gradient(circle at 50% 30%, #6b2d4b 0%, #3d182b 52%, #1f0b16 100%)",
  fogHex: 0x240d19,
  accentHex: 0xf472b6,
  starColors: [0xf472b6, 0xffffff, 0xfbcfe8, 0xfde047],
  starGlowRgba: "rgba(244, 114, 182, 0.35)",
  wishGradients: [
    ["#8C3B60", "#f472b6"],
    ["#702448", "#fbcfe8"],
    ["#9d174d", "#f9a8d4"],
    ["#4c1d3d", "#f472b6"],
    ["#8C3B60", "#ec4899"],
  ],
  sheenRgba: "rgba(244, 114, 182, 0.55)",
};

export function getCurrentThemePreset(): ThemePreset {
  if (typeof document !== "undefined" && document.documentElement.dataset.theme === "pastel") {
    return "pastel";
  }
  return "classic";
}

export function getThemePalette(preset?: ThemePreset): ThemePalette {
  const active = preset ?? getCurrentThemePreset();
  return active === "pastel" ? PASTEL_PALETTE : CLASSIC_PALETTE;
}

export function useThemePalette(): ThemePalette {
  const [preset, setPreset] = useState<ThemePreset>(() => getCurrentThemePreset());

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setPreset(getCurrentThemePreset());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return getThemePalette(preset);
}
