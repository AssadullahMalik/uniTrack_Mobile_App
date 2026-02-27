const NAVY = "#0F1E3C";
const NAVY_LIGHT = "#1A2B4A";
const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8C547";

export const Colors = {
  primary: NAVY,
  primaryLight: NAVY_LIGHT,
  accent: GOLD,
  accentLight: GOLD_LIGHT,
  background: "#F4F6FA",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF1F8",
  text: NAVY,
  textSecondary: "#5A6A8A",
  textMuted: "#9AA5BE",
  border: "#DDE3F0",
  success: "#27AE60",
  error: "#E74C3C",
  warning: "#F39C12",
  info: "#2980B9",

  student: "#2563EB",
  teacher: "#7C3AED",
  cr: "#059669",
  admin: "#DC2626",

  card: "#FFFFFF",
  cardBorder: "#E8EDF8",
  tabBarBg: "#FFFFFF",

  dark: {
    primary: "#1E3A5F",
    background: "#0A0F1E",
    surface: "#111827",
    surfaceAlt: "#1F2937",
    text: "#F9FAFB",
    textSecondary: "#9CA3AF",
    textMuted: "#6B7280",
    border: "#374151",
    card: "#1F2937",
    cardBorder: "#374151",
    tabBarBg: "#111827",
  },
};

export default {
  light: {
    text: Colors.text,
    background: Colors.background,
    tint: Colors.accent,
    tabIconDefault: Colors.textMuted,
    tabIconSelected: Colors.accent,
  },
};
