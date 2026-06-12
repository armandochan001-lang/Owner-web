import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { Sheet } from "./Sheet";
import { Button, Input } from "./ui";
import { Ionicons } from "@expo/vector-icons";
import { Customers } from "@/src/data/store";
import type { OrderType } from "@/src/data/types";

export interface CustomerForm {
  phone: string;
  name: string;
  address: string;
  comments: string;
  orderType: OrderType;
  isGeneric: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (form: CustomerForm) => void;
}

export const CustomerModal: React.FC<Props> = ({ visible, onClose, onConfirm }) => {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [comments, setComments] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [isGeneric, setIsGeneric] = useState(false);
  const [searched, setSearched] = useState<"none" | "found" | "new">("none");

  useEffect(() => {
    if (visible) {
      setPhone(""); setName(""); setAddress(""); setComments("");
      setOrderType("delivery"); setIsGeneric(false); setSearched("none");
    }
  }, [visible]);

  async function search() {
    if (!phone.trim()) return;
    const c = await Customers.findByPhone(phone.trim());
    if (c) {
      setName(c.name); setAddress(c.address); setSearched("found");
    } else {
      setSearched("new");
    }
  }

  function confirm() {
    if (!isGeneric && (!name.trim() || !phone.trim())) return;
    if (isGeneric && !name.trim()) return;
    onConfirm({ phone: isGeneric ? "" : phone, name, address, comments, orderType, isGeneric });
  }

  return (
    <Sheet
      visible={visible}
      title="Informacion del Cliente"
      onClose={onClose}
      width={680}
      testID="customer-modal"
      footer={
        <>
          <Button label="Cancelar" variant="secondary" onPress={onClose} testID="customer-cancel" />
          <Button label="Finalizar Pedido" onPress={confirm} testID="customer-confirm" />
        </>
      }
    >
      <Pressable
        onPress={() => { setIsGeneric((v) => !v); setSearched("none"); }}
        style={[st.check, isGeneric && st.checkSel]}
        testID="customer-generic"
      >
        <Ionicons
          name={isGeneric ? "checkbox" : "square-outline"}
          size={20}
          color={isGeneric ? COLORS.primary : COLORS.textMuted}
        />
        <Text style={st.checkText}>Cliente Generico (no se guarda)</Text>
      </Pressable>

      {!isGeneric && (
        <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Telefono"
              value={phone}
              onChangeText={(v) => { setPhone(v); setSearched("none"); }}
              keyboardType="phone-pad"
              testID="customer-phone"
            />
          </View>
          <Button label="Buscar" variant="secondary" onPress={search} testID="customer-search" />
        </View>
      )}

      {searched === "found" && (
        <View style={[st.banner, { backgroundColor: COLORS.successBg }]}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={[st.bannerText, { color: COLORS.success }]}>Cliente encontrado. Datos cargados.</Text>
        </View>
      )}
      {searched === "new" && (
        <View style={[st.banner, { backgroundColor: COLORS.warningBg }]}>
          <Ionicons name="information-circle" size={16} color={COLORS.warning} />
          <Text style={[st.bannerText, { color: COLORS.warning }]}>
            Cliente nuevo. Completa la informacion para registrarlo.
          </Text>
        </View>
      )}

      <View style={{ marginTop: SPACING.md, gap: SPACING.sm }}>
        <Input label="Nombre" value={name} onChangeText={setName} testID="customer-name" />
        <Input
          label="Direccion / Referencias"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={2}
          style={{ minHeight: 56, textAlignVertical: "top" }}
          testID="customer-address"
        />
        <Input
          label="Comentarios del pedido (solo en este ticket)"
          value={comments}
          onChangeText={setComments}
          multiline
          numberOfLines={2}
          style={{ minHeight: 56, textAlignVertical: "top" }}
          testID="customer-comments"
        />
      </View>

      <Text style={[st.label, { marginTop: SPACING.md }]}>Tipo de Pedido</Text>
      <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.xs }}>
        {(["delivery", "pickup"] as OrderType[]).map((k) => {
          const sel = orderType === k;
          return (
            <Pressable
              key={k}
              onPress={() => setOrderType(k)}
              style={[st.typePill, sel && st.typePillSel]}
              testID={`customer-type-${k}`}
            >
              <Ionicons
                name={k === "delivery" ? "bicycle" : "bag-handle"}
                size={16}
                color={sel ? COLORS.white : COLORS.text}
              />
              <Text style={[st.typeText, sel && { color: COLORS.white }]}>
                {k === "delivery" ? "Domicilio" : "Recoger"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
};

const st = StyleSheet.create({
  check: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    paddingVertical: 10, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  checkSel: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  checkText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  banner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    padding: SPACING.sm, borderRadius: RADIUS.md, marginTop: SPACING.sm,
  },
  bannerText: { fontSize: 12, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  typePill: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  typePillSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeText: { fontSize: 13, fontWeight: "700", color: COLORS.text },
});
