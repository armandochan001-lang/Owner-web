import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Button, Input, ScreenHeader } from "@/src/components/ui";
import { Sheet } from "@/src/components/Sheet";
import { TicketPreviewModal } from "@/src/components/TicketPreviewModal";
import { Config } from "@/src/data/store";
import type { AppConfig } from "@/src/data/types";
import { testPrint } from "@/src/utils/printer";
import { useAuth } from "@/src/auth/context";
import { listDevices, type BTDevice } from "@/src/utils/bluetooth";

export default function ConfigurationScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [ticket, setTicket] = useState<{ text: string; note?: string } | null>(null);
  const [saved, setSaved] = useState(false);

  // BT scan state
  const [scanOpen, setScanOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [devices, setDevices] = useState<BTDevice[]>([]);

  const reload = useCallback(async () => {
    setConfig(await Config.get());
  }, []);
  useFocusEffect(useCallback(() => {
    if (user && user.role !== "admin") router.replace("/sales");
    else reload();
  }, [reload, user, router]));

  if (!config) return null;
  const c = config;

  async function save(next?: AppConfig) {
    const target = next ?? c;
    await Config.save(target);
    setConfig(target);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function doTestPrint() {
    const res = await testPrint(c);
    setTicket({ text: res.preview, note: res.error });
  }

  async function openScan() {
    setScanOpen(true);
    setDevices([]);
    setScanError(null);
    setScanning(true);
    try {
      const list = await listDevices();
      setDevices(list);
      if (list.length === 0) {
        setScanError("No se encontraron impresoras. Asegurate de que esta encendida y emparejada en Ajustes de Bluetooth.");
      }
    } catch (e: any) {
      setScanError(e?.message || "No se pudo escanear Bluetooth.");
    } finally {
      setScanning(false);
    }
  }

  async function selectDevice(d: BTDevice) {
    const next: AppConfig = { ...c, printerName: d.name, printerAddress: d.address };
    setConfig(next);
    await save(next);
    setScanOpen(false);
  }

  async function unpair() {
    const next: AppConfig = { ...c, printerName: "", printerAddress: "" };
    setConfig(next);
    await save(next);
  }

  const paired = !!c.printerAddress;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SPACING.xl }}>
      <ScreenHeader title="Configuracion" subtitle="Datos del negocio e impresora" />

      <View style={st.container}>
        <View style={st.section}>
          <Text style={st.sectionTitle}>Negocio</Text>
          <View style={{ gap: SPACING.sm }}>
            <Input label="Nombre del negocio" value={c.businessName} onChangeText={(v) => setConfig({ ...c, businessName: v })} testID="cfg-name" />
            <Input label="Telefono" value={c.businessPhone} onChangeText={(v) => setConfig({ ...c, businessPhone: v })} testID="cfg-phone" />
            <Input
              label="Direccion"
              value={c.businessAddress}
              onChangeText={(v) => setConfig({ ...c, businessAddress: v })}
              multiline
              numberOfLines={2}
              style={{ minHeight: 60, textAlignVertical: "top" }}
              testID="cfg-address"
            />
          </View>
        </View>

        <View style={st.section}>
          <Text style={st.sectionTitle}>Tiempo de entrega</Text>
          <Input
            label="Minutos estimados (se suma a la hora del pedido)"
            value={String(c.deliveryEstimateMinutes)}
            onChangeText={(v) => setConfig({ ...c, deliveryEstimateMinutes: Number(v.replace(/[^0-9]/g, "")) || 0 })}
            keyboardType="number-pad"
            testID="cfg-delivery"
          />
          <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
            Ejemplo: pedido a las 5:31 PM con 50 min = entrega estimada 6:21 PM
          </Text>
        </View>

        <View style={st.section}>
          <Text style={st.sectionTitle}>Impresora Bluetooth Termica (58 mm)</Text>

          {paired ? (
            <View style={st.pairedCard} testID="cfg-printer-current">
              <View style={st.pairedIcon}>
                <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.pairedLabel}>Impresora vinculada</Text>
                <Text style={st.pairedName} numberOfLines={1}>{c.printerName || "Sin nombre"}</Text>
                <Text style={st.pairedAddr}>{c.printerAddress}</Text>
              </View>
            </View>
          ) : (
            <View style={st.notPairedCard} testID="cfg-printer-none">
              <Ionicons name="bluetooth-outline" size={24} color={COLORS.textMuted} />
              <Text style={st.notPairedText}>Sin impresora vinculada</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md, flexWrap: "wrap" }}>
            <Button
              label={paired ? "Cambiar impresora" : "Buscar impresoras"}
              icon={<Ionicons name="bluetooth" size={16} color={COLORS.white} />}
              onPress={openScan}
              testID="cfg-scan"
            />
            {paired && (
              <Button
                label="Desvincular"
                variant="secondary"
                onPress={unpair}
                testID="cfg-unpair"
              />
            )}
            <Button
              label="Imprimir prueba"
              variant="secondary"
              icon={<Ionicons name="print" size={16} color={COLORS.text} />}
              onPress={doTestPrint}
              testID="cfg-test"
              disabled={!paired}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: SPACING.sm, marginTop: SPACING.md }}>
          {saved && <Text style={{ color: COLORS.success, fontWeight: "600", alignSelf: "center" }}>Guardado</Text>}
          <Button label="Guardar Cambios" onPress={() => save()} testID="cfg-save" />
        </View>
      </View>

      <Sheet
        visible={scanOpen}
        title="Buscar impresoras Bluetooth"
        onClose={() => setScanOpen(false)}
        width={520}
        testID="cfg-scan-sheet"
        footer={
          <>
            <Button label="Cerrar" variant="secondary" onPress={() => setScanOpen(false)} />
            <Button label="Buscar de nuevo" onPress={openScan} disabled={scanning} testID="cfg-scan-again" />
          </>
        }
      >
        {scanning && (
          <View style={st.scanning}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={{ fontSize: 13, color: COLORS.textMuted }}>Buscando impresoras...</Text>
          </View>
        )}
        {scanError && !scanning && (
          <View style={st.errorBox} testID="cfg-scan-error">
            <Ionicons name="alert-circle" size={18} color={COLORS.error} />
            <Text style={st.errorText}>{scanError}</Text>
          </View>
        )}
        {!scanning && devices.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={st.listLabel}>Selecciona una impresora para vincularla</Text>
            {devices.map((d) => (
              <Pressable
                key={d.address}
                onPress={() => selectDevice(d)}
                style={st.deviceRow}
                testID={`cfg-device-${d.address}`}
                android_ripple={{ color: "rgba(123,30,43,0.08)" }}
              >
                <View style={st.deviceIcon}>
                  <Ionicons name="print" size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.deviceName} numberOfLines={1}>{d.name}</Text>
                  <Text style={st.deviceAddr}>{d.address}</Text>
                </View>
                {d.paired ? (
                  <View style={st.bondedBadge}>
                    <Text style={st.bondedText}>Emparejada</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </Sheet>

      {ticket && (
        <TicketPreviewModal
          visible
          text={ticket.text}
          note={ticket.note}
          onClose={() => setTicket(null)}
        />
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { padding: SPACING.lg, gap: SPACING.lg, maxWidth: 760 },
  section: {
    backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.lg, gap: SPACING.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SPACING.xs },
  pairedCard: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    backgroundColor: COLORS.successBg, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  pairedIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pairedLabel: { fontSize: 11, color: COLORS.success, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  pairedName: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  pairedAddr: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  notPairedCard: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    backgroundColor: COLORS.bg, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  notPairedText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
  scanning: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm,
    backgroundColor: COLORS.errorBg, padding: SPACING.md, borderRadius: RADIUS.md,
  },
  errorText: { flex: 1, fontSize: 13, color: COLORS.error, fontWeight: "600" },
  listLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  deviceRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    paddingVertical: 10, paddingHorizontal: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
  },
  deviceIcon: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  deviceName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  deviceAddr: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  bondedBadge: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4,
  },
  bondedText: { fontSize: 10, fontWeight: "700", color: COLORS.success, textTransform: "uppercase", letterSpacing: 0.5 },
});
