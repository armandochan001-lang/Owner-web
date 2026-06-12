import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Slot, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, SPACING } from "@/src/theme";
import { Sidebar } from "@/src/components/Sidebar";
import { useAuth } from "@/src/auth/context";

const DRAWER_WIDTH = 240;

export default function AppShell() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: open ? 0 : -DRAWER_WIDTH,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: open ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, translateX, overlayOpacity]);

  if (loading || !user) return null;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.topbar} testID="topbar">
        <Pressable
          onPress={() => setOpen(true)}
          hitSlop={12}
          style={styles.menuBtn}
          testID="menu-button"
        >
          <Ionicons name="menu" size={26} color={COLORS.text} />
        </Pressable>
        <View style={styles.brand}>
          <Ionicons name="pizza" size={18} color={COLORS.primary} />
          <Text style={styles.brandText}>PizzeriaPOS</Text>
        </View>
        <View style={styles.user}>
          <Ionicons name="person-circle" size={20} color={COLORS.textMuted} />
          <Text style={styles.userText} numberOfLines={1}>
            {user.username} · {user.role === "admin" ? "Admin" : "Vendedor"}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Slot />
      </View>

      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[
          styles.overlay,
          { opacity: overlayOpacity, pointerEvents: open ? "auto" : "none" },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setOpen(false)}
          testID="drawer-overlay"
        />
      </Animated.View>

      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[
          styles.drawer,
          { transform: [{ translateX }], pointerEvents: open ? "auto" : "none" },
        ]}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  topbar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  brandText: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  user: { flexDirection: "row", alignItems: "center", gap: 6 },
  userText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },
  content: { flex: 1, backgroundColor: COLORS.bg },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 100,
  },
  drawer: {
    position: "absolute",
    top: 0, bottom: 0, left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: COLORS.black,
    zIndex: 101,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
});
