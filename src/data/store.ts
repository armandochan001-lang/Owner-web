// Local data store. Everything is persisted in AsyncStorage via @/src/utils/storage.
// All reads/writes are async but cheap. No backend.

import { storage } from "@/src/utils/storage";
import type {
  AppConfig,
  Customer,
  Driver,
  Extra,
  Order,
  Product,
  User,
} from "./types";
import {
  SEED_CONFIG,
  SEED_DRIVERS,
  SEED_EXTRAS,
  SEED_PRODUCTS,
  SEED_USERS,
} from "./seed";

const KEYS = {
  INIT: "pos.initialized.v1",
  USERS: "pos.users.v1",
  PRODUCTS: "pos.products.v1",
  EXTRAS: "pos.extras.v1",
  CUSTOMERS: "pos.customers.v1",
  ORDERS: "pos.orders.v1",
  DRIVERS: "pos.drivers.v1",
  CONFIG: "pos.config.v1",
  CURRENT_USER: "pos.session.v1",
  DAILY_COUNTER: "pos.dailyCounter.v1",
  DRIVER_DAY: "pos.driverDay.v1",
};

async function readArr<T>(key: string): Promise<T[]> {
  const raw = await storage.getItem(key, "[]");
  try {
    return JSON.parse(raw ?? "[]");
  } catch {
    return [];
  }
}
async function writeArr<T>(key: string, value: T[]): Promise<void> {
  await storage.setItem(key, JSON.stringify(value));
}
async function readObj<T>(key: string, fallback: T): Promise<T> {
  const raw = await storage.getItem(key, "null");
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
async function writeObj<T>(key: string, value: T): Promise<void> {
  await storage.setItem(key, JSON.stringify(value));
}

export async function ensureSeed(): Promise<void> {
  const init = await storage.getItem(KEYS.INIT, "no");
  if (init === "yes") return;
  await writeArr(KEYS.USERS, SEED_USERS);
  await writeArr(KEYS.PRODUCTS, SEED_PRODUCTS);
  await writeArr(KEYS.EXTRAS, SEED_EXTRAS);
  await writeArr(KEYS.CUSTOMERS, []);
  await writeArr(KEYS.ORDERS, []);
  await writeArr(KEYS.DRIVERS, SEED_DRIVERS);
  await writeObj(KEYS.CONFIG, SEED_CONFIG);
  await storage.setItem(KEYS.INIT, "yes");
}

// Users
export const Users = {
  list: () => readArr<User>(KEYS.USERS),
  save: (list: User[]) => writeArr(KEYS.USERS, list),
};

// Products
export const Products = {
  list: () => readArr<Product>(KEYS.PRODUCTS),
  save: (list: Product[]) => writeArr(KEYS.PRODUCTS, list),
};

// Extras
export const Extras = {
  list: () => readArr<Extra>(KEYS.EXTRAS),
  save: (list: Extra[]) => writeArr(KEYS.EXTRAS, list),
};

// Customers
export const Customers = {
  list: () => readArr<Customer>(KEYS.CUSTOMERS),
  save: (list: Customer[]) => writeArr(KEYS.CUSTOMERS, list),
  upsert: async (c: Customer) => {
    const all = await readArr<Customer>(KEYS.CUSTOMERS);
    const idx = all.findIndex((x) => x.phone === c.phone);
    if (idx >= 0) all[idx] = { ...all[idx], ...c, updatedAt: new Date().toISOString() };
    else all.push({ ...c, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await writeArr(KEYS.CUSTOMERS, all);
  },
  findByPhone: async (phone: string) => {
    const all = await readArr<Customer>(KEYS.CUSTOMERS);
    return all.find((x) => x.phone === phone) || null;
  },
};

// Orders
export const Orders = {
  list: () => readArr<Order>(KEYS.ORDERS),
  save: (list: Order[]) => writeArr(KEYS.ORDERS, list),
  add: async (o: Order) => {
    const all = await readArr<Order>(KEYS.ORDERS);
    all.push(o);
    await writeArr(KEYS.ORDERS, all);
  },
  update: async (id: string, patch: Partial<Order>) => {
    const all = await readArr<Order>(KEYS.ORDERS);
    const idx = all.findIndex((x) => x.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...patch };
      await writeArr(KEYS.ORDERS, all);
    }
  },
  nextDailyNumber: async (dayKey: string): Promise<number> => {
    const data = await readObj<{ dayKey: string; counter: number }>(KEYS.DAILY_COUNTER, {
      dayKey: "",
      counter: 0,
    });
    let next: number;
    if (data.dayKey !== dayKey) {
      next = 1;
    } else {
      next = data.counter + 1;
    }
    await writeObj(KEYS.DAILY_COUNTER, { dayKey, counter: next });
    return next;
  },
};

// Drivers
export const Drivers = {
  list: () => readArr<Driver>(KEYS.DRIVERS),
  save: (list: Driver[]) => writeArr(KEYS.DRIVERS, list),
};

// Driver-day (Delivery Drivers module - tickets 1-110)
export interface DriverTicket {
  ticket: number; // 1..110
  driverId?: string;
  amount?: number;
  orderId?: string; // optional link to an order
  delivered?: boolean;
  createdAt: string;
}
export interface DriverDayState {
  startedAt: string;
  tickets: DriverTicket[];
}
export const DriverDay = {
  get: async (): Promise<DriverDayState> => {
    const fallback: DriverDayState = {
      startedAt: new Date().toISOString(),
      tickets: Array.from({ length: 110 }, (_, i) => ({
        ticket: i + 1,
        createdAt: new Date().toISOString(),
      })),
    };
    return readObj<DriverDayState>(KEYS.DRIVER_DAY, fallback);
  },
  save: (state: DriverDayState) => writeObj(KEYS.DRIVER_DAY, state),
  newDay: async () => {
    const fresh: DriverDayState = {
      startedAt: new Date().toISOString(),
      tickets: Array.from({ length: 110 }, (_, i) => ({
        ticket: i + 1,
        createdAt: new Date().toISOString(),
      })),
    };
    await writeObj(KEYS.DRIVER_DAY, fresh);
    return fresh;
  },
};

// Config
export const Config = {
  get: () => readObj<AppConfig>(KEYS.CONFIG, SEED_CONFIG),
  save: (c: AppConfig) => writeObj(KEYS.CONFIG, c),
};

// Session
export const Session = {
  get: async (): Promise<User | null> => {
    const raw = await storage.getItem(KEYS.CURRENT_USER, "null");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set: async (u: User | null) => {
    await storage.setItem(KEYS.CURRENT_USER, JSON.stringify(u));
  },
};

// Utility id
export function newId(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
