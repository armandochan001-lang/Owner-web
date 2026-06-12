// Ticket térmico clásico de pizzería para impresora Bluetooth de 58 mm (32 cols).
// Usa comandos ESC/POS (negritas + doble tamaño) en los campos más importantes
// para que la cocina y los repartidores lean rápido.

import type { AppConfig, Order, OrderItem } from "@/src/data/types";
import { printText } from "./bluetooth";

const W = 32;

// ESC/POS — interpretados nativamente por la impresora. No tienen efecto visual
// en pantalla; el preview los limpia con `stripEscPos`.
const ESC = "\x1B";
const GS = "\x1D";
const INIT = ESC + "@";
const BOLD_ON = ESC + "E" + "\x01";
const BOLD_OFF = ESC + "E" + "\x00";
const DBL_ON = GS + "!" + "\x11"; // doble alto + doble ancho
const DBL_OFF = GS + "!" + "\x00";
const ALIGN_CENTER = ESC + "a" + "\x01";
const ALIGN_LEFT = ESC + "a" + "\x00";
const FEED = "\n\n\n";

function center(s: string): string {
  const trimmed = s.slice(0, W);
  const pad = Math.max(0, Math.floor((W - trimmed.length) / 2));
  return " ".repeat(pad) + trimmed;
}
function line(): string {
  return "-".repeat(W);
}
function row(left: string, right: string): string {
  const l = left.slice(0, W - right.length - 1);
  const space = W - l.length - right.length;
  return l + " ".repeat(Math.max(1, space)) + right;
}
function money2(n: number): string {
  return n.toFixed(2);
}
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
function fmtFechaEs(iso: string): string {
  const d = new Date(iso);
  const dow = ["dom.", "lun.", "mar.", "mie.", "jue.", "vie.", "sab."][d.getDay()];
  return `${dow} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fmtHoraEs(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "p.m." : "a.m.";
  h = h % 12 || 12;
  return `${h}:${pad2(m)} ${ampm}`;
}

const TAM: Record<string, string> = { S: "CH", M: "M", G: "G" };

function itemSubtotal(it: OrderItem): number {
  return it.basePrice + it.extras.reduce((s, e) => s + e.price, 0);
}
function itemTitulo(it: OrderItem): string {
  if (it.isHalves && it.halfA && it.halfB) {
    return `MITAD ${it.halfA.name.toUpperCase()}/${it.halfB.name.toUpperCase()} ${TAM[it.size]}`;
  }
  return `${it.productName.toUpperCase()} ${TAM[it.size]}`;
}

export function buildTicket(order: Order, _config: AppConfig): string {
  const out: string[] = [];
  out.push(INIT);

  // ---------- ENCABEZADO ----------
  out.push(ALIGN_CENTER);
  out.push(`${DBL_ON}${BOLD_ON}Orden #${order.dailyNumber}${BOLD_OFF}${DBL_OFF}`);
  out.push(`${BOLD_ON}${fmtHoraEs(order.createdAt)}${BOLD_OFF}`);
  out.push(ALIGN_LEFT);
  out.push(`Fecha: ${fmtFechaEs(order.createdAt)}`);
  out.push("Hora aprox entrega:");
  out.push(ALIGN_CENTER);
  out.push(`${BOLD_ON}${fmtHoraEs(order.estimatedDeliveryAt)}${BOLD_OFF}`);
  out.push(ALIGN_LEFT);

  // ---------- ENCABEZADO de columnas ----------
  out.push("  Nombre        Cant     Subtotal");
  out.push("=".repeat(W));

  // ---------- PRODUCTOS ----------
  for (const it of order.items) {
    const sub = itemSubtotal(it);
    out.push(`${BOLD_ON}${itemTitulo(it)}${BOLD_OFF}`);
    out.push(row("", `1.0      ${money2(sub)}`));
    if (it.extras.length > 0) {
      const ex = `Extras: ${it.extras.map((e) => e.name.toUpperCase()).join(", ")}`;
      for (let i = 0; i < ex.length; i += W) {
        out.push(`${BOLD_ON}${ex.slice(i, i + W)}${BOLD_OFF}`);
      }
    }
    out.push("_".repeat(W));
  }

  // ---------- TOTAL ----------
  out.push(`${BOLD_ON}TOTAL: ${money2(order.total)}${BOLD_OFF}`);

  // ---------- CLIENTE (sin separador previo) ----------
  out.push(`${DBL_ON}${BOLD_ON}Cliente:${BOLD_OFF}${DBL_OFF}`);
  out.push((order.customer.name || "-").toUpperCase());
  if (order.customer.phone) out.push(`**${order.customer.phone}**`);
  if (order.customer.address) {
    const addr = `Referencia:${order.customer.address.toUpperCase()}`;
    for (let i = 0; i < addr.length; i += W) out.push(addr.slice(i, i + W));
  }

  // ---------- COMENTARIOS ----------
  const comments = (order.comments || "").trim();
  if (comments) {
    out.push(line());
    out.push(`${BOLD_ON}Comentarios:${BOLD_OFF}`);
    for (let i = 0; i < comments.length; i += W) out.push(comments.slice(i, i + W));
  }

  out.push(FEED);
  return out.join("\n");
}

// Elimina los bytes de control ESC/POS para mostrar el ticket en pantalla.
export function stripEscPos(s: string): string {
  return s
    .replace(/\x1B@/g, "")
    .replace(/\x1BE[\x00-\xff]/g, "")
    .replace(/\x1B![\x00-\xff]/g, "")
    .replace(/\x1Ba[\x00-\xff]/g, "")
    .replace(/\x1D![\x00-\xff]/g, "");
}

export async function printTicket(text: string, address?: string): Promise<{ ok: boolean; preview: string; error?: string }> {
  const preview = stripEscPos(text);
  if (!address) {
    return {
      ok: false,
      preview,
      error: "Impresora no vinculada. Vincula una impresora desde Configuracion.",
    };
  }
  const res = await printText(address, text);
  return { ok: res.ok, preview, error: res.error };
}

export async function testPrint(config: AppConfig): Promise<{ ok: boolean; preview: string; error?: string }> {
  const now = new Date().toISOString();
  const text =
    INIT +
    ALIGN_CENTER +
    `${DBL_ON}${BOLD_ON}TICKET${BOLD_OFF}${DBL_OFF}\n\n` +
    `${DBL_ON}${BOLD_ON}PRUEBA${BOLD_OFF}${DBL_OFF}\n` +
    ALIGN_LEFT +
    line() + "\n" +
    `Fecha: ${fmtFechaEs(now)}\n` +
    `Hora:  ${fmtHoraEs(now)}\n` +
    line() + "\n" +
    center("ABCDEFGHIJKLMNOPQRSTUVWXYZ") + "\n" +
    center("0123456789") + "\n" +
    line() + "\n\n\n";
  return printTicket(text, config.printerAddress);
}
