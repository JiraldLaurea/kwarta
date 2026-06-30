"use client";

import { Download, Upload } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function BackupActions({
    error,
    importInputRef,
    onExport,
    onImportClick,
    onImportFile,
}: {
    error: string | null;
    importInputRef: React.RefObject<HTMLInputElement>;
    onExport: () => void;
    onImportClick: () => void;
    onImportFile: (file: File) => void;
}) {
    return (
        <div className="relative grid w-full grid-cols-2 gap-2">
            <Button
                className="w-full justify-center"
                type="button"
                variant="secondary"
                onClick={onImportClick}
            >
                <Upload className="h-4 w-4" aria-hidden />
                Import
            </Button>
            <Button
                className="w-full justify-center"
                type="button"
                variant="secondary"
                onClick={onExport}
            >
                <Download className="h-4 w-4" aria-hidden />
                Export
            </Button>
            <input
                ref={importInputRef}
                className="hidden"
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";

                    if (file) {
                        onImportFile(file);
                    }
                }}
            />
            {error && (
                <p className="absolute right-0 top-12 z-10 w-64 text-right text-xs leading-4 text-destructive sm:w-80">
                    {error}
                </p>
            )}
        </div>
    );
}

export function ImportConfirmationModal({
    onCancel,
    onConfirm,
}: {
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <StaticBackupModal maxWidthClassName="sm:max-w-[380px]">
            <Card className="w-full overflow-hidden rounded-2xl border border-border bg-white">
                <div className="px-6 pb-6 pt-5">
                    <CardTitle className="text-2xl font-medium leading-8">
                        Replace workspace?
                    </CardTitle>
                    <p className="mt-2 text-base leading-6 text-muted-foreground">
                        Importing this backup will replace your transactions,
                        budgets, accounts, categories, and subcategories.
                    </p>
                </div>
                <div className="flex items-center justify-between rounded-b-2xl border-t border-border bg-neutral-50 px-5 py-4">
                    <Button
                        data-modal-close
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button type="button" onClick={onConfirm}>
                        Replace workspace
                    </Button>
                </div>
            </Card>
        </StaticBackupModal>
    );
}

export function ImportLoadingModal() {
    return (
        <StaticBackupModal maxWidthClassName="sm:max-w-[360px]">
            <Card
                className="w-full rounded-2xl border border-border bg-white p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
                role="dialog"
                aria-modal="true"
                aria-live="polite"
            >
                <span
                    className="mx-auto flex h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground"
                    aria-hidden
                />
                <CardTitle className="mt-4 text-xl font-medium leading-7">
                    Importing backup
                </CardTitle>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    Reading the backup and saving it to your account...
                </p>
            </Card>
        </StaticBackupModal>
    );
}

function StaticBackupModal({
    children,
    maxWidthClassName,
}: {
    children: React.ReactNode;
    maxWidthClassName: string;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
            <div className="absolute inset-0 cursor-default bg-white/45 backdrop-blur-sm" />
            <div className={`relative w-full ${maxWidthClassName}`}>
                {children}
            </div>
        </div>
    );
}
