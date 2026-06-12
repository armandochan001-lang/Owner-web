import React from "react";
import { Modal, Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  testID?: string;
  footer?: React.ReactNode;
}

export const Sheet: React.FC<Props> = ({ visible, title, onClose, children, width = 640, testID, footer }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay} testID={testID}>
        <View style={[styles.container, { width }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} testID={`${testID}-close`}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: SPACING.md }}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: "92%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  body: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.md,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
    backgroundColor: COLORS.bg,
  },
});
