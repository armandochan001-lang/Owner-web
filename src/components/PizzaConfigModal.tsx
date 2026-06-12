import React, { useMemo, useState, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Sheet } from "./Sheet";
import { Button } from "./ui";
import type { Extra, Product, PizzaSize, OrderItem } from "@/src/data/types";
import { money } from "@/src/utils/format";
import { newId } from "@/src/data/store";

interface Props {
  visible: boolean;
  product: Product | null;
  extras: Extra[];
  initial?: OrderItem | null;
  onClose: () => void;
  onConfirm: (item: OrderItem) => void;
}

function priceFor(p: Product, size: PizzaSize): number {
  return size === "S" ? p.priceS : size === "M" ? p.priceM : p.priceG;
}

const SIZE_OPTS: { key: PizzaSize; label: string }[] = [
  { key: "S", label: "Chica" },
  { key: "M", label: "Mediana" },
  { key: "G", label: "Grande" },
];

export const PizzaConfigModal: React.FC<Props> = ({ visible, product, extras, initial, onClose, onConfirm }) => {
  const [size, setSize] = useState<PizzaSize>("G");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setSize(initial?.size ?? "G");
      setSelectedExtras(initial?.extras.map((e) => e.id) ?? []);
    }
  }, [visible, initial]);

  const activeExtras = useMemo(() => extras.filter((e) => e.active), [extras]);
  const base = product ? priceFor(product, size) : 0;
  const extrasTotal = useMemo(
    () => selectedExtras.reduce((s, id) => s + (activeExtras.find((e) => e.id === id)?.price ?? 0), 0),
    [selectedExtras, activeExtras],
  );
  const total = base + extrasTotal;

  function toggleExtra(id: string) {
    setSelectedExtras((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function confirm() {
    if (!product) return;
    const item: OrderItem = {
      id: initial?.id ?? newId("oi"),
      productId: product.id,
      productName: product.name,
      size,
      basePrice: base,
      extras: selectedExtras
        .map((id) => activeExtras.find((e) => e.id === id))
        .filter(Boolean)
        .map((e) => ({ id: e!.id, name: e!.name, price: e!.price })),
      isHalves: false,
    };
    onConfirm(item);
  }

  if (!product) return null;

  return (
    <Sheet
      visible={visible}
      title={product.name}
      onClose={onClose}
      width={680}
      testID="pizza-config-modal"
      footer={
        <>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue} testID="pizza-config-total">{money(total)}</Text>
          </View>
          <Button label="Cancelar" variant="secondary" onPress={onClose} testID="pizza-config-cancel" />
          <Button label={initial ? "Actualizar" : "Anadir"} onPress={confirm} testID="pizza-config-add" />
        </>
      }
    >
      <Text style={styles.section}>Tamano</Text>
      <View style={styles.sizesRow}>
        {SIZE_OPTS.map((s) => {
          const sel = size === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSize(s.key)}
              style={[styles.sizePill, sel && styles.sizePillSel]}
              testID={`pizza-config-size-${s.key}`}
            >
              <Text style={[styles.sizePillText, sel && styles.sizePillTextSel]}>{s.label}</Text>
              <Text style={[styles.sizePillPrice, sel && { color: COLORS.white }]}>{money(priceFor(product, s.key))}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.section, { marginTop: SPACING.lg }]}>Ingredientes Extra</Text>
      <Text style={styles.hint}>Selecciona uno o varios. Solo se anaden una vez.</Text>
      <ScrollView style={{ maxHeight: 280 }}>
        <View style={styles.extrasGrid}>
          {activeExtras.map((e) => {
            const sel = selectedExtras.includes(e.id);
            return (
              <Pressable
                key={e.id}
                onPress={() => toggleExtra(e.id)}
                style={[styles.extraChip, sel && styles.extraChipSel]}
                testID={`pizza-config-extra-${e.id}`}
              >
                <Text style={[styles.extraName, sel && { color: COLORS.white }]} numberOfLines={1}>
                  {e.name}
                </Text>
                <Text style={[styles.extraPrice, sel && { color: COLORS.white }]}>+{money(e.price)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  section: { fontSize: 13, fontWeight: "700", color: COLORS.text, textTransform: "uppercase", letterSpacing: 0.5 },
  hint: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.sm },
  sizesRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm },
  sizePill: {
    flex: 1, paddingVertical: 14, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.white, alignItems: "center",
  },
  sizePillSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sizePillText: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  sizePillTextSel: { color: COLORS.white },
  sizePillPrice: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  extrasGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  extraChip: {
    width: "31.5%",
    paddingVertical: 10, paddingHorizontal: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, backgroundColor: COLORS.white,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    minHeight: 40,
  },
  extraChipSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  extraName: { fontSize: 12, fontWeight: "600", color: COLORS.text, flex: 1 },
  extraPrice: { fontSize: 11, color: COLORS.textMuted, marginLeft: 6 },
  totalBox: { flex: 1, justifyContent: "center" },
  totalLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "700", letterSpacing: 0.5 },
  totalValue: { fontSize: 20, fontWeight: "700", color: COLORS.primary },
});
