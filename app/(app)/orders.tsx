import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Badge, Button, Input, ScreenHeader } from "@/src/components/ui";
import { Sheet } from "@/src/components/Sheet";
import { TicketPreviewModal } from "@/src/components/TicketPreviewModal";
import { Orders, Drivers, Config, DriverDay } from "@/src/data/store";
import type { Order, OrderStatus, Driver, AppConfig } from "@/src/data/types";
import { buildTicket, printTicket } from "@/src/utils/printer";
import { fmtDate, fmtTime, money } from "@/src/utils/format";
import { driverColor } from "@/src/utils/driverColors";
import { useAuth } from "@/src/auth/context";

const STATUS_LABEL: Record<OrderStatus, string> = {
  in_process: "En Proceso",
  on_the_way: "En Camino",
  delivered: "Entregado",
  canceled: "Cancelado",
};
const STATUS_BG: Record<OrderStatus, string> = {
  in_process: COLORS.warningBg,
  on_the_way: COLORS.primaryLight,
  delivered: COLORS.successBg,
  canceled: COLORS.errorBg,
};
const STATUS_FG: Record<OrderStatus, string> = {
  in_process: COLORS.warning,
  on_the_way: COLORS.primary,
  delivered: COLORS.success,
  canceled: COLORS.canceled,
};

export default function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);
  const [ticket, setTicket] = useState<{ text: string; note?: string } | null>(null);
  const [assignTarget, setAssignTarget] = useState<Order | null>(null);

  const reload = useCallback(async () => {
    setOrders(await Orders.list());
    setDrivers(await Drivers.list());
    setConfig(await Config.get());
  }, []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const filtered = useMemo(() => {
    let list = orders.filter((o) => o.status !== "canceled");
    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    if (dateFilter.trim()) list = list.filter((o) => o.dayKey.includes(dateFilter.trim()));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          String(o.dailyNumber).includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.customer.phone.includes(q),
      );
    }
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [orders, search, statusFilter, dateFilter]);

  async function changeStatus(o: Order, status: OrderStatus) {
    const patch: Partial<Order> = { status };
    if (status === "canceled") {
      patch.canceledAt = new Date().toISOString();
      patch.canceledBy = user?.username;
    }
    await Orders.update(o.id, patch);
    await reload();
    setDetail(null);
  }

  async function reprint(o: Order) {
    if (!config) return;
    const text = buildTicket(o, config);
    const res = await printTicket(text, config.printerAddress);
    setTicket({ text: res.preview, note: res.error });
  }

  async function assign(o: Order, driverId: string) {
    await Orders.update(o.id, { driverId, status: "on_the_way" });
    // Also push to next available ticket slot in DriverDay
    const dd = await DriverDay.get();
    const slot = dd.tickets.find((t) => !t.driverId);
    if (slot) {
      slot.driverId = driverId;
      slot.orderId = o.id;
      slot.amount = o.total;
      await DriverDay.save(dd);
    }
    setAssignTarget(null);
    await reload();
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="Pedidos"
        subtitle={`${filtered.length} pedido${filtered.length === 1 ? "" : "s"}`}
      />

      <View style={st.filters}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder="Buscar por # / cliente / telefono"
            value={search}
            onChangeText={setSearch}
            testID="orders-search"
          />
        </View>
        <View style={{ width: 160 }}>
          <Input
            placeholder="YYYY-MM-DD"
            value={dateFilter}
            onChangeText={setDateFilter}
            testID="orders-date"
          />
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {(["all", "in_process", "on_the_way", "delivered"] as const).map((s) => {
            const sel = statusFilter === s;
            return (
              <Pressable
                key={s}
                onPress={() => setStatusFilter(s)}
                style={[st.chip, sel && st.chipSel]}
                testID={`orders-filter-${s}`}
              >
                <Text style={[st.chipText, sel && { color: COLORS.white }]}>
                  {s === "all" ? "Todos" : STATUS_LABEL[s]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={st.gridWrap}>
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          numColumns={4}
          key="orders-cols-4"
          columnWrapperStyle={{ gap: SPACING.md }}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xl }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setDetail(item)}
              style={st.orderCard}
              testID={`order-row-${item.id}`}
              android_ripple={{ color: "rgba(0,0,0,0.04)" }}
            >
              <View style={st.orderCardActions}>
                <Pressable hitSlop={6} onPress={() => reprint(item)} testID={`reprint-${item.id}`} style={st.iconBtn}>
                  <Ionicons name="print" size={16} color={COLORS.primary} />
                </Pressable>
                <Pressable hitSlop={6} onPress={() => setDetail(item)} testID={`detail-${item.id}`} style={st.iconBtn}>
                  <Ionicons name="open" size={16} color={COLORS.text} />
                </Pressable>
              </View>
              <Text style={st.cardOrderNum}>#{item.dailyNumber}</Text>
              <View style={st.cardLine}>
                <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                <Text style={st.cardLineText}>{fmtTime(item.createdAt)}</Text>
              </View>
              <View style={st.cardLine}>
                <Ionicons name="rocket-outline" size={12} color={COLORS.textMuted} />
                <Text style={st.cardLineText}>{fmtTime(item.estimatedDeliveryAt)}</Text>
              </View>
              <Text style={st.cardCustomer} numberOfLines={1}>{item.customer.name || "—"}</Text>
              <Text style={st.cardSub} numberOfLines={1}>{item.customer.phone || "Sin teléfono"}</Text>
              <View style={{ flex: 1 }} />
              <Text style={st.cardTotal}>{money(item.total)}</Text>
              <View style={[st.cardStatusBand, { backgroundColor: STATUS_BG[item.status] }]}>
                <Text style={[st.cardStatusText, { color: STATUS_FG[item.status] }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", padding: SPACING.xxl, width: "100%" }}>
              <Text style={{ color: COLORS.textMuted }}>No hay pedidos para mostrar.</Text>
            </View>
          }
        />
      </View>

      <Sheet
        visible={!!detail}
        title={detail ? `Pedido #${detail.dailyNumber}` : ""}
        onClose={() => setDetail(null)}
        width={560}
        testID="order-detail"
        footer={
          detail && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1, justifyContent: "flex-end" }}>
              <Button label="Reimprimir" variant="secondary" onPress={() => reprint(detail)} testID="detail-reprint" />
              {detail.status === "in_process" && (
                <Button
                  label="Asignar repartidor"
                  variant="secondary"
                  onPress={() => setAssignTarget(detail)}
                  testID="detail-assign"
                />
              )}
              {detail.status !== "delivered" && detail.status !== "canceled" && (
                <Button label="Marcar Entregado" onPress={() => changeStatus(detail, "delivered")} testID="detail-delivered" />
              )}
              {detail.status !== "canceled" && (
                <Button label="Cancelar Pedido" variant="danger" onPress={() => changeStatus(detail, "canceled")} testID="detail-cancel" />
              )}
            </View>
          )
        }
      >
        {detail && (
          <View>
            <Text style={st.kv}>Fecha: {fmtDate(detail.createdAt)} {fmtTime(detail.createdAt)}</Text>
            <Text style={st.kv}>Entrega estimada: {fmtTime(detail.estimatedDeliveryAt)}</Text>
            <Text style={st.kv}>Cliente: {detail.customer.name || "-"}</Text>
            <Text style={st.kv}>Telefono: {detail.customer.phone || "-"}</Text>
            <Text style={st.kv}>Direccion: {detail.customer.address || "-"}</Text>
            <Text style={st.kv}>Tipo: {detail.orderType === "delivery" ? "Domicilio" : "Recoger"}</Text>
            {detail.comments ? <Text style={st.kv}>Comentarios: {detail.comments}</Text> : null}
            {detail.driverId ? (
              <Text style={st.kv}>Repartidor: {drivers.find((d) => d.id === detail.driverId)?.code || detail.driverId}</Text>
            ) : null}
            <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm }} />
            {detail.items.map((it) => (
              <View key={it.id} style={st.itemDetail}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: COLORS.text }}>
                    {it.isHalves ? `MITAD ${it.halfA?.name}/${it.halfB?.name}` : it.productName.toUpperCase()}{"  "}
                    <Text style={{ color: COLORS.textMuted, fontWeight: "600" }}>
                      {it.size === "S" ? "CH" : it.size === "M" ? "M" : "G"}
                    </Text>
                  </Text>
                  {it.extras.length > 0 && (
                    <Text style={st.itemExtras}>Extras: {it.extras.map((e) => e.name).join(", ")}</Text>
                  )}
                </View>
                <Text style={{ fontWeight: "700", color: COLORS.text }}>
                  {money(it.basePrice + it.extras.reduce((s, e) => s + e.price, 0))}
                </Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 16, fontWeight: "700" }}>TOTAL</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.primary }}>{money(detail.total)}</Text>
            </View>
          </View>
        )}
      </Sheet>

      <Sheet
        visible={!!assignTarget}
        title="Asignar repartidor"
        onClose={() => setAssignTarget(null)}
        width={420}
        testID="assign-driver"
      >
        <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: SPACING.sm }}>
          Selecciona el repartidor para el pedido #{assignTarget?.dailyNumber}
        </Text>
        <View style={{ gap: 6 }}>
          {drivers.filter((d) => d.active).map((d) => (
            <Pressable
              key={d.id}
              onPress={() => assignTarget && assign(assignTarget, d.id)}
              style={st.driverRow}
              testID={`assign-driver-${d.id}`}
            >
              <View style={[st.driverCircle, { backgroundColor: driverColor(d.code) }]}>
                <Text style={st.driverCode}>{d.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: COLORS.text }}>{d.name}</Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{d.phone || "-"}</Text>
              </View>
              <Badge
                label={d.status === "available" ? "Disponible" : d.status === "on_delivery" ? "En ruta" : "Fuera"}
                bg={d.status === "available" ? COLORS.successBg : d.status === "on_delivery" ? COLORS.warningBg : COLORS.bg}
                color={d.status === "available" ? COLORS.success : d.status === "on_delivery" ? COLORS.warning : COLORS.textMuted}
              />
            </Pressable>
          ))}
        </View>
      </Sheet>

      {ticket && (
        <TicketPreviewModal
          visible
          text={ticket.text}
          note={ticket.note}
          onClose={() => setTicket(null)}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  filters: {
    flexDirection: "row", gap: SPACING.sm, alignItems: "flex-end",
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, minHeight: 36, justifyContent: "center",
  },
  chipSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: "700", color: COLORS.text },
  tableHeader: {
    flexDirection: "row", backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  th: { fontSize: 10, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.sm, backgroundColor: COLORS.white,
  },
  td: { fontSize: 13, color: COLORS.text },
  gridWrap: { flex: 1 },
  orderCard: {
    flex: 1,
    minHeight: 188,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
  },
  orderCardActions: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: "row",
    gap: 4,
    zIndex: 1,
  },
  iconBtn: {
    width: 28, height: 28, borderRadius: 6,
    alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  cardOrderNum: { fontSize: 22, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  cardLine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cardLineText: { fontSize: 11, color: COLORS.textMuted, fontWeight: "500" },
  cardCustomer: { fontSize: 14, fontWeight: "700", color: COLORS.text, marginTop: 6 },
  cardSub: { fontSize: 11, color: COLORS.textMuted },
  cardTotal: { fontSize: 16, fontWeight: "700", color: COLORS.primary, marginTop: 6, marginBottom: 6 },
  cardStatusBand: {
    marginHorizontal: -SPACING.md,
    paddingVertical: 6,
    alignItems: "center",
  },
  cardStatusText: {
    fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5,
  },
  kv: { fontSize: 13, color: COLORS.text, marginBottom: 4 },
  itemDetail: {
    flexDirection: "row", alignItems: "center", paddingVertical: 6,
  },
  itemExtras: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontStyle: "italic" },
  driverRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    paddingVertical: 10, paddingHorizontal: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.white,
  },
  driverCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  driverCode: { color: COLORS.white, fontSize: 14, fontWeight: "700" },
});
