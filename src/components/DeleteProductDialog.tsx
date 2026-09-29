import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/erp-store";

export function DeleteProductDialog({
  product,
  open,
  onOpenChange,
  onConfirm,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (product: Product) => void;
}) {
  const { t, lang } = useI18n();
  const name = lang === "ar" ? product.nameAr : product.nameEn;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-border bg-surface-1 sm:max-w-md">
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle className="flex items-center gap-2 text-[15px]">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            {t("deleteTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[13px]">
            <span className="text-foreground">{t("deleteConfirm", { name })}</span>
            <span className="mt-1 block text-[12px]">{t("deleteWarning")}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row items-center justify-end gap-2">
          <AlertDialogCancel className="btn-ghost h-[30px] px-3 text-[13px] shadow-none">
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-sm bg-destructive px-3 text-[13px] font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
            onClick={() => onConfirm(product)}
          >
            {t("confirmDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
