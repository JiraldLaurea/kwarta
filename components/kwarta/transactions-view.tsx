"use client";

import type { TransactionFormValues } from "@/lib/schema";
import type { Account, Category, Transaction } from "@/lib/types";
import { EditModal, PageHeader } from "@/components/kwarta/shared";
import { TransactionForm, TransactionTable } from "@/components/kwarta/transactions";
export function TransactionsView({
    accounts,
    categories,
    editingId,
    month,
    onCancelEdit,
    onDelete,
    onEdit,
    onSubmit,
    transactions,
}: {
    accounts: Account[];
    categories: Category[];
    editingId: string | null;
    month: string;
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
    onEdit: (transaction: Transaction) => void;
    onSubmit: (values: TransactionFormValues) => void;
    transactions: Transaction[];
}) {
    const editing = transactions.find(
        (transaction) => transaction.id === editingId,
    );

    return (
        <>
            <div className="space-y-4">
                <PageHeader
                    title="Transactions"
                    description="Edit or remove posted money movement."
                />
                <TransactionTable
                    categories={categories}
                    onEdit={onEdit}
                    transactions={transactions}
                />
            </div>
            {editing && (
                <EditModal onClose={onCancelEdit}>
                    <TransactionForm
                        accounts={accounts}
                        categories={categories}
                        editing={editing}
                        month={month}
                        onCancel={onCancelEdit}
                        onDelete={() => {
                            onDelete(editing.id);
                            onCancelEdit();
                        }}
                        onSubmit={onSubmit}
                    />
                </EditModal>
            )}
        </>
    );
}

