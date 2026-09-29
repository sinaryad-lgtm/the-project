import { Link } from "@tanstack/react-router";
import { Search, LayoutGrid, PackagePlus, Languages, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";
import logo from "@/assets/sigma-power-logo.jpg.asset.json";
import { Toaster } from "@/components/ui/sonner";
import { useI18n, type Key } from "@/lib/i18n";

const nav: { to: string; key: Key; icon: typeof Search }[] = [
  { to: "/search", key: "navSearch", icon: Search },
  { to: "/templates", key: "navTemplates", icon: LayoutGrid },
  { to: "/add-product", key: "navAdd", icon: PackagePlus },
];

const logoSources = [logo.url, "/favicon.png"];

function BrandLogo({ alt }: { alt: string }) {
  const [sourceIndex, setSourceIndex] = useState(0);

  return (
    <span className="inline-flex h-8 w-8 max-w-8 shrink-0 items-center justify-center rounded-sm">
      {sourceIndex < logoSources.length ? (
        <img
          src={logoSources[sourceIndex]}
          alt={alt}
          className="h-8 w-8 rounded-sm object-contain"
          onError={() => setSourceIndex((index) => index + 1)}
        />
      ) : (
        <Zap className="h-4 w-4 text-sigma-bright" aria-hidden="true" />
      )}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang, dir } = useI18n();

  return (
    <div dir={dir} className="min-h-screen bg-surface-0 text-foreground">
      <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-header px-3">
        <BrandLogo alt={t("appName")} />
        <div className="leading-tight">
          <div className="text-[13px] font-semibold">{t("appName")}</div>
          <div className="micro-badge text-muted-foreground">{t("appSub")}</div>
        </div>

        <nav className="ms-4 flex items-center gap-1">
          {nav.map(({ to, key, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="btn-ghost"
              activeProps={{
                className:
                  "inline-flex items-center gap-1.5 rounded-sm border border-sigma/60 bg-sigma/15 px-3 py-1.5 text-[13px] text-sigma-bright",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t(key)}</span>
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-3">
          <span className="chip-ok">
            <Zap className="me-1 h-2.5 w-2.5" />
            {t("online")}
          </span>
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="btn-sigma"
            aria-label="Toggle language"
          >
            <Languages className="h-3.5 w-3.5" />
            <span className="tabular text-[11px]">{lang === "ar" ? "EN" : "ع"}</span>
          </button>
        </div>
      </header>

      <main className="p-3">{children}</main>

      <Toaster dir={dir} position="top-center" closeButton richColors />
    </div>
  );
}
