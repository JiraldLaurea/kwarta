import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EditModal, ModalBackButton } from "@/components/kwarta/shared";
import type { Category } from "@/lib/types";

export function DeleteCategoryConfirmationModal({
  category,
  onCancel,
  onConfirm,
}: {
  category: Category;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <EditModal onClose={onCancel}>
      <Card className="min-h-dvh rounded-none border-0 bg-white sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:border">
        <div className="px-6 pb-6 pt-5">
          <ModalBackButton onClick={onCancel} />
          <CardTitle className="text-2xl font-medium leading-8">
            Delete {category.name}?
          </CardTitle>
          <p className="mt-2 text-base leading-6 text-muted-foreground">
            This will remove the card, its transactions, and any budgets linked
            to this category.
          </p>
          <Button
            className="mt-6 w-full sm:hidden"
            type="button"
            onClick={onConfirm}
          >
            Delete card
          </Button>
        </div>
        <div className="hidden items-center justify-between border-t border-border bg-neutral-50 px-5 py-4 sm:flex">
          <Button
            data-modal-close
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Delete card
          </Button>
        </div>
      </Card>
    </EditModal>
  );
}
