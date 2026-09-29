import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStore, type FieldType } from "@/lib/erp-store";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Product Types & Field Builder — Sigma Power ERP" },
      {
        name: "description",
        content:
          "Create electrical product categories and define their custom fields, units and dropdown options.",
      },
      { property: "og:title", content: "Product Types & Field Builder — Sigma Power ERP" },
      {
        property: "og:description",
        content: "Define product categories and dynamic specification fields for your inventory.",
      },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { t, lang } = useI18n();
  const { categories, addCategory, removeCategory, addField, removeField } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(categories[0]?.id ?? null);
  const [catAr, setCatAr] = useState("");
  const [catEn, setCatEn] = useState("");

  const [labelAr, setLabelAr] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [unit, setUnit] = useState("");
  const [options, setOptions] = useState("");

  const selected = categories.find((c) => c.id === selectedId) ?? null;

  return (
    <AppShell>
      <h1 className="mb-3 text-xl font-semibold tracking-tight">{t("templatesTitle")}</h1>

      <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
        <section className="space-y-3">
          <div className="panel p-2.5">
            <div className="micro-badge mb-2 text-muted-foreground">{t("newCategory")}</div>
            <div className="space-y-1.5">
              <input
                dir="rtl"
                className="field"
                placeholder={t("nameAr")}
                value={catAr}
                onChange={(e) => setCatAr(e.target.value)}
              />
              <input
                dir="ltr"
                className="field"
                placeholder={t("nameEn")}
                value={catEn}
                onChange={(e) => setCatEn(e.target.value)}
              />
              <button
                className="btn-primary w-full"
                disabled={!catAr.trim() || !catEn.trim()}
                onClick={() => {
                  const id = addCategory(catAr.trim(), catEn.trim());
                  setSelectedId(id);
                  setCatAr("");
                  setCatEn("");
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("create")}
              </button>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex h-8 items-center justify-between border-b border-border bg-surface-0 px-2.5">
              <span className="micro-badge text-muted-foreground">{t("categories")}</span>
              <span className="tabular text-[11px] text-muted-foreground">{categories.length}</span>
            </div>
            <ul>
              {categories.map((c) => (
                <li
                  key={c.id}
                  className={`flex items-center border-b border-border last:border-0 ${
                    selectedId === c.id ? "border-s-2 border-s-sigma bg-surface-2" : ""
                  }`}
                >
                  <button
                    className="flex-1 px-2.5 py-2 text-start hover:bg-surface-2"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div className="text-[13px]">{lang === "ar" ? c.nameAr : c.nameEn}</div>
                    <div className="tabular text-[11px] text-muted-foreground">
                      {c.fields.length} {t("fields")}
                    </div>
                  </button>
                  <button
                    className="btn-ghost px-2"
                    aria-label={t("remove")}
                    onClick={() => {
                      removeCategory(c.id);
                      if (selectedId === c.id) setSelectedId(null);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {selected ? (
          <section className="space-y-3">
            <div className="panel p-2.5">
              <div className="micro-badge mb-2 text-muted-foreground">
                {t("addField")} — {lang === "ar" ? selected.nameAr : selected.nameEn}
              </div>
              <div className="grid gap-1.5 md:grid-cols-5">
                <input
                  dir="rtl"
                  className="field"
                  placeholder={t("fieldLabel") + " (ع)"}
                  value={labelAr}
                  onChange={(e) => setLabelAr(e.target.value)}
                />
                <input
                  dir="ltr"
                  className="field"
                  placeholder={t("fieldLabel") + " (EN)"}
                  value={labelEn}
                  onChange={(e) => setLabelEn(e.target.value)}
                />
                <select
                  className="field"
                  value={type}
                  onChange={(e) => setType(e.target.value as FieldType)}
                >
                  <option value="text">{t("text")}</option>
                  <option value="number">{t("number")}</option>
                  <option value="dropdown">{t("dropdown")}</option>
                </select>
                {type === "dropdown" ? (
                  <input
                    dir="ltr"
                    className="field"
                    placeholder={t("options")}
                    value={options}
                    onChange={(e) => setOptions(e.target.value)}
                  />
                ) : (
                  <input
                    dir="ltr"
                    className="field"
                    placeholder={t("unit") + " (mm², A, V)"}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                )}
                <button
                  className="btn-primary"
                  disabled={!labelAr.trim() || !labelEn.trim()}
                  onClick={() => {
                    addField(selected.id, {
                      labelAr: labelAr.trim(),
                      labelEn: labelEn.trim(),
                      type,
                      unit: unit.trim() || undefined,
                      options:
                        type === "dropdown"
                          ? options
                              .split(",")
                              .map((o) => o.trim())
                              .filter(Boolean)
                          : undefined,
                    });
                    setLabelAr("");
                    setLabelEn("");
                    setUnit("");
                    setOptions("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("addField")}
                </button>
              </div>
            </div>

            <div className="panel overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-0">
                    <th className="micro-badge px-2.5 py-1.5 text-start text-muted-foreground">
                      {t("fieldLabel")}
                    </th>
                    <th className="micro-badge px-2.5 py-1.5 text-start text-muted-foreground">
                      {t("fieldType")}
                    </th>
                    <th className="micro-badge px-2.5 py-1.5 text-start text-muted-foreground">
                      {t("unit")} / {t("options")}
                    </th>
                    <th className="px-2.5 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {selected.fields.map((f) => (
                    <tr
                      key={f.id}
                      className="h-8 border-b border-border last:border-0 hover:bg-surface-2"
                    >
                      <td className="px-2.5 py-1.5 text-[13px]">
                        {lang === "ar" ? f.labelAr : f.labelEn}
                      </td>
                      <td className="px-2.5 py-1.5">
                        <span className="chip-info">{t(f.type)}</span>
                      </td>
                      <td className="tabular px-2.5 py-1.5 text-[12px] text-muted-foreground">
                        {f.type === "dropdown" ? (f.options ?? []).join(" · ") : (f.unit ?? "—")}
                      </td>
                      <td className="px-2.5 py-1.5 text-end">
                        <button
                          className="btn-ghost px-2"
                          onClick={() => removeField(selected.id, f.id)}
                          aria-label={t("remove")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {selected.fields.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-2.5 py-6 text-center text-[12px] text-muted-foreground"
                      >
                        {t("noFields")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="panel flex items-center justify-center p-10 text-[13px] text-muted-foreground">
            {t("selectCategory")}
          </section>
        )}
      </div>
    </AppShell>
  );
}
