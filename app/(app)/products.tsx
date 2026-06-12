import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, SPACING } from "@/src/theme";
import { Badge, Button, Input, ScreenHeader } from "@/src/components/ui";
import { Sheet } from "@/src/components/Sheet";
import { Products, newId } from "@/src/data/store";
import type { Product } from "@/src/data/types";
import { money } from "@/src/utils/format";
import { useAuth } from "@/src/auth/context";

export default function ProductsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);

  const reload = useCallback(async () => setList(await Products.list()), []);
  useFocusEffect(useCallback(() => {
    if (user && user.role !== "admin") router.replace("/sales");
    else reload();
  }, [reload, user, router]));

  async function save(p: Product) {
    const all = await Products.list();
    const idx = all.findIndex((x) => x.id === p.id);
    if (idx >= 0) all[idx] = p; else all.push(p);
    await Products.save(all);
    setEditing(null);
    reload();
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="Productos"
        subtitle={`${list.length} pizza${list.length === 1 ? "" : "s"}`}
        right={
          <Button
            label="Nueva Pizza"
            icon={<Ionicons name="add" size={16} color={COLORS.white} />}
            onPress={() => setEditing({ id: newId("p"), name: "", priceS: 0, priceM: 0, priceG: 0, active: true })}
            testID="products-new"
          />
        }
      />
      <View style={st.tableHeader}>
        <Text style={[st.th, { flex: 2 }]}>Nombre</Text>
        <Text style={[st.th, { width: 80, textAlign: "right" }]}>Chica</Text>
        <Text style={[st.th, { width: 80, textAlign: "right" }]}>Mediana</Text>
        <Text style={[st.th, { width: 80, textAlign: "right" }]}>Grande</Text>
        <Text style={[st.th, { width: 100 }]}>Estado</Text>
        <Text style={[st.th, { width: 60 }]}>Acciones</Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={st.row}>
            <Text style={[st.td, { flex: 2, fontWeight: "700" }]}>{item.name}</Text>
            <Text style={[st.td, { width: 80, textAlign: "right" }]}>{money(item.priceS)}</Text>
            <Text style={[st.td, { width: 80, textAlign: "right" }]}>{money(item.priceM)}</Text>
            <Text style={[st.td, { width: 80, textAlign: "right" }]}>{money(item.priceG)}</Text>
            <View style={{ width: 100 }}>
              <Badge
                label={item.active ? "Activo" : "Inactivo"}
                bg={item.active ? COLORS.successBg : COLORS.bg}
                color={item.active ? COLORS.success : COLORS.textMuted}
              />
            </View>
            <Pressable onPress={() => setEditing(item)} style={{ width: 60 }} testID={`product-edit-${item.id}`}>
              <Ionicons name="create" size={18} color={COLORS.text} />
            </Pressable>
          </View>
        )}
      />
      {editing && <ProductForm product={editing} onClose={() => setEditing(null)} onSave={save} />}
    </View>
  );
}

const ProductForm: React.FC<{ product: Product; onClose: () => void; onSave: (p: Product) => void }> = ({ product, onClose, onSave }) => {
  const [name, setName] = useState(product.name);
  const [s, setS] = useState(String(product.priceS));
  const [m, setM] = useState(String(product.priceM));
  const [g, setG] = useState(String(product.priceG));
  const [active, setActive] = useState(product.active);

  return (
    <Sheet
      visible
      title={product.name ? "Editar Pizza" : "Nueva Pizza"}
      onClose={onClose}
      width={520}
      testID="product-form"
      footer={
        <>
          <Button label="Cancelar" variant="secondary" onPress={onClose} />
          <Button
            label="Guardar"
            onPress={() => onSave({ ...product, name, priceS: Number(s) || 0, priceM: Number(m) || 0, priceG: Number(g) || 0, active })}
            disabled={!name.trim()}
            testID="product-save"
          />
        </>
      }
    >
      <View style={{ gap: SPACING.sm }}>
        <Input label="Nombre" value={name} onChangeText={setName} testID="pf-name" />
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <View style={{ flex: 1 }}><Input label="Precio Chica" value={s} onChangeText={setS} keyboardType="decimal-pad" testID="pf-s" /></View>
          <View style={{ flex: 1 }}><Input label="Precio Mediana" value={m} onChangeText={setM} keyboardType="decimal-pad" testID="pf-m" /></View>
          <View style={{ flex: 1 }}><Input label="Precio Grande" value={g} onChangeText={setG} keyboardType="decimal-pad" testID="pf-g" /></View>
        </View>
        <Pressable onPress={() => setActive((v) => !v)} style={st.toggle} testID="pf-active">
          <Ionicons name={active ? "toggle" : "toggle-outline"} size={28} color={active ? COLORS.primary : COLORS.textMuted} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.text }}>{active ? "Activo" : "Inactivo"}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
};

const st = StyleSheet.create({
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
  toggle: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingVertical: 6 },
});
