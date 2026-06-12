import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Button, Input, ScreenHeader } from "@/src/components/ui";
import { Sheet } from "@/src/components/Sheet";
import { Customers, newId } from "@/src/data/store";
import type { Customer } from "@/src/data/types";

export default function CustomersScreen() {
  const [list, setList] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);

  const reload = useCallback(async () => {
    setList(await Customers.list());
  }, []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.address.toLowerCase().includes(q),
    );
  }, [list, search]);

  async function save(c: Customer) {
    const all = await Customers.list();
    const idx = all.findIndex((x) => x.id === c.id);
    if (idx >= 0) all[idx] = { ...c, updatedAt: new Date().toISOString() };
    else all.push(c);
    await Customers.save(all);
    setEditing(null);
    await reload();
  }

  async function remove(id: string) {
    const all = await Customers.list();
    await Customers.save(all.filter((x) => x.id !== id));
    setEditing(null);
    await reload();
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="Clientes"
        subtitle={`${filtered.length} cliente${filtered.length === 1 ? "" : "s"}`}
        right={
          <Button
            label="Nuevo Cliente"
            icon={<Ionicons name="add" size={16} color={COLORS.white} />}
            onPress={() =>
              setEditing({
                id: newId("c"),
                phone: "",
                name: "",
                address: "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            }
            testID="customers-new"
          />
        }
      />
      <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm }}>
        <Input placeholder="Buscar por nombre, telefono o direccion..." value={search} onChangeText={setSearch} testID="customers-search" />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        numColumns={3}
        key="cust-cols-3"
        columnWrapperStyle={{ gap: SPACING.sm }}
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm }}
        renderItem={({ item }) => (
          <Pressable onPress={() => setEditing(item)} style={st.card} testID={`customer-card-${item.id}`}>
            <View style={st.avatar}><Ionicons name="person" size={20} color={COLORS.white} /></View>
            <View style={{ flex: 1 }}>
              <Text style={st.name} numberOfLines={1}>{item.name}</Text>
              <Text style={st.phone}>{item.phone}</Text>
              <Text style={st.addr} numberOfLines={2}>{item.address || "Sin direccion"}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: SPACING.xxl }}>
            <Text style={{ color: COLORS.textMuted }}>No hay clientes registrados.</Text>
          </View>
        }
      />

      {editing && (
        <CustomerForm
          customer={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </View>
  );
}

const CustomerForm: React.FC<{
  customer: Customer;
  onClose: () => void;
  onSave: (c: Customer) => void;
  onDelete: (id: string) => void;
}> = ({ customer, onClose, onSave, onDelete }) => {
  const [phone, setPhone] = useState(customer.phone);
  const [name, setName] = useState(customer.name);
  const [address, setAddress] = useState(customer.address);
  const exists = !!customer.createdAt && !!customer.phone;

  return (
    <Sheet
      visible
      title={exists ? "Editar Cliente" : "Nuevo Cliente"}
      onClose={onClose}
      width={520}
      testID="customer-form"
      footer={
        <>
          {exists && (
            <Button label="Eliminar" variant="danger" onPress={() => onDelete(customer.id)} testID="customer-delete" />
          )}
          <Button label="Cancelar" variant="secondary" onPress={onClose} />
          <Button
            label="Guardar"
            onPress={() => onSave({ ...customer, phone, name, address })}
            disabled={!name.trim() || !phone.trim()}
            testID="customer-save"
          />
        </>
      }
    >
      <View style={{ gap: SPACING.sm }}>
        <Input label="Telefono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="cf-phone" />
        <Input label="Nombre" value={name} onChangeText={setName} testID="cf-name" />
        <Input label="Direccion / Referencias" value={address} onChangeText={setAddress} multiline numberOfLines={3} style={{ minHeight: 72, textAlignVertical: "top" }} testID="cf-address" />
      </View>
    </Sheet>
  );
};

const st = StyleSheet.create({
  card: {
    flex: 1, flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, minHeight: 90,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  phone: { fontSize: 12, color: COLORS.text, marginTop: 2 },
  addr: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
});
