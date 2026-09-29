import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  appName: { ar: "سيجما باور", en: "Sigma Power" },
  appSub: { ar: "نظام إدارة المخزون", en: "Inventory ERP" },
  navSearch: { ar: "البحث والأسعار", en: "Search & Prices" },
  navTemplates: { ar: "أنواع المنتجات", en: "Product Types" },
  navAdd: { ar: "إضافة منتج", en: "Add Product" },
  online: { ar: "متصل", en: "Online" },

  searchTitle: { ar: "البحث عن المنتجات وأسعار الموردين", en: "Product Search & Seller Prices" },
  searchPlaceholder: {
    ar: "ابحث بالاسم أو الرقم التسلسلي / الباركود…",
    en: "Search by product name or serial code / barcode…",
  },
  scan: { ar: "مسح باركود", en: "Scan barcode" },
  results: { ar: "النتائج", en: "Results" },
  noResults: { ar: "لا توجد نتائج مطابقة", en: "No matching products" },
  selectProduct: { ar: "اختر منتجًا لعرض التفاصيل", en: "Select a product to view details" },
  specs: { ar: "المواصفات الفنية", en: "Technical specs" },
  manufacturer: { ar: "الشركة المصنعة", en: "Manufacturer" },
  category: { ar: "النوع", en: "Category" },
  barcode: { ar: "الباركود", en: "Barcode" },
  serialCode: { ar: "الرقم التسلسلي / الباركود", en: "Serial Code / Barcode" },
  serialPlaceholder: { ar: "SKU-102938 أو 62910023841", en: "SKU-102938 or 62910023841" },
  serialHint: {
    ar: "أدخل الرقم التسلسلي المطبوع على المنتج — يُستخدم للبحث وطباعة الباركود.",
    en: "Enter the serial code printed on the product — used for search and barcode printing.",
  },
  serialRequired: { ar: "الرقم التسلسلي مطلوب", en: "Serial code is required" },
  serialInvalid: {
    ar: "استخدم حروفًا وأرقامًا إنجليزية فقط (من 2 إلى 64 خانة)",
    en: "Use Latin letters and digits only (2 to 64 characters)",
  },
  serialDuplicate: {
    ar: "هذا الرقم التسلسلي مستخدم بالفعل في منتج آخر",
    en: "This serial code is already used by another product",
  },
  serialConflictWith: { ar: "مستخدم في: {name}", en: "Already used by: {name}" },
  serialPreviewHint: {
    ar: "سيظهر الباركود هنا بمجرد إدخال رقم تسلسلي صالح",
    en: "The barcode preview appears here once a valid serial code is entered",
  },
  sellerMatrix: { ar: "مقارنة أسعار الموردين", en: "Seller Price Comparison" },
  seller: { ar: "المورد", en: "Seller" },
  status: { ar: "الحالة", en: "Status" },
  price: { ar: "السعر", en: "Price" },
  inStock: { ar: "متوفر", en: "In stock" },
  reserved: { ar: "محجوز", en: "Reserved" },
  outOfStock: { ar: "غير متوفر", en: "Out of stock" },
  best: { ar: "أفضل سعر", en: "Best price" },
  print: { ar: "طباعة", en: "Print" },

  templatesTitle: { ar: "منشئ أنواع المنتجات والحقول", en: "Product Type & Field Configurator" },
  newCategory: { ar: "نوع منتج جديد", en: "New product type" },
  nameAr: { ar: "الاسم بالعربية", en: "Arabic name" },
  nameEn: { ar: "الاسم بالإنجليزية", en: "English name" },
  create: { ar: "إنشاء", en: "Create" },
  categories: { ar: "الأنواع", en: "Types" },
  fields: { ar: "الحقول المخصصة", en: "Custom fields" },
  fieldLabel: { ar: "اسم الحقل", en: "Field label" },
  fieldType: { ar: "النوع", en: "Type" },
  unit: { ar: "الوحدة", en: "Unit" },
  options: { ar: "الخيارات (مفصولة بفاصلة)", en: "Options (comma separated)" },
  addField: { ar: "إضافة حقل", en: "Add field" },
  text: { ar: "نص", en: "Text" },
  number: { ar: "رقم", en: "Number" },
  dropdown: { ar: "قائمة منسدلة", en: "Dropdown" },
  remove: { ar: "حذف", en: "Remove" },
  noFields: { ar: "لا توجد حقول بعد", en: "No fields yet" },
  selectCategory: { ar: "اختر نوع منتج", en: "Select a product type" },

  addTitle: { ar: "إضافة منتج جديد", en: "Add New Product" },
  step: { ar: "خطوة", en: "Step" },
  step1: { ar: "اختيار النوع", en: "Select type" },
  step2: { ar: "البيانات والمواصفات", en: "Details & specs" },
  step3: { ar: "الموردون والأسعار", en: "Sellers & prices" },
  productName: { ar: "اسم المنتج", en: "Product name" },
  addSeller: { ar: "إضافة مورد", en: "Add seller" },
  save: { ar: "حفظ المنتج", en: "Save product" },
  saved: { ar: "تم حفظ المنتج", en: "Product saved" },
  generated: { ar: "باركود للطباعة", en: "Printable barcode" },
  addAnother: { ar: "إضافة منتج آخر", en: "Add another" },
  viewInSearch: { ar: "عرض في البحث", en: "View in search" },
  back: { ar: "السابق", en: "Back" },
  next: { ar: "التالي", en: "Next" },
  required: { ar: "مطلوب", en: "required" },

  actions: { ar: "إجراءات", en: "Actions" },
  edit: { ar: "تعديل", en: "Edit" },
  delete: { ar: "حذف", en: "Delete" },
  close: { ar: "إغلاق", en: "Close" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  editTitle: { ar: "تعديل المنتج", en: "Edit product" },
  baseDetails: { ar: "البيانات الأساسية", en: "Base details" },
  saveChanges: { ar: "حفظ التعديلات", en: "Save changes" },
  deleteTitle: { ar: "تأكيد حذف المنتج", en: "Delete product?" },
  deleteConfirm: {
    ar: "هل أنت متأكد من حذف {name}؟",
    en: "Are you sure you want to delete {name}?",
  },
  deleteWarning: {
    ar: "سيتم حذف المنتج وأسعار الموردين المرتبطة به نهائيًا، ولا يمكن التراجع عن هذه الخطوة.",
    en: "The product and all of its seller prices will be permanently removed. This cannot be undone.",
  },
  confirmDelete: { ar: "نعم، احذف", en: "Yes, delete" },
  updated: { ar: "تم تحديث {name}", en: "{name} updated" },
  deleted: { ar: "تم حذف {name}", en: "{name} deleted" },
} as const;

export type Key = keyof typeof dict;

export type Vars = Record<string, string>;

const fill = (template: string, vars?: Vars) =>
  vars ? template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match) : template;

type Ctx = {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: (k: Key, vars?: Vars) => string;
  setLang: (l: Lang) => void;
};

const I18nContext = createContext<Ctx>({
  lang: "ar",
  dir: "rtl",
  t: (k) => dict[k].ar,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return (
    <I18nContext.Provider value={{ lang, dir, t: (k, vars) => fill(dict[k][lang], vars), setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
