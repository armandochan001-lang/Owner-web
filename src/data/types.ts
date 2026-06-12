export type Role = "admin" | "seller";

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export type PizzaSize = "S" | "M" | "G";

export interface Product {
  id: string;
  name: string;
  priceS: number;
  priceM: number;
  priceG: number;
  active: boolean;
  imageUrl?: string;
}

export interface Extra {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

export interface OrderItem {
  id: string;
  // For halves, productId is null and we use halfA/halfB
  productId?: string;
  productName: string;
  size: PizzaSize;
  basePrice: number;
  extras: { id: string; name: string; price: number }[];
  isHalves?: boolean;
  halfA?: { id: string; name: string; price: number };
  halfB?: { id: string; name: string; price: number };
}

export type OrderStatus = "in_process" | "on_the_way" | "delivered" | "canceled";
export type OrderType = "delivery" | "pickup";

export interface Customer {
  id: string;
  phone: string;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  dailyNumber: number; // restarts each day
  dayKey: string; // YYYY-MM-DD
  items: OrderItem[];
  total: number;
  customer: {
    phone: string;
    name: string;
    address: string;
    isGeneric: boolean;
  };
  comments: string;
  orderType: OrderType;
  status: OrderStatus;
  createdAt: string;
  estimatedDeliveryAt: string;
  createdBy: string; // username
  driverId?: string;
  deliveryAmount?: number;
  canceledAt?: string;
  canceledBy?: string;
}

export type DriverStatus = "available" | "on_delivery" | "off_duty";

export interface Driver {
  id: string;
  code: string; // A, B, C, D, E, R
  name: string;
  phone: string;
  status: DriverStatus;
  active: boolean;
}

export interface AppConfig {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  deliveryEstimateMinutes: number;
  printerName: string;
  printerAddress: string;
}
