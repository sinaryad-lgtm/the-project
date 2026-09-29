import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Barcode128, QrCode } from "@/components/Barcode";
import { useI18n } from "@/lib/i18n";
import {
  findSerialConflict,
  isValidSerial,
  normalizeSerial,
  useStore,
  type SellerPrice,
  type Product,
} from "@/lib/erp-store";

export const Route = createFileRoute("/add-product")({
  head: () => ({
    meta: [
      { title: "Add New Product — Sigma Power ERP" },
      {
        name: "description",
        content:
          "Add an electrical product: pick a type, enter its serial code, fill dynamic specs and assign seller prices.",
      },
      { property: "og:title", content: "Add New Product — Sigma Power ERP" },
      {
        property: "og:description",
        content:
          "Register products with dynamic specs, seller prices and printable serial barcodes.",
      },
    ],
  }),
  component: AddProductPage,
});

function AddProductPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { categories, products, addProduct } = useStore();

  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [serial, setSerial] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [sellers, setSellers] = useState<SellerPrice[]>([
    { id: "n1", seller: "", price: 0, status: "in" },
  ]);
  const [saved, setSaved] = useState<Product | null>(null);

  const category = categories.find((c) => c.id === categoryId) ?? null;
  const steps = [t("step1"), t("step2"), t("step3")];

  const serialValue = normalizeSerial(serial);
  const serialMissing = serialValue.length === 0;
  const serialInvalid = !serialMissing && !isValidSerial(serialValue);
  const serialTaken =
    !serialMissing && !serialInvalid && !!findSerialConflict(products, serialValue);
  const serialOk = !serialMissing && !serialInvalid && !serialTaken;

  function reset() {
    setStep(1);
    setCategoryId(null);
    setNameAr("");
    setNameEn("");
    setManufacturer("");
    setSerial("");
    setValues({});
    setSellers([{ id: "n1", seller: "", price: 0, status: "in" }]);
    setSaved(null);
  }

  if (saved) {
    return (
      <AppShell>
        <div className="panel mx-auto max-w-xl p-5 text-center">
          <div className="chip-ok mx-auto mb-3 w-fit">
            <Check className="me-1 h-3 w-3" />
            {t("saved")}
          </div>
          <h2 className="text-lg font-semibold">{lang === "ar" ? saved.nameAr : saved.nameEn}</h2>
          <div className="tabular mt-1 text-[12px] text-muted-foreground">{saved.barcode}</div>
          <div className="micro-badge mt-4 text-muted-foreground">{t("generated")}</div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Barcode128 value={saved.barcode} height={60} />
            <QrCode value={saved.barcode} size={120} />
          </div>
          <div className="mt-5 flex justify-center gap-2">
            <button className="btn-primary" onClick={() => window.print()}>
              {t("print")}
            </button>
            <button className="btn-sigma" onClick={() => navigate({ to: "/search" })}>
              {t("viewInSearch")}
            </button>
            <button className="btn-ghost" onClick={reset}>
              {t("addAnother")}
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="mb-3 text-xl font-semibold tracking-tight">{t("addTitle")}</h1>

      <ol className="panel mb-3 flex items-center gap-1 p-1.5">
        {steps.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <li key={label} className="flex-1">
              <button
                onClick={() => (n < step ? setStep(n) : undefined)}
                className={`flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-start text-[12px] ${
                  active
                    ? "border border-sigma/60 bg-sigma/15 text-sigma-bright"
                    : done
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              >
                <span className="tabular text-[11px]">0{n}</span>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCategoryId(c.id);
                setValues({});
                setStep(2);
              }}
              className="panel p-3 text-start transition-colors hover:border-sigma hover:bg-surface-2"
            >
              <div className="text-[14px] font-medium">{lang === "ar" ? c.nameAr : c.nameEn}</div>
              <div className="tabular mt-1 text-[11px] text-muted-foreground">
                {c.fields.length} {t("fields")}
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && category && (
        <div className="panel space-y-3 p-3">
          <div className="grid gap-2 md:grid-cols-3">
            <label className="block">
              <span className="micro-badge text-muted-foreground">
                {t("productName")} (ع) <span className="text-destructive">*</span>
              </span>
              <input
                dir="rtl"
                className="field mt-1"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="micro-badge text-muted-foreground">
                {t("productName")} (EN) <span className="text-destructive">*</span>
              </span>
              <input
                dir="ltr"
                className="field mt-1"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="micro-badge text-muted-foreground">{t("manufacturer")}</span>
              <input
                dir="ltr"
                className="field mt-1"
                placeholder="Schneider, ABB…"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              />
            </label>
          </div>

          <div className="border-t border-border pt-3">
            <div className="grid gap-2 md:grid-cols-[minmax(0,320px)_1fr] md:items-start">
              <label className="block">
                <span className="micro-badge text-muted-foreground">
                  {t("serialCode")} <span className="text-destructive">*</span>
                </span>
                <input
                  dir="ltr"
                  className="field tabular mt-1"
                  placeholder={t("serialPlaceholder")}
                  value={serial}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setSerial(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && serialOk && nameAr.trim() && nameEn.trim()) {
                      e.preventDefault();
                      setStep(3);
                    }
                  }}
                />
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {t("serialHint")}
                </span>
                {serialMissing ? null : serialInvalid ? (
                  <span className="mt-1 block text-[11px] text-destructive">
                    {t("serialInvalid")}
                  </span>
                ) : serialTaken ? (
                  <span className="mt-1 block text-[11px] text-destructive">
                    {t("serialDuplicate")}
                  </span>
                ) : null}
              </label>
              <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                {serialOk ? (
                  <>
                    <Barcode128 value={serialValue} height={52} />
                    <QrCode value={serialValue} size={96} />
                  </>
                ) : (
                  <p className="text-[12px] text-muted-foreground">{t("serialPreviewHint")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="micro-badge mb-2 text-muted-foreground">{t("specs")}</div>
            <div className="grid gap-2 md:grid-cols-3">
              {category.fields.map((f) => (
                <label key={f.id} className="block">
                  <span className="micro-badge text-muted-foreground">
                    {lang === "ar" ? f.labelAr : f.labelEn}
                  </span>
                  {f.type === "dropdown" ? (
                    <select
                      dir="ltr"
                      className="field mt-1"
                      value={values[f.id] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                    >
                      <option value="">—</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-1 flex items-stretch gap-1">
                      <input
                        dir="ltr"
                        type={f.type === "number" ? "number" : "text"}
                        className="field"
                        value={values[f.id] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                      />
                      {f.unit && (
                        <span className="tabular flex h-[30px] shrink-0 items-center rounded-sm border border-border bg-surface-2 px-2 text-[11px] text-muted-foreground">
                          {f.unit}
                        </span>
                      )}
                    </div>
                  )}
                </label>
              ))}
              {category.fields.length === 0 && (
                <p className="text-[12px] text-muted-foreground">{t("noFields")}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between border-t border-border pt-3">
            <button className="btn-ghost" onClick={() => setStep(1)}>
              {t("back")}
            </button>
            <button
              className="btn-primary"
              disabled={!nameAr.trim() || !nameEn.trim() || !serialOk}
              onClick={() => setStep(3)}
            >
              {t("next")}
            </button>
          </div>
        </div>
      )}

      {step === 3 && category && (
        <div className="panel space-y-3 p-3">
          <div className="micro-badge text-muted-foreground">{t("step3")}</div>
          <div className="space-y-1.5">
            {sellers.map((s, i) => (
              <div key={s.id} className="grid grid-cols-[1fr_120px_140px_auto] gap-1.5">
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
                      list.map((x, xi) => (xi === i ? { ...x, price: Number(e.target.value) } : x)),
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
            className="btn-sigma"
            onClick={() =>
              setSellers((list) => [
                ...list,
                { id: "n" + (list.length + 1) + Date.now(), seller: "", price: 0, status: "in" },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addSeller")}
          </button>

          <div className="flex justify-between border-t border-border pt-3">
            <button className="btn-ghost" onClick={() => setStep(2)}>
              {t("back")}
            </button>
            <button
              className="btn-primary"
              disabled={!nameAr.trim() || !nameEn.trim() || !serialOk}
              onClick={() => {
                if (!nameAr.trim() || !nameEn.trim()) {
                  toast.error(t("required"));
                  return;
                }
                if (serialMissing) {
                  toast.error(t("serialRequired"));
                  return;
                }
                if (serialInvalid) {
                  toast.error(t("serialInvalid"));
                  return;
                }
                const clash = findSerialConflict(products, serialValue);
                if (clash) {
                  toast.error(
                    t("serialConflictWith", { name: lang === "ar" ? clash.nameAr : clash.nameEn }),
                  );
                  setStep(2);
                  return;
                }
                setSaved(
                  addProduct({
                    nameAr: nameAr.trim(),
                    nameEn: nameEn.trim(),
                    categoryId: category.id,
                    manufacturer: manufacturer.trim() || "—",
                    barcode: serialValue,
                    values,
                    sellers: sellers.filter((s) => s.seller.trim()),
                  }),
                );
              }}
            >
              <Save className="h-3.5 w-3.5" />
              {t("save")}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
