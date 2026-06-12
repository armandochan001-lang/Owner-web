import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Button, Input } from "@/src/components/ui";
import { useAuth } from "@/src/auth/context";

export default function Login() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/sales");
  }, [user, loading, router]);

  async function onLogin() {
    setBusy(true);
    setErr(null);
    const res = await login(username, password);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error || "Error al iniciar sesion");
      return;
    }
    router.replace("/sales");
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.center}
      >
        <View style={styles.card} testID="login-card">
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <Ionicons name="pizza" size={32} color={COLORS.white} />
            </View>
            <Text style={styles.title}>PizzeriaPOS</Text>
            <Text style={styles.subtitle}>Sistema de gestion para tablet</Text>
          </View>

          <View style={{ gap: SPACING.md, marginTop: SPACING.xl }}>
            <Input
              label="Usuario"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="admin"
              testID="login-username"
            />
            <Input
              label="Contrasena"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="********"
              testID="login-password"
            />
            {err ? (
              <Text style={styles.error} testID="login-error">{err}</Text>
            ) : null}
            <Button
              label={busy ? "Iniciando..." : "Iniciar Sesion"}
              onPress={onLogin}
              disabled={busy || !username || !password}
              full
              testID="login-submit"
              style={{ height: 48 }}
            />
          </View>

          <Text style={styles.hint}>
            Cuentas demo:  admin / admin123    -    vendedor / vendedor123
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  card: {
    width: 420,
    maxWidth: "100%",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
  },
  brand: { alignItems: "center", gap: 6 },
  logoBox: {
    width: 64, height: 64, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted },
  error: {
    backgroundColor: COLORS.errorBg, color: COLORS.error,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md, fontSize: 12, fontWeight: "600",
  },
  hint: {
    fontSize: 11, color: COLORS.textMuted, textAlign: "center",
    marginTop: SPACING.xl, lineHeight: 16,
  },
});
