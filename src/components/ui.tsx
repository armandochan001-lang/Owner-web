import React from "react";
import { Pressable, StyleSheet, Text, View, TextInput, TextInputProps } from "react-native";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

interface BtnProps {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  testID?: string;
  icon?: React.ReactNode;
  size?: "md" | "sm";
  full?: boolean;
  style?: any;
  labelStyle?: any;
}

export const Button: React.FC<BtnProps> = ({ label, onPress, variant = "primary", disabled, testID, icon, size = "md", full, style, labelStyle }) => {
  const bg =
    variant === "primary" ? COLORS.primary :
    variant === "danger" ? COLORS.error :
    variant === "ghost" ? "transparent" : COLORS.white;
  const fg = variant === "secondary" || variant === "ghost" ? COLORS.text : COLORS.white;
  const borderColor = variant === "secondary" ? COLORS.border : "transparent";
  const height = size === "sm" ? 36 : 44;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: SPACING.md,
          backgroundColor: bg,
          borderRadius: RADIUS.md,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          alignSelf: full ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      {icon}
      <Text style={[{ color: fg, fontWeight: "600", fontSize: size === "sm" ? 12 : 14 }, labelStyle]}>{label}</Text>
    </Pressable>
  );
};

interface InputProps extends TextInputProps {
  label?: string;
  testID?: string;
}
export const Input: React.FC<InputProps> = ({ label, style, testID, ...rest }) => {
  return (
    <View style={{ gap: 4 }}>
      {label ? <Text style={{ fontSize: 12, fontWeight: "600", color: COLORS.textMuted }}>{label}</Text> : null}
      <TextInput
        {...rest}
        testID={testID}
        placeholderTextColor="#A1A1AA"
        style={[
          {
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: RADIUS.md,
            paddingHorizontal: SPACING.md,
            paddingVertical: 10,
            fontSize: 14,
            color: COLORS.text,
            minHeight: 40,
          },
          style,
        ]}
      />
    </View>
  );
};

export const Badge: React.FC<{ label: string; color?: string; bg?: string; testID?: string }> = ({ label, color = COLORS.text, bg = COLORS.bg, testID }) => (
  <View
    testID={testID}
    style={{
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: bg,
      borderRadius: 4,
      alignSelf: "flex-start",
    }}
  >
    <Text style={{ fontSize: 11, fontWeight: "700", color, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
  </View>
);

export const ScreenHeader: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
  <View style={hdr.row}>
    <View style={{ flex: 1 }}>
      <Text style={hdr.title}>{title}</Text>
      {subtitle ? <Text style={hdr.sub}>{subtitle}</Text> : null}
    </View>
    {right}
  </View>
);
const hdr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  sub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
