import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, SPACING } from "@/src/theme";
import { Badge, Button, Input, ScreenHeader } from "@/src/components/ui";
import { Sheet } from "@/src/components/Sheet";
import { Extras, newId } from "@/src/data/store";
import type { Extra } from "@/src/data/types";
import { money } from "@/src/utils/format";
import { useAuth } from "@/src/auth/context";

export default function ExtrasScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<Extra[]>([]);
  const [editing, setEditing] = useState<Extra | null>(null);

  const reload = useCallback(async () => setList(await Extras.list()), []);
  useFocusEffect(useCallback(() => {
    if (user && user.role !== "admin") router.replace("/sales");
    else reload();
  }, [reload, user, router]));

  async function save(e: Extra) {
    const all = await Extras.list();
    const idx = all.findIndex((x) => x.id === e.id);
    if (idx >= 0) all[idx] = e; else all.push(e);
    await Extras.save(all);
    setEditing(null);
    reload();
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="Ingredientes Extra"
        subtitle={`${list.length} ingrediente${list.length === 1 ? "" : "s"}`}
        right={
          <Button
            label="Nuevo Extra"
            icon={<Ionicons name="add" size={16} color={COLORS.white} />}
            onPress={() => setEditing({ id: newId("e"), name: "", price: 0, active: true })}
            testID="extras-new"
          />
        }
      />
      <View style={st.tableHeader}>
        <Text style={[st.th, { flex: 2 }]}>Nombre</Text>
        <Text style={[st.th, { width: 100, textAlign: "right" }]}>Precio</Text>
        <Text style={[st.th, { width: 100 }]}>Estado</Text>
        <Text style={[st.th, { width: 60 }]}>Acciones</Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <View style={st.row}>
            <Text style={[st.td, { flex: 2, fontWeight: "700" }]}>{item.name}</Text>
            <Text style={[st.td, { width: 100, textAlign: "right" }]}>{money(item.price)}</Text>
            <View style={{ width: 100 }}>
              <Badge
                label={item.active ? "Activo" : "Inactivo"}
                bg={item.active ? COLORS.successBg : COLORS.bg}
                color={item.active ? COLORS.success : COLORS.textMuted}
              />
            </View>
            <Pressable onPress={() => setEditing(item)} style={{ width: 60 }} testID={`extra-edit-${item.id}`}>
              <Ionicons name="create" size={18} color={COLORS.text} />
            </Pressable>
          </View>
        )}
      />
      {editing && <ExtraForm extra={editing} onClose={() => setEditing(null)} onSave={save} />}
    </View>
  );
}

const ExtraForm: React.FC<{ extra: Extra; onClose: () => void; onSave: (e: Extra) => void }> = ({ extra, onClose, onSave }) => {
  const [name, setName] = useState(extra.name);
  const [price, setPrice] = useState(String(extra.price));
  const [active, setActive] = useState(extra.active);
  return (
    <Sheet
      visible
      title={extra.name ? "Editar Extra" : "Nuevo Extra"}
      onClose={onClose}
      width={460}
      testID="extra-form"
      footer={
        <>
          <Button label="Cancelar" variant="secondary" onPress={onClose} />
          <Button
            label="Guardar"
            onPress={() => onSave({ ...extra, name, price: Number(price) || 0, active })}
            disabled={!name.trim()}
            testID="extra-save"
          />
        </>
      }
    >
      <View style={{ gap: SPACING.sm }}>
        <Input label="Nombre" value={name} onChangeText={setName} testID="ef-name" />
        <Input label="Precio" value={price} onChangeText={setPrice} keyboardType="decimal-pad" testID="ef-price" />
        <Pressable onPress={() => setActive((v) => !v)} style={st.toggle} testID="ef-active">
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
