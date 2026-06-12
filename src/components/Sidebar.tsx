import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { useAuth } from "@/src/auth/context";

type Item = {
  key: string;
  path: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  adminOnly?: boolean;
};

const ITEMS: Item[] = [
  { key: "dashboard", path: "/dashboard", label: "Dashboard", icon: "stats-chart" },
  { key: "sales", path: "/sales", label: "Ventas", icon: "cart" },
  { key: "orders", path: "/orders", label: "Pedidos", icon: "receipt" },
  { key: "canceled", path: "/canceled", label: "Pedidos Cancelados", icon: "close-circle" },
  { key: "customers", path: "/customers", label: "Clientes", icon: "people" },
  { key: "products", path: "/products", label: "Productos", icon: "pizza", adminOnly: true },
  { key: "extras", path: "/extras", label: "Ingredientes Extra", icon: "leaf", adminOnly: true },
  { key: "users", path: "/users", label: "Usuarios", icon: "person-circle", adminOnly: true },
  { key: "configuration", path: "/configuration", label: "Configuracion", icon: "settings", adminOnly: true },
  { key: "drivers", path: "/drivers", label: "Repartidores", icon: "bicycle" },
];

export const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const visible = ITEMS.filter((i) => !i.adminOnly || user?.role === "admin");

  // Close the drawer FIRST, then defer the navigation to the next frame so the
  // close animation starts cleanly and any focus/effect work on the destination
  // screen (e.g. Dashboard's data load) cannot interrupt the drawer state update.
  function go(path: string) {
    onNavigate?.();
    requestAnimationFrame(() => router.replace(path as any));
  }

  async function doLogout() {
    onNavigate?.();
    await logout();
    requestAnimationFrame(() => router.replace("/"));
  }

  return (
    <View
      style={[styles.sidebar, { paddingBottom: Math.max(insets.bottom, 0) + SPACING.md }]}
      testID="sidebar"
    >
      <View style={styles.brand}>
        <Ionicons name="pizza" size={28} color={COLORS.white} />
        <View style={{ flex: 1 }}>
          <Text style={styles.brandTitle} numberOfLines={1}>PizzeriaPOS</Text>
          <Text style={styles.brandSub} numberOfLines={1}>
            {user?.username} - {user?.role === "admin" ? "Admin" : "Vendedor"}
          </Text>
        </View>
      </View>
      <View style={styles.items}>
        {visible.map((it) => {
          const active = pathname?.startsWith(it.path);
          return (
            <Pressable
              key={it.key}
              onPress={() => go(it.path)}
              style={[styles.item, active && styles.itemActive]}
              testID={`nav-${it.key}`}
              android_ripple={{ color: "rgba(255,255,255,0.08)" }}
            >
              <Ionicons name={it.icon} size={18} color={COLORS.white} />
              <Text style={styles.itemText} numberOfLines={1}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.logoutWrap}>
        <Pressable
          onPress={doLogout}
          style={[styles.item, styles.logout]}
          testID="nav-logout"
          android_ripple={{ color: "rgba(255,255,255,0.08)" }}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.white} />
          <Text style={styles.itemText}>Cerrar Sesion</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.black,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    marginBottom: SPACING.md,
  },
  brandTitle: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  brandSub: { color: "#A1A1AA", fontSize: 11, marginTop: 2 },
  items: { gap: 2 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    minHeight: 40,
  },
  itemActive: { backgroundColor: COLORS.primary },
  itemText: { color: COLORS.white, fontSize: 13, fontWeight: "500", flex: 1 },
  logoutWrap: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#222",
    paddingTop: SPACING.sm,
  },
  logout: { backgroundColor: "#1a1a1a" },
});
