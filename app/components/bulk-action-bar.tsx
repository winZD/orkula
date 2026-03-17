import { useTranslation } from "react-i18next";
import { X, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
}

export function BulkActionBar({
  selectedCount,
  onClear,
  onDelete,
}: BulkActionBarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 sm:gap-3 rounded-lg bg-forest px-2.5 sm:px-4 py-2 sm:py-2.5 text-cream shadow-lg">
      <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
        {t("selected", { count: selectedCount })}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-cream hover:bg-cream/20 hover:text-cream"
        onClick={onClear}
      >
        <X className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-300 hover:bg-red-500/20 hover:text-red-200"
        onClick={onDelete}
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        {t("bulkDelete")}
      </Button>
    </div>
  );
}
