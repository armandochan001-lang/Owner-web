import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Badge, Button, Input, ScreenHeader } from "@/src/components/ui";
import { Sheet } from "@/src/components/Sheet";
import { Users, newId } from "@/src/data/store";
import type { Role, User } from "@/src/data/types";
import { useAuth } from "@/src/auth/context";

export default function UsersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<User[]>([]);
  const [editing, setEditing] = useState<User | null>(null);

  const reload = useCallback(async () => setList(await Users.list()), []);
  useFocusEffect(useCallback(() => {
    if (user && user.role !== "admin") router.replace("/sales");
    else reload();
  }, [reload, user, router]));

  async function save(u: User) {
    const all = await Users.list();
    const idx = all.findIndex((x) => x.id === u.id);
    if (idx >= 0) all[idx] = u; else all.push(u);
    await Users.save(all);
    setEditing(null);
    reload();
  }

  async function remove(id: string) {
    if (list.length <= 1) return;
    const all = await Users.list();
    await Users.save(all.filter((x) => x.id !== id));
    setEditing(null);
    reload();
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        title="Usuarios"
        subtitle={`${list.length} usuario${list.length === 1 ? "" : "s"}`}
        right={
          <Button
            label="Nuevo Usuario"
            icon={<Ionicons name="add" size={16} color={COLORS.white} />}
            onPress={() =>
              setEditing({
                id: newId("u"),
                username: "",
                password: "",
                role: "seller",
                active: true,
                createdAt: new Date().toISOString(),
              })
            }
            testID="users-new"
          />
        }
      />
      <View style={st.tableHeader}>
        <Text style={[st.th, { flex: 2 }]}>Usuario</Text>
        <Text style={[st.th, { width: 120 }]}>Rol</Text>
        <Text style={[st.th, { width: 100 }]}>Estado</Text>
        <Text style={[st.th, { width: 80, textAlign: "right" }]}>Acciones</Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <View style={st.row}>
            <Text style={[st.td, { flex: 2, fontWeight: "700" }]}>{item.username}</Text>
            <View style={{ width: 120 }}>
              <Badge
                label={item.role === "admin" ? "Administrador" : "Vendedor"}
                bg={item.role === "admin" ? COLORS.primaryLight : COLORS.bg}
                color={item.role === "admin" ? COLORS.primary : COLORS.text}
              />
            </View>
            <View style={{ width: 100 }}>
              <Badge
                label={item.active ? "Activo" : "Inactivo"}
                bg={item.active ? COLORS.successBg : COLORS.bg}
                color={item.active ? COLORS.success : COLORS.textMuted}
              />
            </View>
            <Pressable onPress={() => setEditing(item)} style={{ width: 80, alignItems: "flex-end" }} testID={`user-edit-${item.id}`}>
              <Ionicons name="create" size={18} color={COLORS.text} />
            </Pressable>
          </View>
        )}
      />
      {editing && <UserForm u={editing} onClose={() => setEditing(null)} onSave={save} onDelete={remove} canDelete={list.length > 1 && list.some((x) => x.id === editing.id)} />}
    </View>
  );
}

const UserForm: React.FC<{ u: User; onClose: () => void; onSave: (u: User) => void; onDelete: (id: string) => void; canDelete: boolean }> = ({ u, onClose, onSave, onDelete, canDelete }) => {
  const [username, setUsername] = useState(u.username);
  const [password, setPassword] = useState(u.password);
  const [role, setRole] = useState<Role>(u.role);
  const [active, setActive] = useState(u.active);
  return (
    <Sheet
      visible
      title={u.username ? "Editar Usuario" : "Nuevo Usuario"}
      onClose={onClose}
      width={480}
      testID="user-form"
      footer={
        <>
          {canDelete && <Button label="Eliminar" variant="danger" onPress={() => onDelete(u.id)} testID="user-delete" />}
          <Button label="Cancelar" variant="secondary" onPress={onClose} />
          <Button
            label="Guardar"
            onPress={() => onSave({ ...u, username, password, role, active })}
            disabled={!username.trim() || !password}
            testID="user-save"
          />
        </>
      }
    >
      <View style={{ gap: SPACING.sm }}>
        <Input label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" testID="uf-username" />
        <Input label="Contrasena" value={password} onChangeText={setPassword} testID="uf-password" />
        <Text style={{ fontSize: 12, fontWeight: "600", color: COLORS.textMuted }}>Rol</Text>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          {(["admin", "seller"] as Role[]).map((r) => {
            const sel = role === r;
            return (
              <Pressable key={r} onPress={() => setRole(r)} style={[st.pill, sel && st.pillSel]} testID={`uf-role-${r}`}>
                <Text style={[st.pillText, sel && { color: COLORS.white }]}>
                  {r === "admin" ? "Administrador" : "Vendedor"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => setActive((v) => !v)} style={st.toggle} testID="uf-active">
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
  pill: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", backgroundColor: COLORS.white },
  pillSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  toggle: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingVertical: 6 },
});
