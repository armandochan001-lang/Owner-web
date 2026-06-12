// Color codes for delivery drivers (per spec).
// A=Green, B=Blue, C=Orange, D=Purple, E=Pink, R=Red.
const DRIVER_COLOR_MAP: Record<string, string> = {
  A: "#16A34A",
  B: "#2563EB",
  C: "#EA580C",
  D: "#7C3AED",
  E: "#EC4899",
  R: "#DC2626",
};

export function driverColor(code?: string | null): string {
  if (!code) return "#7B1E2B";
  return DRIVER_COLOR_MAP[code.toUpperCase()] ?? "#7B1E2B";
}
