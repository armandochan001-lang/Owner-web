// Seed data — loaded once on first launch.
import type { Product, Extra, User, Driver, AppConfig } from "./types";

export const SEED_USERS: User[] = [
  {
    id: "u_admin",
    username: "admin",
    password: "admin123",
    role: "admin",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "u_seller",
    username: "vendedor",
    password: "vendedor123",
    role: "seller",
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const SEED_PRODUCTS: Product[] = [
  { id: "p1", name: "Hawaiana", priceS: 95, priceM: 145, priceG: 185, active: true },
  { id: "p2", name: "Pepperoni", priceS: 80, priceM: 120, priceG: 150, active: true },
  { id: "p3", name: "Champinon", priceS: 80, priceM: 120, priceG: 150, active: true },
  { id: "p4", name: "Mexicana", priceS: 100, priceM: 150, priceG: 195, active: true },
  { id: "p5", name: "Pastor", priceS: 100, priceM: 155, priceG: 200, active: true },
  { id: "p6", name: "Hawaiana Especial", priceS: 110, priceM: 165, priceG: 210, active: true },
  { id: "p7", name: "California", priceS: 110, priceM: 170, priceG: 220, active: true },
  { id: "p8", name: "Sencilla de Queso", priceS: 70, priceM: 100, priceG: 130, active: true },
];

export const SEED_EXTRAS: Extra[] = [
  { id: "e1", name: "Orilla", price: 25, active: true },
  { id: "e2", name: "Dedos", price: 30, active: true },
  { id: "e3", name: "Pepperoni", price: 20, active: true },
  { id: "e4", name: "Jamon", price: 20, active: true },
  { id: "e5", name: "Morron", price: 15, active: true },
  { id: "e6", name: "Pina", price: 15, active: true },
  { id: "e7", name: "Cebolla", price: 10, active: true },
  { id: "e8", name: "Carne Asada", price: 35, active: true },
];

export const SEED_DRIVERS: Driver[] = [
  { id: "d_A", code: "A", name: "Repartidor A", phone: "", status: "available", active: true },
  { id: "d_B", code: "B", name: "Repartidor B", phone: "", status: "available", active: true },
  { id: "d_C", code: "C", name: "Repartidor C", phone: "", status: "available", active: true },
  { id: "d_D", code: "D", name: "Repartidor D", phone: "", status: "available", active: true },
  { id: "d_E", code: "E", name: "Repartidor E", phone: "", status: "available", active: true },
  { id: "d_R", code: "R", name: "Repartidor R", phone: "", status: "available", active: true },
];

export const SEED_CONFIG: AppConfig = {
  businessName: "Pizzeria Mi Sabor",
  businessPhone: "999-123-4567",
  businessAddress: "Av. Principal #123, Centro",
  deliveryEstimateMinutes: 50,
  printerName: "",
  printerAddress: "",
};
