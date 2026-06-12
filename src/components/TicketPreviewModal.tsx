import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

interface Props {
  visible: boolean;
  text: string;
  note?: string;
  onClose: () => void;
  onReprint?: () => void;
}

export const TicketPreviewModal: React.FC<Props> = ({ visible, text, note, onClose, onReprint }) => (
  <Sheet
    visible={visible}
    title="Vista Previa del Ticket"
    onClose={onClose}
    width={420}
    testID="ticket-preview"
    footer={
      <>
        {onReprint && <Button label="Reimprimir" variant="secondary" onPress={onReprint} testID="ticket-reprint" />}
        <Button label="Cerrar" onPress={onClose} testID="ticket-close" />
      </>
    }
  >
    {note ? (
      <View style={st.noteBox}>
        <Text style={st.noteText}>{note}</Text>
      </View>
    ) : null}
    <View style={st.paper}>
      <Text style={st.mono} testID="ticket-text">{text}</Text>
    </View>
  </Sheet>
);

const st = StyleSheet.create({
  paper: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  mono: {
    fontFamily: "Courier",
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 16,
  },
  noteBox: {
    backgroundColor: COLORS.warningBg,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  noteText: { fontSize: 11, color: COLORS.warning, fontWeight: "600" },
});
