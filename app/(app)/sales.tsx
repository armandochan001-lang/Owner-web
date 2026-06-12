import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Button, Input } from "@/src/components/ui";
import { Sheet } from "@/src/components/Sheet";
import { PizzaConfigModal } from "@/src/components/PizzaConfigModal";
import { HalvesModal } from "@/src/components/HalvesModal";
import { CustomerModal, CustomerForm } from "@/src/components/CustomerModal";
import { TicketPreviewModal } from "@/src/components/TicketPreviewModal";

import { Customers, Extras, Orders, Products, Config, newId } from "@/src/data/store";
import type { Extra, Order, OrderItem, Product, AppConfig } from "@/src/data/types";
import { addMinutes, dayKey, money } from "@/src/utils/format";
import { buildTicket, printTicket } from "@/src/utils/printer";
import { useAuth } from "@/src/auth/context";

export default function SalesScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);

  const [configProduct, setConfigProduct] = useState<Product | null>(null);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [halvesOpen, setHalvesOpen] = useState(false);
  const [halvesEditing, setHalvesEditing] = useState<OrderItem | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [editPickerOpen, setEditPickerOpen] = useState<OrderItem | null>(null);

  const [ticket, setTicket] = useState<{ text: string; note?: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setProducts(await Products.list());
    setExtras(await Extras.list());
    setConfig(await Config.get());
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredProducts = useMemo(() => {
    const active = products.filter((p) => p.active);
    if (!search.trim()) return active;
    const q = search.toLowerCase();
    return active.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const total = useMemo(
    () =>
      items.reduce(
        (s, it) => s + it.basePrice + it.extras.reduce((a, b) => a + b.price, 0),
        0,
      ),
    [items],
  );

  function openConfig(p: Product) {
    setEditingItem(null);
    setConfigProduct(p);
  }

  function addOrUpdateItem(item: OrderItem) {
    setItems((cur) => {
      const idx = cur.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        const c = [...cur]; c[idx] = item; return c;
      }
      return [...cur, item];
    });
    setConfigProduct(null);
    setEditingItem(null);
    setHalvesOpen(false);
    setHalvesEditing(null);
    setEditPickerOpen(null);
  }

  function removeItem(id: string) {
    setItems((cur) => cur.filter((x) => x.id !== id));
    setEditPickerOpen(null);
  }

  function onItemTap(it: OrderItem) {
    setEditPickerOpen(it);
  }

  function startEdit(it: OrderItem) {
    setEditPickerOpen(null);
    if (it.isHalves) {
      setHalvesEditing(it);
      setHalvesOpen(true);
      return;
    }
    const p = products.find((x) => x.id === it.productId);
    if (!p) return;
    setEditingItem(it);
    setConfigProduct(p);
  }

  async function finalize(form: CustomerForm) {
    if (!user || items.length === 0 || !config) return;

    const now = new Date();
    const dk = dayKey(now);
    const number = await Orders.nextDailyNumber(dk);
    const createdAt = now.toISOString();
    const estimated = addMinutes(createdAt, config.deliveryEstimateMinutes);

    if (!form.isGeneric && form.phone.trim()) {
      await Customers.upsert({
        id: newId("c"),
        phone: form.phone.trim(),
        name: form.name.trim(),
        address: form.address.trim(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    const order: Order = {
      id: newId("o"),
      dailyNumber: number,
      dayKey: dk,
      items,
      total,
      customer: {
        phone: form.phone.trim(),
        name: form.name.trim() || (form.isGeneric ? "Cliente Generico" : ""),
        address: form.address.trim(),
        isGeneric: form.isGeneric,
      },
      comments: form.comments.trim(),
      orderType: form.orderType,
      status: "in_process",
      createdAt,
      estimatedDeliveryAt: estimated,
      createdBy: user.username,
    };
    await Orders.add(order);

    const text = buildTicket(order, config);
    const printRes = await printTicket(text, config.printerAddress);

    setItems([]);
    setCustomerOpen(false);
    if (printRes.ok) {
      setToast(`Pedido #${number} guardado e impreso correctamente.`);
    } else {
      setToast(`Pedido #${number} guardado. ${printRes.error || "No se pudo imprimir."} Puedes reimprimir desde Pedidos.`);
    }
  }

  return (
    <View style={st.root}>
      {/* LEFT - Order */}
      <View style={st.leftPanel}>
        <View style={st.leftHeader}>
          <Text style={st.leftTitle}>Pedido Actual</Text>
          <Text style={st.leftSub}>{items.length} producto{items.length === 1 ? "" : "s"}</Text>
        </View>
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: SPACING.sm, paddingBottom: SPACING.lg }}
          ListEmptyComponent={
            <View style={st.empty}>
              <Ionicons name="cart-outline" size={48} color={COLORS.border} />
              <Text style={st.emptyText}>Selecciona pizzas del catalogo</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onItemTap(item)}
              style={st.item}
              testID={`order-item-${item.id}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={st.itemName}>
                  {item.isHalves ? `MITAD ${item.halfA?.name} / ${item.halfB?.name}` : item.productName.toUpperCase()}
                  <Text style={st.itemSize}>  {item.size === "S" ? "CH" : item.size === "M" ? "M" : "G"}</Text>
                </Text>
                {item.extras.length > 0 && (
                  <Text style={st.itemExtras}>
                    Extras: {item.extras.map((e) => e.name).join(", ")}
                  </Text>
                )}
              </View>
              <Text style={st.itemPrice}>
                {money(item.basePrice + item.extras.reduce((s, e) => s + e.price, 0))}
              </Text>
            </Pressable>
          )}
        />
        <View style={st.totalBar}>
          <Text style={st.totalLabel}>TOTAL</Text>
          <Text style={st.totalValue} testID="sales-total">{money(total)}</Text>
        </View>
        <View style={{ padding: SPACING.md }}>
          <Button
            label="Continuar"
            onPress={() => setCustomerOpen(true)}
            disabled={items.length === 0}
            full
            testID="sales-continue"
            style={{ height: 72 }}
          />
        </View>
      </View>

      {/* RIGHT - Catalog */}
      <View style={st.rightPanel}>
        <View style={st.catHeader}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Buscar pizza..."
              value={search}
              onChangeText={setSearch}
              testID="sales-search"
            />
          </View>
          <Button
            label="Mitades"
            icon={<Ionicons name="git-branch" size={20} color={COLORS.white} />}
            onPress={() => setHalvesOpen(true)}
            testID="sales-halves"
            style={{ height: 56, paddingHorizontal: SPACING.xl, borderRadius: 10 }}
            labelStyle={{ fontSize: 17, fontWeight: "700", letterSpacing: 0.3 }}
          />
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.xs, paddingBottom: SPACING.xl }}>
          {filteredProducts.length === 0 ? (
            <View style={{ alignItems: "center", padding: SPACING.xxl }}>
              <Text style={{ color: COLORS.textMuted }}>Sin resultados</Text>
            </View>
          ) : (
            <View style={st.grid}>
              {filteredProducts.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openConfig(item)}
                  style={st.card}
                  testID={`product-card-${item.id}`}
                >
                  <View style={st.cardImg}>
                    <Ionicons name="pizza" size={42} color={COLORS.primary} />
                  </View>
                  <View style={st.cardFooter}>
                    <Text style={st.cardName} numberOfLines={2}>{item.name}</Text>
                    <Text style={st.cardPrice}>{money(item.priceG)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <PizzaConfigModal
        visible={!!configProduct}
        product={configProduct}
        extras={extras}
        initial={editingItem}
        onClose={() => { setConfigProduct(null); setEditingItem(null); }}
        onConfirm={addOrUpdateItem}
      />

      <HalvesModal
        visible={halvesOpen}
        products={products}
        extras={extras}
        initial={halvesEditing}
        onClose={() => { setHalvesOpen(false); setHalvesEditing(null); }}
        onConfirm={addOrUpdateItem}
      />

      <CustomerModal
        visible={customerOpen}
        onClose={() => setCustomerOpen(false)}
        onConfirm={finalize}
      />

      {ticket && (
        <TicketPreviewModal
          visible
          text={ticket.text}
          note={ticket.note}
          onClose={() => setTicket(null)}
        />
      )}

      <Sheet
        visible={!!editPickerOpen}
        title="Editar producto"
        onClose={() => setEditPickerOpen(null)}
        width={380}
        testID="edit-picker"
        footer={
          <Button label="Cerrar" variant="secondary" onPress={() => setEditPickerOpen(null)} />
        }
      >
        <Text style={{ fontSize: 14, color: COLORS.text, marginBottom: SPACING.md }}>
          {editPickerOpen?.isHalves
            ? `MITAD ${editPickerOpen?.halfA?.name} / ${editPickerOpen?.halfB?.name}`
            : editPickerOpen?.productName}
        </Text>
        <Button
          label="Editar extras / configuracion"
          variant="secondary"
          full
          onPress={() => editPickerOpen && startEdit(editPickerOpen)}
          testID="edit-config"
        />
        <View style={{ height: SPACING.sm }} />
        <Button
          label="Eliminar pizza"
          variant="danger"
          full
          onPress={() => editPickerOpen && removeItem(editPickerOpen.id)}
          testID="edit-delete"
        />
      </Sheet>

      {toast && (
        <View style={st.toast} testID="toast">
          <Text style={st.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: COLORS.bg },
  leftPanel: {
    width: "30%",
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  leftHeader: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  leftTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  leftSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  empty: { alignItems: "center", paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
  item: {
    backgroundColor: COLORS.white,
    flexDirection: "row", alignItems: "center",
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  itemName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  itemSize: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  itemExtras: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontStyle: "italic" },
  itemPrice: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  totalBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  totalLabel: { fontSize: 12, fontWeight: "700", color: COLORS.primary, letterSpacing: 0.5 },
  totalValue: { fontSize: 22, fontWeight: "700", color: COLORS.primary },
  rightPanel: { flex: 1 },
  catHeader: {
    flexDirection: "row", gap: SPACING.sm, alignItems: "flex-end",
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  card: {
    width: 216,
    height: 254,
    backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg,
    overflow: "hidden",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    alignItems: "flex-start",
  },
  cardImg: {
    width: "100%", flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  cardFooter: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    gap: 2,
    minHeight: 62,
    justifyContent: "center",
  },
  cardName: { fontSize: 13, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  cardPrice: { fontSize: 15, fontWeight: "700", color: COLORS.primary, marginTop: 2 },
  toast: {
    position: "absolute",
    bottom: SPACING.lg, alignSelf: "center",
    backgroundColor: COLORS.black, paddingVertical: 10, paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  toastText: { color: COLORS.white, fontSize: 13, fontWeight: "600" },
});
