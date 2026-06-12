// Format helpers.
export function money(n: number): string {
  if (Number.isNaN(n) || n == null) return "$0.00";
  return `$${n.toFixed(2)}`;
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad2(m)} ${ampm}`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} ${fmtTime(iso)}`;
}

export function addMinutes(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

// Round UP to the next multiple of 5.
// 195 -> 195, 196 -> 200, 201 -> 205, 209 -> 210.
export function roundUpToFive(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n / 5) * 5;
}
