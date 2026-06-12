import React, { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { ScreenHeader } from "@/src/components/ui";
import { Orders, Customers } from "@/src/data/store";
import type { Order } from "@/src/data/types";
import { dayKey, money } from "@/src/utils/format";

type RangePreset = "today" | "week" | "month" | "year" | "all" | "custom";

function isoDay(d: Date): string {
  return dayKey(d);
}
function parseDayKey(s: string): Date {
  // YYYY-MM-DD → local midnight
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}
function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1; // Monday as week start
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}
function fmtDateLocal(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function DashboardScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerCount, setCustomerCount] = useState(0);

  const today = useMemo(() => isoDay(new Date()), []);
  const [preset, setPreset] = useState<RangePreset>("today");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [range, setRange] = useState<{ start: string; end: string }>({ start: today, end: today });
  const [iosPicker, setIosPicker] = useState<"start" | "end" | null>(null);

  const reload = useCallback(async () => {
    setOrders(await Orders.list());
    const cs = await Customers.list();
    setCustomerCount(cs.length);
  }, []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  function applyPreset(p: RangePreset) {
    setPreset(p);
    const now = new Date();
    if (p === "today") {
      setStartDate(now); setEndDate(now);
      setRange({ start: isoDay(now), end: isoDay(now) });
    } else if (p === "week") {
      const s = startOfWeek(now);
      setStartDate(s); setEndDate(now);
      setRange({ start: isoDay(s), end: isoDay(now) });
    } else if (p === "month") {
      const s = startOfMonth(now);
      setStartDate(s); setEndDate(now);
      setRange({ start: isoDay(s), end: isoDay(now) });
    } else if (p === "year") {
      const s = startOfYear(now);
      setStartDate(s); setEndDate(now);
      setRange({ start: isoDay(s), end: isoDay(now) });
    } else if (p === "all") {
      setRange({ start: "0000-01-01", end: "9999-12-31" });
    }
  }

  function applyDate(which: "start" | "end", d: Date) {
    if (which === "start") {
      setStartDate(d);
      setRange((r) => ({ ...r, start: isoDay(d) }));
    } else {
      setEndDate(d);
      setRange((r) => ({ ...r, end: isoDay(d) }));
    }
    setPreset("custom");
  }

  function openPicker(which: "start" | "end") {
    const current = which === "start" ? startDate : endDate;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        onChange: (event, date) => {
          if (event.type === "set" && date) applyDate(which, date);
        },
      });
    } else {
      setIosPicker(which);
    }
  }

  const inRange = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status !== "canceled" &&
          o.dayKey >= range.start &&
          o.dayKey <= range.end,
      ),
    [orders, range],
  );

  const totalSales = inRange.reduce((s, o) => s + o.total, 0);
  const totalPizzas = inRange.reduce((s, o) => s + o.items.length, 0);
  const avgTicket = inRange.length > 0 ? totalSales / inRange.length : 0;

  const bars = useMemo(() => {
    if (inRange.length === 0) return [] as { label: string; total: number }[];
    const map = new Map<string, number>();
    for (const o of inRange) {
      map.set(o.dayKey, (map.get(o.dayKey) ?? 0) + o.total);
    }
    const keys = Array.from(map.keys()).sort();
    const days = keys.map((k) => ({ key: k, total: map.get(k) ?? 0 }));
    if (days.length <= 14) {
      return days.map((d) => {
        const [, m, dd] = d.key.split("-");
        return { label: `${dd}/${m}`, total: d.total };
      });
    }
    const byMonth = new Map<string, number>();
    for (const d of days) {
      const ym = d.key.slice(0, 7);
      byMonth.set(ym, (byMonth.get(ym) ?? 0) + d.total);
    }
    return Array.from(byMonth.entries())
      .sort()
      .slice(-12)
      .map(([k, v]) => {
        const [y, m] = k.split("-");
        return { label: `${m}/${y.slice(2)}`, total: v };
      });
  }, [inRange]);

  const maxBar = Math.max(1, ...bars.map((b) => b.total));

  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; total: number; count: number }>();
    for (const o of inRange) {
      if (o.customer.isGeneric || !o.customer.phone) continue;
      const cur = map.get(o.customer.phone) ?? { name: o.customer.name, phone: o.customer.phone, total: 0, count: 0 };
      cur.total += o.total;
      cur.count += 1;
      map.set(o.customer.phone, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [inRange]);

  const presetLabel: Record<RangePreset, string> = {
    today: "Hoy",
    week: "Esta Semana",
    month: "Este Mes",
    year: "Este Ano",
    all: "Todo el Historial",
    custom: "Personalizado",
  };

  const subtitle =
    preset === "all"
      ? "Todo el historial"
      : `${fmtDateLocal(startDate)} → ${fmtDateLocal(endDate)}`;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SPACING.xl }}>
      <ScreenHeader title="Dashboard" subtitle={subtitle} />

      <View style={st.filterBar}>
        <View style={st.presets}>
          {(["today", "week", "month", "year", "all"] as RangePreset[]).map((p) => {
            const sel = preset === p;
            return (
              <Pressable
                key={p}
                onPress={() => applyPreset(p)}
                style={[st.preset, sel && st.presetSel]}
                testID={`dash-preset-${p}`}
                android_ripple={{ color: "rgba(123,30,43,0.12)" }}
              >
                <Text style={[st.presetText, sel && { color: COLORS.white }]}>{presetLabel[p]}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={st.dateRow}>
          <DateField label="Desde" date={startDate} onPress={() => openPicker("start")} testID="dash-start" />
          <DateField label="Hasta" date={endDate} onPress={() => openPicker("end")} testID="dash-end" />
        </View>
      </View>

      {iosPicker && Platform.OS !== "android" && (
        <DateTimePicker
          value={iosPicker === "start" ? startDate : endDate}
          mode="date"
          display="spinner"
          onChange={(event, date) => {
            if (date) applyDate(iosPicker, date);
            setIosPicker(null);
          }}
        />
      )}

      <View style={st.kpis}>
        <KpiCard icon="cash" color={COLORS.primary} label="Ventas Totales" value={money(totalSales)} testID="kpi-sales" />
        <KpiCard icon="receipt" color={COLORS.success} label="Pedidos" value={String(inRange.length)} testID="kpi-orders" />
        <KpiCard icon="pizza" color={COLORS.warning} label="Pizzas Vendidas" value={String(totalPizzas)} testID="kpi-pizzas" />
        <KpiCard icon="trending-up" color="#2563EB" label="Ticket Promedio" value={money(avgTicket)} testID="kpi-avg" />
        <KpiCard icon="people" color={COLORS.text} label="Clientes" value={String(customerCount)} testID="kpi-customers" />
      </View>

      <View style={st.row}>
        <View style={[st.card, { flex: 2 }]}>
          <Text style={st.cardTitle}>Ventas por periodo</Text>
          {bars.length === 0 ? (
            <Text style={{ color: COLORS.textMuted, fontSize: 12, paddingVertical: SPACING.md }}>
              Sin ventas en el rango seleccionado.
            </Text>
          ) : (
            <View style={st.chart}>
              {bars.map((d, i) => {
                const h = (d.total / maxBar) * 160;
                return (
                  <View key={`${d.label}-${i}`} style={st.bar}>
                    <Text style={st.barValue}>{d.total > 0 ? `$${Math.round(d.total)}` : ""}</Text>
                    <View style={[st.barFill, { height: Math.max(2, h) }]} />
                    <Text style={st.barLabel} numberOfLines={1}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={[st.card, { flex: 1 }]}>
          <Text style={st.cardTitle}>Mejores Clientes</Text>
          {topCustomers.length === 0 ? (
            <Text style={{ color: COLORS.textMuted, fontSize: 12, paddingVertical: SPACING.md }}>Aun sin datos.</Text>
          ) : (
            topCustomers.map((c, i) => (
              <View key={c.phone} style={st.tcRow}>
                <View style={st.tcBadge}><Text style={st.tcBadgeText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.tcName} numberOfLines={1}>{c.name || c.phone}</Text>
                  <Text style={st.tcSub}>{c.count} pedido{c.count === 1 ? "" : "s"}</Text>
                </View>
                <Text style={st.tcTotal}>{money(c.total)}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const DateField: React.FC<{ label: string; date: Date; onPress: () => void; testID?: string }> = ({ label, date, onPress, testID }) => (
  <View style={{ flex: 1, maxWidth: 200, gap: 4 }}>
    <Text style={st.fieldLabel}>{label}</Text>
    <Pressable
      onPress={onPress}
      style={st.dateField}
      testID={testID}
      android_ripple={{ color: "rgba(0,0,0,0.06)" }}
    >
      <Ionicons name="calendar" size={18} color={COLORS.primary} />
      <Text style={st.dateValue}>{fmtDateLocal(date)}</Text>
      <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
    </Pressable>
  </View>
);

const KpiCard: React.FC<{ icon: any; color: string; label: string; value: string; testID?: string }> = ({ icon, color, label, value, testID }) => (
  <View style={st.kpi} testID={testID}>
    <View style={[st.kpiIcon, { backgroundColor: color + "22" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={st.kpiLabel}>{label}</Text>
      <Text style={st.kpiValue}>{value}</Text>
    </View>
  </View>
);

const st = StyleSheet.create({
  filterBar: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.sm },
  presets: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  preset: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.white, minHeight: 36, justifyContent: "center",
  },
  presetSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  presetText: { fontSize: 12, fontWeight: "700", color: COLORS.text },
  dateRow: { flexDirection: "row", gap: SPACING.sm, alignItems: "flex-end" },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    minHeight: 44,
  },
  dateValue: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.text },
  kpis: { flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  kpi: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, minHeight: 78,
  },
  kpiIcon: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center" },
  kpiLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  row: { flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  card: {
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.lg, gap: SPACING.md,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.sm, height: 220 },
  bar: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4, minWidth: 30 },
  barFill: { width: "70%", backgroundColor: COLORS.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barValue: { fontSize: 9, color: COLORS.textMuted, fontWeight: "600" },
  barLabel: { fontSize: 10, color: COLORS.text, fontWeight: "600", marginTop: 4 },
  tcRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tcBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  tcBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: "700" },
  tcName: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  tcSub: { fontSize: 11, color: COLORS.textMuted },
  tcTotal: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
});
