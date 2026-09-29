import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type FieldType = "text" | "number" | "dropdown";

export type FieldDef = {
  id: string;
  labelAr: string;
  labelEn: string;
  type: FieldType;
  unit?: string | undefined;
  options?: string[] | undefined;
};

export type Category = {
  id: string;
  nameAr: string;
  nameEn: string;
  fields: FieldDef[];
};

export type SellerPrice = {
  id: string;
  seller: string;
  price: number;
  status: "in" | "reserved" | "out";
};

export type Product = {
  id: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  manufacturer: string;
  barcode: string;
  values: Record<string, string>;
  sellers: SellerPrice[];
};

export type ProductDraft = Omit<Product, "id">;

const uid = () => Math.random().toString(36).slice(2, 10);

export const SERIAL_MIN = 2;
export const SERIAL_MAX = 64;
const SERIAL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._\-/ ]*[A-Za-z0-9])?$/;

export const normalizeSerial = (value: string) => value.trim().replace(/\s+/g, " ");

export function isValidSerial(value: string): boolean {
  const v = normalizeSerial(value);
  return v.length >= SERIAL_MIN && v.length <= SERIAL_MAX && SERIAL_PATTERN.test(v);
}

export function findSerialConflict(
  products: Product[],
  value: string,
  ignoreId?: string,
): Product | undefined {
  const target = normalizeSerial(value).toLowerCase();
  if (!target) return undefined;
  return products.find(
    (p) => p.id !== ignoreId && normalizeSerial(p.barcode).toLowerCase() === target,
  );
}

const seedCategories: Category[] = [
  {
    id: "cat-wire",
    nameAr: "أسلاك نحاس",
    nameEn: "Copper Wires",
    fields: [
      { id: "f1", labelAr: "المقطع", labelEn: "Cross section", type: "number", unit: "mm²" },
      { id: "f2", labelAr: "الطول", labelEn: "Length", type: "number", unit: "m" },
      {
        id: "f3",
        labelAr: "نوع العزل",
        labelEn: "Insulation",
        type: "dropdown",
        options: ["PVC", "XLPE", "Rubber"],
      },
    ],
  },
  {
    id: "cat-breaker",
    nameAr: "قواطع كهربائية",
    nameEn: "Circuit Breakers",
    fields: [
      { id: "f4", labelAr: "شدة التيار", labelEn: "Rated current", type: "number", unit: "A" },
      { id: "f5", labelAr: "الجهد", labelEn: "Voltage", type: "number", unit: "V" },
      {
        id: "f6",
        labelAr: "عدد الأقطاب",
        labelEn: "Poles",
        type: "dropdown",
        options: ["1P", "2P", "3P", "4P"],
      },
    ],
  },
];

const seedProducts: Product[] = [
  {
    id: "p1",
    nameAr: "سلك نحاس 2.5 مم",
    nameEn: "Copper Wire 2.5mm",
    categoryId: "cat-wire",
    manufacturer: "Elsewedy Electric",
    barcode: "SP481920374651",
    values: { f1: "2.5", f2: "100", f3: "PVC" },
    sellers: [
      { id: "s1", seller: "Cairo Electric Co.", price: 1450, status: "in" },
      { id: "s2", seller: "Delta Supplies", price: 1385, status: "in" },
      { id: "s3", seller: "Nile Wholesale", price: 1520, status: "reserved" },
    ],
  },
  {
    id: "p2",
    nameAr: "قاطع 63 أمبير 3 فاز",
    nameEn: "MCB 63A 3-Phase",
    categoryId: "cat-breaker",
    manufacturer: "Schneider",
    barcode: "SP772104558390",
    values: { f4: "63", f5: "400", f6: "3P" },
    sellers: [
      { id: "s4", seller: "Sigma Direct", price: 2310, status: "in" },
      { id: "s5", seller: "Delta Supplies", price: 2480, status: "out" },
    ],
  },
  {
    id: "p3",
    nameAr: "سلك نحاس 6 مم",
    nameEn: "Copper Wire 6mm",
    categoryId: "cat-wire",
    manufacturer: "Sewedy",
    barcode: "SP903845612077",
    values: { f1: "6", f2: "100", f3: "XLPE" },
    sellers: [{ id: "s6", seller: "Nile Wholesale", price: 3290, status: "in" }],
  },
];

type Ctx = {
  categories: Category[];
  products: Product[];
  addCategory: (nameAr: string, nameEn: string) => string;
  removeCategory: (id: string) => void;
  addField: (categoryId: string, field: Omit<FieldDef, "id">) => void;
  removeField: (categoryId: string, fieldId: string) => void;
  addProduct: (p: Omit<Product, "id">) => Product;
  updateProduct: (id: string, patch: Partial<Omit<Product, "id">>) => Product | undefined;
  deleteProduct: (id: string) => Product | undefined;
};

const StoreContext = createContext<Ctx | null>(null);

const KEY = "sigma-power-erp-v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.products) setProducts(parsed.products);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify({ categories, products }));
  }, [categories, products, hydrated]);

  const value = useMemo<Ctx>(
    () => ({
      categories,
      products,
      addCategory(nameAr, nameEn) {
        const id = "cat-" + uid();
        setCategories((c) => [...c, { id, nameAr, nameEn, fields: [] }]);
        return id;
      },
      removeCategory(id) {
        setCategories((c) => c.filter((x) => x.id !== id));
      },
      addField(categoryId, field) {
        setCategories((c) =>
          c.map((cat) =>
            cat.id === categoryId
              ? { ...cat, fields: [...cat.fields, { ...field, id: "f-" + uid() }] }
              : cat,
          ),
        );
      },
      removeField(categoryId, fieldId) {
        setCategories((c) =>
          c.map((cat) =>
            cat.id === categoryId
              ? { ...cat, fields: cat.fields.filter((f) => f.id !== fieldId) }
              : cat,
          ),
        );
      },
      addProduct(p) {
        const created: Product = { ...p, id: "p-" + uid() };
        setProducts((list) => [created, ...list]);
        return created;
      },
      updateProduct(id, patch) {
        const current = products.find((p) => p.id === id);
        if (!current) return undefined;
        const updated: Product = { ...current, ...patch, id };
        setProducts((list) => list.map((p) => (p.id === id ? updated : p)));
        return updated;
      },
      deleteProduct(id) {
        const removed = products.find((p) => p.id === id);
        if (!removed) return undefined;
        setProducts((list) => list.filter((p) => p.id !== id));
        return removed;
      },
    }),
    [categories, products],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
