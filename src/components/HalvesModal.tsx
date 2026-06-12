import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Sheet } from "./Sheet";
import { Button, Input } from "./ui";
import type { Extra, OrderItem, PizzaSize, Product } from "@/src/data/types";
import { money, roundUpToFive } from "@/src/utils/format";
import { newId } from "@/src/data/store";

interface Props {
  visible: boolean;
  products: Product[];
  extras: Extra[];
  initial?: OrderItem | null;
  onClose: () => void;
  onConfirm: (item: OrderItem) => void;
}

const SIZE_OPTS: { key: PizzaSize; label: string }[] = [
  { key: "S", label: "Chica" },
  { key: "M", label: "Mediana" },
  { key: "G", label: "Grande" },
];

function priceFor(p: Product, size: PizzaSize): number {
  return size === "S" ? p.priceS : size === "M" ? p.priceM : p.priceG;
}

export const HalvesModal: React.FC<Props> = ({ visible, products, extras, initial, onClose, onConfirm }) => {
  const [size, setSize] = useState<PizzaSize>("G");
  const [a, setA] = useState<Product | null>(null);
  const [b, setB] = useState<Product | null>(null);
  const [qa, setQa] = useState("");
  const [qb, setQb] = useState("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    if (initial && initial.isHalves) {
      setSize(initial.size);
      const pa = products.find((p) => p.id === initial.halfA?.id) ?? null;
      const pb = products.find((p) => p.id === initial.halfB?.id) ?? null;
      setA(pa);
      setB(pb);
      setSelectedExtras(initial.extras.map((e) => e.id));
    } else {
      setSize("G");
      setA(null);
      setB(null);
      setSelectedExtras([]);
    }
    setQa("");
    setQb("");
  }, [visible, initial, products]);

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);
  const activeExtras = useMemo(() => extras.filter((e) => e.active), [extras]);
  const fa = useMemo(() => filterList(activeProducts, qa), [activeProducts, qa]);
  const fb = useMemo(() => filterList(activeProducts, qb), [activeProducts, qb]);

  const priceA = a ? priceFor(a, size) : 0;
  const priceB = b ? priceFor(b, size) : 0;
  const baseRaw = priceA / 2 + priceB / 2;
  const baseRounded = roundUpToFive(baseRaw);
  const extrasTotal = useMemo(
    () => selectedExtras.reduce((s, id) => s + (activeExtras.find((e) => e.id === id)?.price ?? 0), 0),
    [selectedExtras, activeExtras],
  );
  const total = baseRounded + extrasTotal;

  function toggleExtra(id: string) {
    setSelectedExtras((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function confirm() {
    if (!a || !b) return;
    const item: OrderItem = {
      id: initial?.id ?? newId("oi"),
      productName: `${a.name}/${b.name}`,
      size,
      basePrice: baseRounded,
      extras: selectedExtras
        .map((id) => activeExtras.find((e) => e.id === id))
        .filter(Boolean)
        .map((e) => ({ id: e!.id, name: e!.name, price: e!.price })),
      isHalves: true,
      halfA: { id: a.id, name: a.name, price: priceA },
      halfB: { id: b.id, name: b.name, price: priceB },
    };
    onConfirm(item);
  }

  return (
    <Sheet
      visible={visible}
      title={initial ? "Editar Mitades" : "Pizza por Mitades"}
      onClose={onClose}
      width={820}
      testID="halves-modal"
      footer={
        <>
          <View style={{ flex: 1 }}>
            <Text style={st.totalLabel}>TOTAL</Text>
            <Text style={st.totalValue} testID="halves-total">{money(total)}</Text>
            {a && b && baseRounded !== baseRaw && (
              <Text style={st.roundHint}>
                Base {money(baseRaw)} → redondeado a {money(baseRounded)}
              </Text>
            )}
          </View>
          <Button label="Cancelar" variant="secondary" onPress={onClose} testID="halves-cancel" />
          <Button
            label={initial ? "Actualizar" : "Añadir"}
            onPress={confirm}
            disabled={!a || !b}
            testID="halves-add"
          />
        </>
      }
    >
      <Text style={st.section}>Tamaño</Text>
      <View style={st.sizesRow}>
        {SIZE_OPTS.map((s) => {
          const sel = size === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSize(s.key)}
              style={[st.sizePill, sel && st.sizePillSel]}
              testID={`halves-size-${s.key}`}
            >
              <Text style={[st.sizePillText, sel && { color: COLORS.white }]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={st.cols}>
        <Column
          label="Primera Mitad"
          query={qa}
          setQuery={setQa}
          list={fa}
          selected={a}
          setSelected={(p) => { setA(p); setQa(""); }}
          size={size}
          testIdPrefix="halves-a"
        />
        <Column
          label="Segunda Mitad"
          query={qb}
          setQuery={setQb}
          list={fb}
          selected={b}
          setSelected={(p) => { setB(p); setQb(""); }}
          size={size}
          testIdPrefix="halves-b"
        />
      </View>

      <Text style={[st.section, { marginTop: SPACING.lg }]}>Ingredientes Extra</Text>
      <Text style={st.hint}>Selecciona uno o varios. Precio fijo, no depende del tamaño.</Text>
      <View style={st.extrasGrid}>
        {activeExtras.map((e) => {
          const sel = selectedExtras.includes(e.id);
          return (
            <Pressable
              key={e.id}
              onPress={() => toggleExtra(e.id)}
              style={[st.extraChip, sel && st.extraChipSel]}
              testID={`halves-extra-${e.id}`}
            >
              <Text style={[st.extraName, sel && { color: COLORS.white }]} numberOfLines={1}>
                {e.name}
              </Text>
              <Text style={[st.extraPrice, sel && { color: COLORS.white }]}>+{money(e.price)}</Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
};

function filterList(list: Product[], q: string): Product[] {
  const base = q.trim() ? list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : list;
  return base.slice(0, 8);
}

const Column: React.FC<{
  label: string;
  query: string;
  setQuery: (s: string) => void;
  list: Product[];
  selected: Product | null;
  setSelected: (p: Product) => void;
  size: PizzaSize;
  testIdPrefix: string;
}> = ({ label, query, setQuery, list, selected, setSelected, size, testIdPrefix }) => (
  <View style={{ flex: 1, gap: SPACING.sm }}>
    <Text style={st.colLabel}>{label}</Text>
    <Input
      placeholder="Buscar pizza..."
      value={query}
      onChangeText={setQuery}
      testID={`${testIdPrefix}-search`}
    />
    {selected ? (
      <Pressable onPress={() => setSelected(null as unknown as Product)} style={st.selected} testID={`${testIdPrefix}-clear`}>
        <Text style={st.selName}>{selected.name}</Text>
        <Text style={st.selPrice}>{money(priceFor(selected, size))}</Text>
      </Pressable>
    ) : (
      <ScrollView style={{ maxHeight: 200 }}>
        {list.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setSelected(p)}
            style={st.row}
            testID={`${testIdPrefix}-pick-${p.id}`}
          >
            <Text style={st.rowName}>{p.name}</Text>
            <Text style={st.rowPrice}>{money(priceFor(p, size))}</Text>
          </Pressable>
        ))}
      </ScrollView>
    )}
  </View>
);

const st = StyleSheet.create({
  section: { fontSize: 13, fontWeight: "700", color: COLORS.text, textTransform: "uppercase", letterSpacing: 0.5 },
  hint: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.sm },
  sizesRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.lg },
  sizePill: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: "center",
  },
  sizePillSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sizePillText: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  cols: { flexDirection: "row", gap: SPACING.md },
  colLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowName: { fontSize: 13, color: COLORS.text, fontWeight: "500", flex: 1 },
  rowPrice: { fontSize: 12, color: COLORS.textMuted, marginLeft: 8 },
  selected: {
    borderWidth: 1, borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 12, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  selName: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  selPrice: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  totalLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "700", letterSpacing: 0.5 },
  totalValue: { fontSize: 20, fontWeight: "700", color: COLORS.primary },
  roundHint: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  extrasGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  extraChip: {
    width: "23.5%",
    paddingVertical: 10, paddingHorizontal: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, backgroundColor: COLORS.white,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    minHeight: 40,
  },
  extraChipSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  extraName: { fontSize: 12, fontWeight: "600", color: COLORS.text, flex: 1 },
  extraPrice: { fontSize: 11, color: COLORS.textMuted, marginLeft: 6 },
});
