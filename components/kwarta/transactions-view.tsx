"use client";

import { useRef, useState } from "react";
import type { TransactionFormValues } from "@/lib/schema";
import type { Category, Transaction } from "@/lib/types";
import {
    downloadBackupFile,
    parseTransactionBackupPayload,
    type TransactionImportResult,
} from "@/lib/kwarta/backup";
import {
    ImportConfirmationModal,
    ImportLoadingModal,
    TransactionBackupActions,
} from "@/components/kwarta/backup-controls";
import { EditModal, PageHeader } from "@/components/kwarta/shared";
import { TransactionForm, TransactionTable } from "@/components/kwarta/transactions";
export function TransactionsView({
    allTransactions,
    categories,
    editingId,
    month,
    onCancelEdit,
    onDelete,
    onEdit,
    onImport,
    onSubmit,
    transactions,
}: {
    allTransactions: Transaction[];
    categories: Category[];
    editingId: string | null;
    month: string;
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
    onEdit: (transaction: Transaction) => void;
    onImport: (
        transactions: Transaction[],
        categories?: Category[],
    ) => Promise<void>;
    onSubmit: (values: TransactionFormValues) => void;
    transactions: Transaction[];
}) {
    const editing = transactions.find(
        (transaction) => transaction.id === editingId,
    );
    const importInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [pendingImport, setPendingImport] =
        useState<TransactionImportResult | null>(null);

    async function handleImportFile(file: File) {
        setIsImporting(true);
        let nextImport: TransactionImportResult;

        try {
            nextImport = parseTransactionBackupPayload(
                JSON.parse(await file.text()),
                categories,
            );
        } catch {
            setImportError(
                "Transactions could not be imported. Check that this is a Kwarta transactions JSON backup.",
            );
            setIsImporting(false);
            return;
        }

        setImportError(null);

        if (allTransactions.length > 0) {
            setPendingImport(nextImport);
            setIsImporting(false);
            return;
        }

        try {
            await onImport(nextImport.transactions, nextImport.categories);
        } catch {
            setImportError(
                "Imported transactions could not be saved. Please try importing again.",
            );
        } finally {
            setIsImporting(false);
        }
    }

    async function confirmImport() {
        if (!pendingImport) {
            return;
        }

        const nextImport = pendingImport;
        setPendingImport(null);
        setIsImporting(true);

        try {
            await onImport(nextImport.transactions, nextImport.categories);
            setImportError(null);
        } catch {
            setImportError(
                "Imported transactions could not be saved. Please try importing again.",
            );
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <>
            <div className="space-y-4">
                <PageHeader
                    title="Transactions"
                    description="Edit or remove posted money movement."
                    actions={
                        <TransactionBackupActions
                            error={importError}
                            importInputRef={importInputRef}
                            onExport={() =>
                                downloadBackupFile(
                                    "transactions",
                                    allTransactions,
                                    categories,
                                )
                            }
                            onImportClick={() =>
                                importInputRef.current?.click()
                            }
                            onImportFile={handleImportFile}
                        />
                    }
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
            {pendingImport && (
                <ImportConfirmationModal
                    count={pendingImport.transactions.length}
                    itemLabel="transactions"
                    onCancel={() => setPendingImport(null)}
                    onConfirm={confirmImport}
                />
            )}
            {isImporting && <ImportLoadingModal itemLabel="transactions" />}
        </>
    );
}

