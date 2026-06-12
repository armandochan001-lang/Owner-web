import React, { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";

import { COLORS, SPACING } from "@/src/theme";
import { Input, ScreenHeader } from "@/src/components/ui";
import { Sheet } from "@/src/components/Sheet";
import { Orders } from "@/src/data/store";
import type { Order } from "@/src/data/types";
import { fmtDate, fmtTime, money } from "@/src/utils/format";

export default function CanceledOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);

  const reload = useCallback(async () => {
    const list = await Orders.list();
    setOrders(list.filter((o) => o.status === "canceled"));
  }, []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const filtered = useMemo(() => {
    const base = !search.trim()
      ? orders
      : orders.filter((o) => {
          const q = search.toLowerCase();
          return (
            String(o.dailyNumber).includes(q) ||
            o.customer.name.toLowerCase().includes(q) ||
            o.customer.phone.includes(q)
          );
        });
    return [...base].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [orders, search]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Pedidos Cancelados" subtitle={`${filtered.length} pedido${filtered.length === 1 ? "" : "s"}`} />
      <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm }}>
        <Input placeholder="Buscar cancelados..." value={search} onChangeText={setSearch} testID="canceled-search" />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        numColumns={4}
        key="cancel-cols-4"
        columnWrapperStyle={{ gap: SPACING.md }}
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}
        renderItem={({ item }) => (
          <Pressable onPress={() => setDetail(item)} style={st.card} testID={`canceled-row-${item.id}`} android_ripple={{ color: "rgba(0,0,0,0.04)" }}>
            <View style={st.cardRibbon}>
              <Text style={st.cardRibbonText}>CANCELADO</Text>
            </View>
            <Text style={st.cardOrderNum}>#{item.dailyNumber}</Text>
            <Text style={st.cardKv}>{fmtDate(item.canceledAt || item.createdAt)}  ·  {fmtTime(item.canceledAt || item.createdAt)}</Text>
            <Text style={st.cardCustomer} numberOfLines={1}>{item.customer.name || "—"}</Text>
            <Text style={st.cardSub} numberOfLines={1}>Canceló: {item.canceledBy || "—"}</Text>
            <View style={{ flex: 1 }} />
            <Text style={st.cardTotal}>{money(item.total)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: SPACING.xxl, width: "100%" }}>
            <Text style={{ color: COLORS.textMuted }}>No hay pedidos cancelados.</Text>
          </View>
        }
      />

      <Sheet visible={!!detail} title={detail ? `Pedido #${detail.dailyNumber} (Cancelado)` : ""} onClose={() => setDetail(null)} width={520} testID="canceled-detail">
        {detail && (
          <View>
            <Text style={st.kv}>Creado: {fmtDate(detail.createdAt)} {fmtTime(detail.createdAt)}</Text>
            <Text style={st.kv}>Cancelado: {detail.canceledAt ? `${fmtDate(detail.canceledAt)} ${fmtTime(detail.canceledAt)}` : "-"}</Text>
            <Text style={st.kv}>Cancelado por: {detail.canceledBy || "-"}</Text>
            <Text style={st.kv}>Cliente: {detail.customer.name || "-"} ({detail.customer.phone || "-"})</Text>
            <Text style={st.kv}>Direccion: {detail.customer.address || "-"}</Text>
            <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm }} />
            {detail.items.map((it) => (
              <View key={it.id} style={{ flexDirection: "row", paddingVertical: 4 }}>
                <Text style={{ flex: 1, fontSize: 13, color: COLORS.text }}>
                  {it.isHalves ? `MITAD ${it.halfA?.name}/${it.halfB?.name}` : it.productName.toUpperCase()} ({it.size})
                </Text>
                <Text style={{ fontWeight: "700", color: COLORS.text }}>
                  {money(it.basePrice + it.extras.reduce((s, e) => s + e.price, 0))}
                </Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: SPACING.sm }}>
              <Text style={{ fontWeight: "700" }}>TOTAL</Text>
              <Text style={{ fontWeight: "700", color: COLORS.canceled }}>{money(detail.total)}</Text>
            </View>
          </View>
        )}
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 160,
    backgroundColor: COLORS.errorBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
  },
  cardRibbon: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.canceled,
    paddingVertical: 3,
    alignItems: "center",
  },
  cardRibbonText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  cardOrderNum: { fontSize: 22, fontWeight: "700", color: COLORS.canceled, marginTop: 6 },
  cardKv: { fontSize: 11, color: COLORS.canceled, marginTop: 4 },
  cardCustomer: { fontSize: 14, fontWeight: "700", color: COLORS.canceled, marginTop: 6 },
  cardSub: { fontSize: 11, color: COLORS.canceled, opacity: 0.85, marginTop: 2 },
  cardTotal: { fontSize: 16, fontWeight: "700", color: COLORS.canceled, marginTop: 6 },
  kv: { fontSize: 13, color: COLORS.text, marginBottom: 4 },
});
