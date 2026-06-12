// Bluetooth printer abstraction.
//
// En el APK final hay que reemplazar el cuerpo de las funciones marcadas con
// // TODO REAL BT por las llamadas del módulo nativo (por ejemplo
// react-native-bluetooth-classic o tp-react-native-bluetooth-printer).
// La forma de los datos devueltos (BTDevice / PrintResult) no cambia, por lo
// que la UI sigue funcionando sin tocar nada.

import { PermissionsAndroid, Platform } from "react-native";

export interface BTDevice {
  name: string;
  address: string;
  paired?: boolean;
}

export interface PrintResult {
  ok: boolean;
  error?: string;
}

// Carga perezosa del módulo nativo si está disponible (EAS build).
function loadNative(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-bluetooth-classic");
    return mod?.default ?? mod ?? null;
  } catch {
    return null;
  }
}

// Solicita los permisos de Bluetooth en tiempo de ejecución. En Android 12+
// (API 31) se necesitan BLUETOOTH_CONNECT y BLUETOOTH_SCAN. En Android 11 y
// anteriores el descubrimiento Bluetooth requiere ACCESS_FINE_LOCATION.
async function ensurePermissions(): Promise<{ ok: boolean; error?: string }> {
  if (Platform.OS !== "android") return { ok: true };
  const apiLevel = typeof Platform.Version === "number" ? Platform.Version : parseInt(String(Platform.Version), 10);

  const required: string[] = [];
  if (apiLevel >= 31) {
    required.push("android.permission.BLUETOOTH_CONNECT");
    required.push("android.permission.BLUETOOTH_SCAN");
  } else {
    // En Android <= 11 el descubrimiento Bluetooth exige permiso de ubicación.
    required.push("android.permission.ACCESS_FINE_LOCATION");
  }

  try {
    const result = await PermissionsAndroid.requestMultiple(required as any);
    const denied = required.filter(
      (p) => result[p as keyof typeof result] !== PermissionsAndroid.RESULTS.GRANTED,
    );
    if (denied.length === 0) return { ok: true };

    const neverAsk = denied.some(
      (p) => result[p as keyof typeof result] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    );
    return {
      ok: false,
      error: neverAsk
        ? "Permisos Bluetooth denegados permanentemente. Activalos manualmente en Ajustes > Aplicaciones > PizzeriaPOS > Permisos."
        : "Permisos Bluetooth necesarios para buscar impresoras. Concede el acceso e intenta de nuevo.",
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "No se pudieron solicitar los permisos Bluetooth." };
  }
}

export async function isBluetoothEnabled(): Promise<boolean> {
  const native = loadNative();
  if (!native || Platform.OS !== "android") return false;
  try {
    return !!(await native.isBluetoothEnabled());
  } catch {
    return false;
  }
}

export async function requestEnableBluetooth(): Promise<boolean> {
  const native = loadNative();
  if (!native || Platform.OS !== "android") return false;
  try {
    return !!(await native.requestBluetoothEnabled());
  } catch {
    return false;
  }
}

// Lista impresoras emparejadas + intenta descubrir cercanas si el módulo lo
// soporta. En entornos sin módulo nativo (Expo Go, Web) lanza un error claro.
export async function listDevices(): Promise<BTDevice[]> {
  const native = loadNative();
  if (!native || Platform.OS !== "android") {
    throw new Error(
      "Bluetooth no disponible en este entorno. Genera el APK de Android para vincular la impresora.",
    );
  }
  const perm = await ensurePermissions();
  if (!perm.ok) {
    throw new Error(perm.error || "Permisos Bluetooth requeridos.");
  }
  const ok = await isBluetoothEnabled();
  if (!ok) {
    const enabled = await requestEnableBluetooth();
    if (!enabled) {
      throw new Error("Activa el Bluetooth desde Ajustes para buscar impresoras.");
    }
  }
  const bonded: any[] = (await native.getBondedDevices()) || [];
  const list: BTDevice[] = bonded.map((d: any) => ({
    name: d.name || d.id || "Desconocido",
    address: d.address || d.id || "",
    paired: true,
  }));
  // Intenta descubrir cercanas también (opcional, depende del módulo).
  try {
    if (typeof native.startDiscovery === "function") {
      const found: any[] = (await native.startDiscovery()) || [];
      const seen = new Set(list.map((d) => d.address));
      for (const f of found) {
        const addr = f.address || f.id || "";
        if (!seen.has(addr)) {
          list.push({ name: f.name || addr || "Desconocido", address: addr, paired: false });
        }
      }
    }
  } catch {
    // Silencioso: si el descubrimiento falla, devolvemos al menos las emparejadas.
  }
  return list;
}

let connectedAddress: string | null = null;

export async function connectDevice(address: string): Promise<void> {
  const native = loadNative();
  if (!native || Platform.OS !== "android") {
    throw new Error("Bluetooth no disponible en este entorno.");
  }
  const perm = await ensurePermissions();
  if (!perm.ok) throw new Error(perm.error || "Permisos Bluetooth requeridos.");
  await native.connectToDevice(address);
  connectedAddress = address;
}

export async function disconnectDevice(): Promise<void> {
  const native = loadNative();
  if (!native || !connectedAddress) return;
  try {
    await native.disconnectFromDevice(connectedAddress);
  } catch {
    // ignore
  }
  connectedAddress = null;
}

export async function printText(address: string, text: string): Promise<PrintResult> {
  const native = loadNative();
  if (!native || Platform.OS !== "android") {
    return {
      ok: false,
      error: "Impresion Bluetooth disponible solo en la tablet con el APK instalado.",
    };
  }
  if (!address) {
    return { ok: false, error: "No hay impresora vinculada. Ve a Configuracion para vincular una." };
  }
  const perm = await ensurePermissions();
  if (!perm.ok) {
    return { ok: false, error: perm.error || "Permisos Bluetooth requeridos." };
  }
  try {
    if (connectedAddress !== address) {
      await native.connectToDevice(address);
      connectedAddress = address;
    }
    await native.writeToDevice(address, text);
    return { ok: true };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || "No se pudo imprimir. Verifica que la impresora esta encendida y vinculada.",
    };
  }
}
