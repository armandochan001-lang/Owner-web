import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Badge, Button, Input, ScreenHeader } from "@/src/components/ui";
import { Sheet } from "@/src/components/Sheet";
import { Drivers, DriverDay, Orders, newId } from "@/src/data/store";
import type { Driver, DriverStatus, Order } from "@/src/data/types";
import type { DriverDayState, DriverTicket } from "@/src/data/store";
import { fmtDate, fmtTime, money } from "@/src/utils/format";
import { driverColor } from "@/src/utils/driverColors";

type Tab = "day" | "drivers" | "history";

export default function DriversScreen() {
  const [tab, setTab] = useState<Tab>("day");
  const [day, setDay] = useState<DriverDayState | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editingTicket, setEditingTicket] = useState<DriverTicket | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const reload = useCallback(async () => {
    setDay(await DriverDay.get());
    setDrivers(await Drivers.list());
    setOrders(await Orders.list());
  }, []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  async function saveDay(next: DriverDayState) {
    await DriverDay.save(next);
    setDay(next);
  }

  async function newDay() {
    const fresh = await DriverDay.newDay();
    setDay(fresh);
    setConfirmReset(false);
  }

  async function saveTicket(t: DriverTicket) {
    if (!day) return;
    // Capa defensiva: no permitir registrar tickets con monto invalido o sin
    // repartidor. Se acepta el caso de "limpiar asignacion" (driverId y amount
    // ambos undefined), que retira el ticket del registro.
    const isClearing = !t.driverId && t.amount == null;
    if (!isClearing) {
      if (!t.driverId) return;
      if (typeof t.amount !== "number" || !Number.isFinite(t.amount) || t.amount < 120) return;
    }
    const tickets = day.tickets.map((x) => (x.ticket === t.ticket ? t : x));
    await saveDay({ ...day, tickets });
    setEditingTicket(null);
  }

  async function saveDriver(d: Driver) {
    const all = await Drivers.list();
    const idx = all.findIndex((x) => x.id === d.id);
    if (idx >= 0) all[idx] = d; else all.push(d);
    await Drivers.save(all);
    setEditingDriver(null);
    reload();
  }
  async function removeDriver(id: string) {
    const all = await Drivers.list();
    await Drivers.save(all.filter((x) => x.id !== id));
    setEditingDriver(null);
    reload();
  }

  const driverStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    if (!day) return map;
    for (const t of day.tickets) {
      if (!t.driverId) continue;
      const cur = map.get(t.driverId) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += t.amount || 0;
      map.set(t.driverId, cur);
    }
    return map;
  }, [day]);

  const totalToday = useMemo(
    () => (day ? day.tickets.reduce((s, t) => s + (t.amount || 0), 0) : 0),
    [day],
  );
  const ticketsUsed = day ? day.tickets.filter((t) => !!t.driverId).length : 0;

  if (!day) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="Repartidores"
        subtitle={`Inicio del dia: ${fmtDate(day.startedAt)} ${fmtTime(day.startedAt)}`}
        right={
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Button
              label="Nuevo Dia"
              variant="danger"
              icon={<Ionicons name="refresh" size={16} color={COLORS.white} />}
              onPress={() => setConfirmReset(true)}
              testID="drivers-new-day"
            />
          </View>
        }
      />

      <View style={st.tabs}>
        {(["day", "drivers", "history"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[st.tab, tab === t && st.tabSel]}
            testID={`drivers-tab-${t}`}
          >
            <Text style={[st.tabText, tab === t && { color: COLORS.primary }]}>
              {t === "day" ? "Tickets del Dia" : t === "drivers" ? "Repartidores" : "Historial"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "day" && (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ flex: 1.6, padding: SPACING.lg, gap: SPACING.sm }}>
            <View style={st.dayStats}>
              <Stat label="Tickets usados" value={`${ticketsUsed} / 110`} />
              <Stat label="Total cobrado" value={money(totalToday)} primary />
              <Stat label="Repartidores activos" value={String(drivers.filter((d) => d.active).length)} />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xl }}>
              <View style={st.grid}>
                {day.tickets.map((t) => {
                  const d = drivers.find((x) => x.id === t.driverId);
                  const hasDriver = !!d;
                  const color = hasDriver ? driverColor(d!.code) : undefined;
                  return (
                    <Pressable
                      key={t.ticket}
                      onPress={() => setEditingTicket(t)}
                      style={[
                        st.ticket,
                        hasDriver && { backgroundColor: color, borderColor: color },
                      ]}
                      testID={`ticket-${t.ticket}`}
                    >
                      <Text style={[st.ticketNum, hasDriver && { color: COLORS.white }]}>{t.ticket}</Text>
                      {hasDriver ? (
                        <>
                          <Text style={st.ticketDriver}>{d!.code}</Text>
                          {t.amount ? <Text style={st.ticketAmt}>{money(t.amount)}</Text> : null}
                        </>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={st.sidePanel}>
            <Text style={st.sidePanelTitle}>Resumen por Repartidor</Text>
            <ScrollView contentContainerStyle={{ gap: SPACING.sm }}>
              {drivers.filter((d) => d.active).map((d) => {
                const s = driverStats.get(d.id) ?? { count: 0, total: 0 };
                const color = driverColor(d.code);
                return (
                  <View key={d.id} style={st.driverCard}>
                    <View style={[st.driverAvatar, { backgroundColor: color }]}><Text style={st.driverAvatarText}>{d.code}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.driverName}>{d.name}</Text>
                      <Text style={st.driverSub}>{s.count} entrega{s.count === 1 ? "" : "s"}</Text>
                    </View>
                    <Text style={[st.driverTotal, { color }]}>{money(s.total)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {tab === "drivers" && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, flexDirection: "row", justifyContent: "flex-end" }}>
            <Button
              label="Nuevo Repartidor"
              icon={<Ionicons name="add" size={16} color={COLORS.white} />}
              onPress={() =>
                setEditingDriver({
                  id: newId("d"),
                  code: "",
                  name: "",
                  phone: "",
                  status: "available",
                  active: true,
                })
              }
              testID="driver-new"
            />
          </View>
          <View style={st.tableHeader}>
            <Text style={[st.th, { width: 60 }]}>Codigo</Text>
            <Text style={[st.th, { flex: 2 }]}>Nombre</Text>
            <Text style={[st.th, { flex: 1 }]}>Telefono</Text>
            <Text style={[st.th, { width: 120 }]}>Estado</Text>
            <Text style={[st.th, { width: 100 }]}>Activo</Text>
            <Text style={[st.th, { width: 60 }]}>Editar</Text>
          </View>
          <FlatList
            data={drivers}
            keyExtractor={(d) => d.id}
            renderItem={({ item }) => (
              <View style={st.row}>
                <View style={{ width: 60 }}>
                  <View style={[st.codeBadge, { backgroundColor: driverColor(item.code) }]}><Text style={st.codeBadgeText}>{item.code}</Text></View>
                </View>
                <Text style={[st.td, { flex: 2, fontWeight: "700" }]}>{item.name}</Text>
                <Text style={[st.td, { flex: 1 }]}>{item.phone || "-"}</Text>
                <View style={{ width: 120 }}>
                  <Badge
                    label={item.status === "available" ? "Disponible" : item.status === "on_delivery" ? "En ruta" : "Fuera"}
                    bg={item.status === "available" ? COLORS.successBg : item.status === "on_delivery" ? COLORS.warningBg : COLORS.bg}
                    color={item.status === "available" ? COLORS.success : item.status === "on_delivery" ? COLORS.warning : COLORS.textMuted}
                  />
                </View>
                <View style={{ width: 100 }}>
                  <Badge
                    label={item.active ? "Activo" : "Inactivo"}
                    bg={item.active ? COLORS.successBg : COLORS.bg}
                    color={item.active ? COLORS.success : COLORS.textMuted}
                  />
                </View>
                <Pressable style={{ width: 60 }} onPress={() => setEditingDriver(item)} testID={`driver-edit-${item.id}`}>
                  <Ionicons name="create" size={18} color={COLORS.text} />
                </Pressable>
              </View>
            )}
          />
        </View>
      )}

      {tab === "history" && <HistoryView orders={orders} drivers={drivers} />}

      {editingTicket && (
        <TicketForm
          ticket={editingTicket}
          drivers={drivers.filter((d) => d.active)}
          onClose={() => setEditingTicket(null)}
          onSave={saveTicket}
        />
      )}

      {editingDriver && (
        <DriverForm
          driver={editingDriver}
          onClose={() => setEditingDriver(null)}
          onSave={saveDriver}
          onDelete={removeDriver}
          canDelete={drivers.some((x) => x.id === editingDriver.id)}
        />
      )}

      <Sheet
        visible={confirmReset}
        title="Iniciar Nuevo Dia"
        onClose={() => setConfirmReset(false)}
        width={460}
        testID="drivers-confirm-reset"
        footer={
          <>
            <Button label="Cancelar" variant="secondary" onPress={() => setConfirmReset(false)} />
            <Button label="Si, iniciar nuevo dia" variant="danger" onPress={newDay} testID="confirm-new-day" />
          </>
        }
      >
        <Text style={{ fontSize: 14, color: COLORS.text }}>
          Se reiniciaran todos los tickets del dia (1 a 110) y se borraran las asignaciones actuales.
          Las entregas registradas en pedidos individuales se mantienen en el historial.
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: SPACING.sm }}>
          Esta accion no se puede deshacer.
        </Text>
      </Sheet>
    </View>
  );
}

const Stat: React.FC<{ label: string; value: string; primary?: boolean }> = ({ label, value, primary }) => (
  <View style={[st.statBox, primary && { backgroundColor: COLORS.primary }]}>
    <Text style={[st.statLabel, primary && { color: "#fff" }]}>{label}</Text>
    <Text style={[st.statValue, primary && { color: "#fff" }]}>{value}</Text>
  </View>
);

const TicketForm: React.FC<{ ticket: DriverTicket; drivers: Driver[]; onClose: () => void; onSave: (t: DriverTicket) => void }> = ({ ticket, drivers, onClose, onSave }) => {
  const [driverId, setDriverId] = useState(ticket.driverId || "");
  const [amount, setAmount] = useState(ticket.amount ? String(ticket.amount) : "");

  const trimmed = amount.trim();
  const amountNum = trimmed === "" ? NaN : Number(trimmed);
  const amountValid = Number.isFinite(amountNum) && amountNum >= 120;
  const driverValid = !!driverId;

  const amountError = !amountValid ? "Inserte un monto valido" : null;
  const driverError = !driverValid ? "Seleccione un repartidor" : null;
  const canSave = amountValid && driverValid;

  function handleSave() {
    if (!canSave) return;
    onSave({ ...ticket, driverId, amount: amountNum });
  }

  return (
    <Sheet
      visible
      title={`Ticket #${ticket.ticket}`}
      onClose={onClose}
      width={460}
      testID="ticket-form"
      footer={
        <>
          {ticket.driverId && (
            <Button
              label="Limpiar asignacion"
              variant="secondary"
              onPress={() => onSave({ ...ticket, driverId: undefined, amount: undefined, orderId: undefined })}
              testID="ticket-clear"
            />
          )}
          <Button label="Cancelar" variant="secondary" onPress={onClose} />
          <Button
            label="Guardar"
            onPress={handleSave}
            disabled={!canSave}
            testID="ticket-save"
          />
        </>
      }
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Repartidor</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {drivers.map((d) => {
          const sel = driverId === d.id;
          const color = driverColor(d.code);
          return (
            <Pressable
              key={d.id}
              onPress={() => setDriverId(d.id)}
              style={[
                st.driverPill,
                sel && { backgroundColor: color, borderColor: color },
              ]}
              testID={`ticket-driver-${d.id}`}
            >
              <Text style={[st.driverPillCode, sel ? { color: "#fff" } : { color }]}>{d.code}</Text>
              <Text style={[st.driverPillName, sel && { color: "#fff" }]} numberOfLines={1}>{d.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {driverError && (
        <Text style={st.fieldError} testID="ticket-driver-error">{driverError}</Text>
      )}
      <View style={{ marginTop: SPACING.md }}>
        <Input
          label="Monto de entrega (minimo $120)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          testID="ticket-amount"
        />
        {amountError && (
          <Text style={st.fieldError} testID="ticket-amount-error">{amountError}</Text>
        )}
      </View>
    </Sheet>
  );
};

const DriverForm: React.FC<{ driver: Driver; onClose: () => void; onSave: (d: Driver) => void; onDelete: (id: string) => void; canDelete: boolean }> = ({ driver, onClose, onSave, onDelete, canDelete }) => {
  const [code, setCode] = useState(driver.code);
  const [name, setName] = useState(driver.name);
  const [phone, setPhone] = useState(driver.phone);
  const [status, setStatus] = useState<DriverStatus>(driver.status);
  const [active, setActive] = useState(driver.active);
  return (
    <Sheet
      visible
      title={driver.name ? "Editar Repartidor" : "Nuevo Repartidor"}
      onClose={onClose}
      width={480}
      testID="driver-form"
      footer={
        <>
          {canDelete && <Button label="Eliminar" variant="danger" onPress={() => onDelete(driver.id)} testID="driver-delete" />}
          <Button label="Cancelar" variant="secondary" onPress={onClose} />
          <Button label="Guardar" onPress={() => onSave({ ...driver, code: code.toUpperCase(), name, phone, status, active })} disabled={!code.trim() || !name.trim()} testID="driver-save" />
        </>
      }
    >
      <View style={{ gap: SPACING.sm }}>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <View style={{ width: 100 }}><Input label="Codigo" value={code} onChangeText={setCode} autoCapitalize="characters" testID="df-code" /></View>
          <View style={{ flex: 1 }}><Input label="Nombre" value={name} onChangeText={setName} testID="df-name" /></View>
        </View>
        <Input label="Telefono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="df-phone" />
        <Text style={{ fontSize: 12, fontWeight: "600", color: COLORS.textMuted }}>Estado</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {(["available", "on_delivery", "off_duty"] as DriverStatus[]).map((s) => {
            const sel = status === s;
            return (
              <Pressable key={s} onPress={() => setStatus(s)} style={[st.statusPill, sel && st.statusPillSel]} testID={`df-status-${s}`}>
                <Text style={[st.statusPillText, sel && { color: "#fff" }]}>
                  {s === "available" ? "Disponible" : s === "on_delivery" ? "En ruta" : "Fuera"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => setActive((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingVertical: 6 }} testID="df-active">
          <Ionicons name={active ? "toggle" : "toggle-outline"} size={28} color={active ? COLORS.primary : COLORS.textMuted} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.text }}>{active ? "Activo" : "Inactivo"}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
};

const HistoryView: React.FC<{ orders: Order[]; drivers: Driver[] }> = ({ orders, drivers }) => {
  const [filterDriver, setFilterDriver] = useState<string>("");
  const [filterDate, setFilterDate] = useState("");
  const data = useMemo(() => {
    let list = orders.filter((o) => !!o.driverId);
    if (filterDriver) list = list.filter((o) => o.driverId === filterDriver);
    if (filterDate.trim()) list = list.filter((o) => o.dayKey.includes(filterDate.trim()));
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, filterDriver, filterDate]);

  const total = data.reduce((s, o) => s + (o.deliveryAmount ?? o.total), 0);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, alignItems: "flex-end" }}>
        <View style={{ width: 180 }}>
          <Input placeholder="Fecha (YYYY-MM-DD)" value={filterDate} onChangeText={setFilterDate} testID="history-date" />
        </View>
        <ScrollView horizontal contentContainerStyle={{ gap: 6 }} showsHorizontalScrollIndicator={false}>
          <Pressable onPress={() => setFilterDriver("")} style={[st.chip, !filterDriver && st.chipSel]} testID="history-driver-all">
            <Text style={[st.chipText, !filterDriver && { color: "#fff" }]}>Todos</Text>
          </Pressable>
          {drivers.map((d) => {
            const sel = filterDriver === d.id;
            const color = driverColor(d.code);
            return (
              <Pressable
                key={d.id}
                onPress={() => setFilterDriver(d.id)}
                style={[st.chip, sel && { backgroundColor: color, borderColor: color }]}
                testID={`history-driver-${d.id}`}
              >
                <Text style={[st.chipText, sel ? { color: "#fff" } : { color }]}>{d.code} - {d.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={[st.statBox, { backgroundColor: COLORS.primary, minWidth: 160 }]}>
          <Text style={[st.statLabel, { color: "#fff" }]}>Total</Text>
          <Text style={[st.statValue, { color: "#fff" }]}>{money(total)}</Text>
        </View>
      </View>

      <View style={st.tableHeader}>
        <Text style={[st.th, { width: 60 }]}>#</Text>
        <Text style={[st.th, { width: 110 }]}>Fecha</Text>
        <Text style={[st.th, { width: 90 }]}>Hora</Text>
        <Text style={[st.th, { width: 70 }]}>Rep.</Text>
        <Text style={[st.th, { flex: 2 }]}>Cliente</Text>
        <Text style={[st.th, { width: 110 }]}>Estado</Text>
        <Text style={[st.th, { width: 100, textAlign: "right" }]}>Total</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => {
          const d = drivers.find((x) => x.id === item.driverId);
          const color = driverColor(d?.code);
          return (
            <View style={st.row}>
              <Text style={[st.td, { width: 60, fontWeight: "700" }]}>#{item.dailyNumber}</Text>
              <Text style={[st.td, { width: 110 }]}>{fmtDate(item.createdAt)}</Text>
              <Text style={[st.td, { width: 90 }]}>{fmtTime(item.createdAt)}</Text>
              <Text style={[st.td, { width: 70, fontWeight: "700", color }]}>{d?.code || "-"}</Text>
              <Text style={[st.td, { flex: 2 }]} numberOfLines={1}>{item.customer.name || "-"}</Text>
              <Text style={[st.td, { width: 110 }]}>{item.status}</Text>
              <Text style={[st.td, { width: 100, textAlign: "right", fontWeight: "700" }]}>{money(item.total)}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: SPACING.xxl }}>
            <Text style={{ color: COLORS.textMuted }}>Sin entregas para mostrar.</Text>
          </View>
        }
      />
    </View>
  );
};

const st = StyleSheet.create({
  tabs: {
    flexDirection: "row", gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: { paddingVertical: 10, paddingHorizontal: SPACING.md, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabSel: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
  dayStats: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.sm },
  statBox: {
    flex: 1, padding: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "700", letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  ticket: {
    width: 60, height: 60, borderRadius: 4,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white,
    alignItems: "center", justifyContent: "center",
  },
  ticketNum: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  ticketDriver: { fontSize: 10, color: COLORS.white, fontWeight: "700" },
  ticketAmt: { fontSize: 9, color: COLORS.white },
  sidePanel: {
    width: 280, padding: SPACING.md, borderLeftWidth: 1, borderLeftColor: COLORS.border,
    backgroundColor: COLORS.white, gap: SPACING.sm,
  },
  sidePanelTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text, textTransform: "uppercase", letterSpacing: 0.5 },
  driverCard: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.bg,
  },
  driverAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  driverAvatarText: { color: COLORS.white, fontSize: 13, fontWeight: "700" },
  driverName: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  driverSub: { fontSize: 11, color: COLORS.textMuted },
  driverTotal: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  tableHeader: {
    flexDirection: "row", backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  th: { fontSize: 10, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  td: { fontSize: 13, color: COLORS.text },
  codeBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  codeBadgeText: { color: COLORS.white, fontSize: 13, fontWeight: "700" },
  driverPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  driverPillSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  driverPillCode: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  driverPillName: { fontSize: 12, fontWeight: "600", color: COLORS.text, maxWidth: 100 },
  statusPill: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", backgroundColor: COLORS.white },
  statusPillSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusPillText: { fontSize: 12, fontWeight: "700", color: COLORS.text },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, minHeight: 36, justifyContent: "center" },
  chipSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: "700", color: COLORS.text },
  fieldError: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
});
