import { useState, type ReactNode } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Barcode128, QrCode } from "@/components/Barcode";
import { useI18n } from "@/lib/i18n";
import {
  findSerialConflict,
  isValidSerial,
  normalizeSerial,
  useStore,
  type Category,
  type Product,
  type SellerPrice,
} from "@/lib/erp-store";

export function EditProductSheet({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang, dir } = useI18n();
  const { categories, products, updateProduct } = useStore();

  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [nameAr, setNameAr] = useState(product.nameAr);
  const [nameEn, setNameEn] = useState(product.nameEn);
  const [manufacturer, setManufacturer] = useState(product.manufacturer);
  const [barcode, setBarcode] = useState(product.barcode);
  const [values, setValues] = useState<Record<string, string>>(product.values);
  const [sellers, setSellers] = useState<SellerPrice[]>(product.sellers);

  const category = categories.find((c) => c.id === categoryId) ?? null;

  const serialValue = normalizeSerial(barcode);
  const serialMissing = serialValue.length === 0;
  const serialInvalid = !serialMissing && !isValidSerial(serialValue);
  const conflict =
    serialMissing || serialInvalid
      ? undefined
      : findSerialConflict(products, serialValue, product.id);
  const serialOk = !serialMissing && !serialInvalid && !conflict;
  const invalid = !nameAr.trim() || !nameEn.trim() || !serialOk;

  function changeCategory(nextId: string) {
    const next = categories.find((c) => c.id === nextId) ?? null;
    setCategoryId(nextId);
    if (!next) return;
    const allowed = new Set(next.fields.map((f) => f.id));
    setValues((v) => Object.fromEntries(Object.entries(v).filter(([key]) => allowed.has(key))));
  }

  function save() {
    if (invalid || !category) return;
    if (serialMissing) {
      toast.error(t("serialRequired"));
      return;
    }
    if (serialInvalid) {
      toast.error(t("serialInvalid"));
      return;
    }
    const clash = findSerialConflict(products, serialValue, product.id);
    if (clash) {
      toast.error(t("serialConflictWith", { name: lang === "ar" ? clash.nameAr : clash.nameEn }));
      return;
    }
    const updated = updateProduct(product.id, {
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim(),
      categoryId: category.id,
      manufacturer: manufacturer.trim() || "—",
      barcode: serialValue,
      values,
      sellers: sellers.filter((s) => s.seller.trim()),
    });
    if (!updated) return;
    onOpenChange(false);
    toast.success(t("updated", { name: lang === "ar" ? updated.nameAr : updated.nameEn }));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={dir === "rtl" ? "left" : "right"}
        className="w-full gap-0 overflow-y-auto border-border bg-surface-1 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border p-3 text-start">
          <SheetTitle className="text-[15px]">{t("editTitle")}</SheetTitle>
          <SheetDescription className="tabular text-[12px]">{product.barcode}</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 p-3">
          <div>
            <span className="micro-badge text-muted-foreground">{t("category")}</span>
            <select
              className="field mt-1"
              value={categoryId}
              onChange={(e) => changeCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === "ar" ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={`${t("productName")} (ع) *`}>
              <input
                dir="rtl"
                className="field"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
              />
            </Field>
            <Field label={`${t("productName")} (EN) *`}>
              <input
                dir="ltr"
                className="field"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />
            </Field>
            <Field label={t("manufacturer")}>
              <input
                dir="ltr"
                className="field"
                placeholder="Schneider, ABB…"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              />
            </Field>
            <Field label={`${t("serialCode")} *`}>
              <input
                dir="ltr"
                className="field tabular"
                placeholder={t("serialPlaceholder")}
                value={barcode}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setBarcode(e.target.value)}
              />
              {serialMissing ? null : serialInvalid ? (
                <span className="mt-1 block text-[11px] text-destructive">
                  {t("serialInvalid")}
                </span>
              ) : conflict ? (
                <span className="mt-1 block text-[11px] text-destructive">
                  {t("serialDuplicate")}
                </span>
              ) : null}
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 rounded-sm border border-border bg-surface-2 p-3">
            {serialOk ? (
              <>
                <Barcode128 value={serialValue} height={52} />
                <QrCode value={serialValue} size={96} />
              </>
            ) : (
              <p className="text-[12px] text-muted-foreground">{t("serialPreviewHint")}</p>
            )}
          </div>

          <div className="border-t border-border pt-3">
            <div className="micro-badge mb-2 text-muted-foreground">{t("specs")}</div>
            <SpecFields
              category={category}
              values={values}
              onChange={(fieldId, next) => setValues((v) => ({ ...v, [fieldId]: next }))}
            />
          </div>

          <div className="border-t border-border pt-3">
            <div className="micro-badge mb-2 text-muted-foreground">{t("sellerMatrix")}</div>
            <div className="space-y-1.5">
              {sellers.map((s, i) => (
                <div key={s.id} className="grid grid-cols-[1fr_100px_120px_auto] gap-1.5">
                  <input
                    dir="auto"
                    className="field"
                    placeholder={t("seller")}
                    value={s.seller}
                    onChange={(e) =>
                      setSellers((list) =>
                        list.map((x, xi) => (xi === i ? { ...x, seller: e.target.value } : x)),
                      )
                    }
                  />
                  <input
                    dir="ltr"
                    type="number"
                    className="field tabular"
                    placeholder={t("price")}
                    value={s.price || ""}
                    onChange={(e) =>
                      setSellers((list) =>
                        list.map((x, xi) =>
                          xi === i ? { ...x, price: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                  <select
                    className="field"
                    value={s.status}
                    onChange={(e) =>
                      setSellers((list) =>
                        list.map((x, xi) =>
                          xi === i ? { ...x, status: e.target.value as SellerPrice["status"] } : x,
                        ),
                      )
                    }
                  >
                    <option value="in">{t("inStock")}</option>
                    <option value="reserved">{t("reserved")}</option>
                    <option value="out">{t("outOfStock")}</option>
                  </select>
                  <button
                    className="btn-ghost px-2"
                    aria-label={t("remove")}
                    onClick={() => setSellers((list) => list.filter((_, xi) => xi !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn-sigma mt-2"
              onClick={() =>
                setSellers((list) => [
                  ...list,
                  { id: "e" + Date.now(), seller: "", price: 0, status: "in" },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              {t("addSeller")}
            </button>
          </div>
        </div>

        <SheetFooter className="sticky bottom-0 flex-row items-center justify-end gap-2 border-t border-border bg-surface-1 p-3">
          <button className="btn-ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </button>
          <button className="btn-primary" disabled={invalid} onClick={save}>
            <Save className="h-3.5 w-3.5" />
            {t("saveChanges")}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="micro-badge text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SpecFields({
  category,
  values,
  onChange,
}: {
  category: Category | null;
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
}) {
  const { t, lang } = useI18n();

  if (!category) return <p className="text-[12px] text-muted-foreground">{t("selectCategory")}</p>;

  if (category.fields.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{t("noFields")}</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {category.fields.map((f) => (
        <Field key={f.id} label={lang === "ar" ? f.labelAr : f.labelEn}>
          {f.type === "dropdown" ? (
            <select
              dir="ltr"
              className="field"
              value={values[f.id] ?? ""}
              onChange={(e) => onChange(f.id, e.target.value)}
            >
              <option value="">—</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-stretch gap-1">
              <input
                dir="ltr"
                type={f.type === "number" ? "number" : "text"}
                className="field"
                value={values[f.id] ?? ""}
                onChange={(e) => onChange(f.id, e.target.value)}
              />
              {f.unit && (
                <span className="tabular flex h-[30px] shrink-0 items-center rounded-sm border border-border bg-surface-2 px-2 text-[11px] text-muted-foreground">
                  {f.unit}
                </span>
              )}
            </div>
          )}
        </Field>
      ))}
    </div>
  );
}
