import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Printer, ScanLine, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Barcode128, QrCode } from "@/components/Barcode";
import { DeleteProductDialog } from "@/components/DeleteProductDialog";
import { EditProductSheet } from "@/components/EditProductSheet";
import { useI18n } from "@/lib/i18n";
import { useStore, type Product } from "@/lib/erp-store";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search & Seller Prices — Sigma Power ERP" },
      {
        name: "description",
        content:
          "Search electrical inventory by product name or barcode and compare seller prices and stock status.",
      },
      { property: "og:title", content: "Search & Seller Prices — Sigma Power ERP" },
      {
        property: "og:description",
        content: "Search electrical inventory and compare supplier prices in one matrix.",
      },
    ],
  }),
  component: SearchPage,
});

type Labels = { in: string; reserved: string; out: string };

function statusChip(s: Product["sellers"][number]["status"], labels: Labels) {
  if (s === "in") return <span className="chip-ok">{labels.in}</span>;
  if (s === "reserved") return <span className="chip-info">{labels.reserved}</span>;
  return <span className="chip-crit">{labels.out}</span>;
}

function SearchPage() {
  const { t, lang } = useI18n();
  const { products, categories, deleteProduct } = useStore();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(products[0]?.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.nameAr.toLowerCase().includes(term) ||
        p.nameEn.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term) ||
        p.manufacturer.toLowerCase().includes(term),
    );
  }, [q, products]);

  const selected = filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;
  const editing = products.find((p) => p.id === editingId) ?? null;
  const deleting = products.find((p) => p.id === deletingId) ?? null;
  const category = categories.find((c) => c.id === selected?.categoryId);
  const labels = { in: t("inStock"), reserved: t("reserved"), out: t("outOfStock") };
  const bestPrice = selected
    ? Math.min(...selected.sellers.filter((s) => s.status !== "out").map((s) => s.price))
    : 0;

  function confirmDelete(product: Product) {
    const removed = deleteProduct(product.id);
    setDeletingId(null);
    if (!removed) return;
    toast.success(t("deleted", { name: lang === "ar" ? removed.nameAr : removed.nameEn }));
  }

  return (
    <AppShell>
      <h1 className="mb-3 text-xl font-semibold tracking-tight">{t("searchTitle")}</h1>

      <div className="panel mb-3 flex items-center gap-2 p-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          dir="auto"
          className="field border-0 bg-transparent text-[14px] focus:border-0"
          placeholder={t("searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn-sigma shrink-0" onClick={() => setQ("")}>
          <ScanLine className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("scan")}</span>
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
        <section className="panel overflow-hidden">
          <div className="flex h-8 items-center justify-between border-b border-border bg-surface-0 px-2.5">
            <span className="micro-badge text-muted-foreground">{t("results")}</span>
            <span className="tabular text-[11px] text-muted-foreground">{filtered.length}</span>
          </div>
          <div className="flex h-7 items-center border-b border-border bg-surface-0 px-2.5">
            <span className="micro-badge flex-1 text-muted-foreground">{t("productName")}</span>
            <span className="micro-badge text-muted-foreground">{t("actions")}</span>
          </div>
          <ul className="max-h-[70vh] overflow-y-auto">
            {filtered.map((p) => {
              const active = selected?.id === p.id;
              return (
                <li key={p.id} className="flex items-stretch border-b border-border">
                  <button
                    onClick={() => setSelectedId(p.id)}
                    className={`flex-1 px-2.5 py-2 text-start transition-colors ${
                      active ? "border-s-2 border-s-sigma bg-surface-2" : "hover:bg-surface-2"
                    }`}
                  >
                    <div className="truncate text-[13px]">
                      {lang === "ar" ? p.nameAr : p.nameEn}
                    </div>
                    <div className="tabular mt-0.5 text-[11px] text-muted-foreground">
                      {p.barcode} · {p.manufacturer}
                    </div>
                  </button>
                  <div
                    className={`flex items-center gap-1 border-s border-border px-1.5 ${
                      active ? "bg-surface-2" : ""
                    }`}
                  >
                    <button
                      className="btn-ghost px-1.5 py-1"
                      aria-label={t("edit")}
                      title={t("edit")}
                      onClick={() => setEditingId(p.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="btn-ghost px-1.5 py-1 text-destructive hover:text-destructive"
                      aria-label={t("delete")}
                      title={t("delete")}
                      onClick={() => setDeletingId(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-2.5 py-6 text-center text-[12px] text-muted-foreground">
                {t("noResults")}
              </li>
            )}
          </ul>
        </section>

        {selected ? (
          <section className="space-y-3">
            <div className="panel p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {lang === "ar" ? selected.nameAr : selected.nameEn}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                    <span className="chip-info">
                      {category ? (lang === "ar" ? category.nameAr : category.nameEn) : "—"}
                    </span>
                    <span>
                      {t("manufacturer")}:{" "}
                      <span className="text-foreground">{selected.manufacturer}</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="btn-ghost px-2"
                    aria-label={t("edit")}
                    title={t("edit")}
                    onClick={() => setEditingId(selected.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="btn-ghost px-2 text-destructive hover:text-destructive"
                    aria-label={t("delete")}
                    title={t("delete")}
                    onClick={() => setDeletingId(selected.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button className="btn-ghost" onClick={() => window.print()}>
                    <Printer className="h-3.5 w-3.5" />
                    {t("print")}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="micro-badge mb-1.5 text-muted-foreground">{t("specs")}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                    {category?.fields.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-baseline justify-between border-b border-border py-1"
                      >
                        <span className="text-[12px] text-muted-foreground">
                          {lang === "ar" ? f.labelAr : f.labelEn}
                        </span>
                        <span className="tabular text-[12px]">
                          {selected.values[f.id] ?? "—"}
                          {f.unit ? <span className="text-muted-foreground"> {f.unit}</span> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="micro-badge mb-1.5 text-muted-foreground">{t("serialCode")}</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Barcode128 value={selected.barcode} />
                    <QrCode value={selected.barcode} />
                  </div>
                </div>
              </div>
            </div>

            <div className="panel overflow-hidden">
              <div className="flex h-8 items-center border-b border-border bg-surface-0 px-2.5">
                <span className="micro-badge text-muted-foreground">{t("sellerMatrix")}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-0">
                    <th className="micro-badge px-2.5 py-1.5 text-start text-muted-foreground">
                      {t("seller")}
                    </th>
                    <th className="micro-badge px-2.5 py-1.5 text-start text-muted-foreground">
                      {t("status")}
                    </th>
                    <th className="micro-badge px-2.5 py-1.5 text-end text-muted-foreground">
                      {t("price")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...selected.sellers]
                    .sort((a, b) => a.price - b.price)
                    .map((s) => (
                      <tr
                        key={s.id}
                        className="h-8 border-b border-border last:border-0 hover:bg-surface-2"
                      >
                        <td className="px-2.5 py-1.5 text-[13px]">{s.seller}</td>
                        <td className="px-2.5 py-1.5">{statusChip(s.status, labels)}</td>
                        <td className="px-2.5 py-1.5 text-end">
                          <span className="tabular text-[13px]">
                            {s.price.toLocaleString("en-US")} EGP
                          </span>
                          {s.price === bestPrice && s.status !== "out" && (
                            <span className="chip-ok ms-2">{t("best")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="panel flex items-center justify-center p-10 text-[13px] text-muted-foreground">
            {t("selectProduct")}
          </section>
        )}
      </div>

      {editing && (
        <EditProductSheet
          key={editing.id}
          product={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditingId(null);
          }}
        />
      )}

      {deleting && (
        <DeleteProductDialog
          product={deleting}
          open
          onOpenChange={(open) => {
            if (!open) setDeletingId(null);
          }}
          onConfirm={confirmDelete}
        />
      )}
    </AppShell>
  );
}
