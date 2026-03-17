import { useState, useCallback, useMemo } from "react";

export function useRowSelection(
  allItemIds: string[],
  excludedIds?: Set<string>,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectTableIds = useMemo(
    () => allItemIds.filter((id) => !excludedIds?.has(id)),
    [allItemIds, excludedIds],
  );

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = selectTableIds.every((id) => prev.has(id));
      if (allSelected) {
        return new Set();
      }
      return new Set(selectTableIds);
    });
  }, [selectTableIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedCount = selectedIds.size;
  const allSelected =
    selectTableIds.length > 0 &&
    selectTableIds.every((id) => selectedIds.has(id));
  const isIndeterminate = selectedCount > 0 && !allSelected;

  return {
    selectedIds,
    toggleItem,
    toggleAll,
    clearSelection,
    allSelected,
    isIndeterminate,
    selectedCount,
  };
}
