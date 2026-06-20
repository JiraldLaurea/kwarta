"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { categorySchema, type CategoryFormValues } from "@/lib/schema";
import type { Category, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
    CategoryIconBadge,
    EditModal,
    EmptyState,
    FieldError,
    ModalBackButton,
    categoryIconChoices,
    colorChoices,
} from "@/components/kwarta/shared";
export function CategoriesView({
    categories,
    editingId,
    expenseCategories,
    incomeCategories,
    onCancelEdit,
    onDelete,
    onEdit,
    onSubmit,
}: {
    categories: Category[];
    editingId: string | null;
    expenseCategories: Category[];
    incomeCategories: Category[];
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
    onEdit: (category: Category) => void;
    onSubmit: (values: CategoryFormValues) => void;
}) {
    const editing = categories.find((category) => category.id === editingId);

    return (
        <>
            <div className="grid gap-4 md:gap-5 lg:grid-cols-[0.75fr_1.25fr]">
                <CategoryForm onCancel={onCancelEdit} onSubmit={onSubmit} />
                <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                    <CategoryList
                        title="Income categories"
                        description="Sources for money coming in."
                        categories={incomeCategories}
                        onDelete={onDelete}
                        onEdit={onEdit}
                    />
                    <CategoryList
                        title="Expense categories"
                        description="Groups for money going out."
                        categories={expenseCategories}
                        onDelete={onDelete}
                        onEdit={onEdit}
                    />
                </div>
            </div>
            {editing && (
                <EditModal onClose={onCancelEdit}>
                    <CategoryForm
                        editing={editing}
                        onCancel={onCancelEdit}
                        onSubmit={onSubmit}
                    />
                </EditModal>
            )}
        </>
    );
}

export function CategoryForm({
    editing,
    modal = false,
    onCancel,
    onDelete,
    onSubmit,
}: {
    editing?: Category;
    modal?: boolean;
    onCancel: () => void;
    onDelete?: () => void;
    onSubmit: (values: CategoryFormValues) => void;
}) {
    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        values: editing ?? {
            name: "",
            type: "expense",
            color: colorChoices[0],
            icon: "receipt",
        },
    });
    const selectedColor = form.watch("color");
    const selectedIcon = form.watch("icon");

    const isEditing = Boolean(editing);
    const isModal = isEditing || modal;

    return (
        <Card
            className={cn(
                isModal &&
                    "min-h-dvh rounded-none border-0 bg-white sm:min-h-0 sm:overflow-visible sm:rounded-2xl sm:border",
            )}
        >
            <form
                onSubmit={form.handleSubmit((values) => {
                    onSubmit(values);
                    form.reset();
                })}
            >
                <CardHeader className={cn(isModal && "px-6 pb-2 pt-5")}>
                    {isModal && <ModalBackButton onClick={onCancel} />}
                    <CardTitle
                        className={cn(
                            isModal && "text-2xl font-medium leading-8",
                        )}
                    >
                        {editing ? "Edit category" : "Create category"}
                    </CardTitle>
                    <p
                        className={cn(
                            "text-sm text-muted-foreground",
                            isModal && "text-base leading-6",
                        )}
                    >
                        {editing
                            ? "Update the name, type, color, and icon for this category."
                            : "Choose how this category appears on your home cards and reports."}
                    </p>
                </CardHeader>
                <CardContent
                    className={cn("space-y-4", isModal && "px-6 pb-6 pt-0")}
                >
                    <FieldError message={form.formState.errors.name?.message}>
                        <Label htmlFor="category-name">Name</Label>
                        <Input id="category-name" {...form.register("name")} />
                    </FieldError>
                    <FieldError message={form.formState.errors.type?.message}>
                        <Label htmlFor="category-type">Type</Label>
                        <Select
                            id="category-type"
                            onValueChange={(value) =>
                                form.setValue(
                                    "type",
                                    value as TransactionType,
                                    {
                                        shouldValidate: true,
                                    },
                                )
                            }
                            options={[
                                { label: "Expense", value: "expense" },
                                { label: "Income", value: "income" },
                            ]}
                            value={form.watch("type")}
                        />
                    </FieldError>
                    <div>
                        <Label>Color</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {colorChoices.map((color) => (
                                <button
                                    key={color}
                                    aria-label={`Use ${color}`}
                                    className={cn(
                                        "h-8 w-8 rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        selectedColor === color &&
                                            "ring-2 ring-ring ring-offset-2",
                                    )}
                                    style={{ backgroundColor: color }}
                                    type="button"
                                    onClick={() =>
                                        form.setValue("color", color)
                                    }
                                />
                            ))}
                        </div>
                    </div>
                    <FieldError message={form.formState.errors.icon?.message}>
                        <Label>Icon</Label>
                        <div className="mt-2 flex max-w-[560px] flex-wrap gap-2">
                            {categoryIconChoices.map((choice) => {
                                const Icon = choice.icon;
                                const isSelected =
                                    selectedIcon === choice.value;

                                return (
                                    <button
                                        key={choice.value}
                                        aria-label={`Use ${choice.label} icon`}
                                        className={cn(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors md:hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            isSelected &&
                                                "border-[#2563EB] bg-[#E8F0FE] text-[#0B57D0] ring-2 ring-[#2563EB]/20",
                                        )}
                                        type="button"
                                        onClick={() =>
                                            form.setValue(
                                                "icon",
                                                choice.value,
                                                { shouldValidate: true },
                                            )
                                        }
                                    >
                                        <Icon className="h-4 w-4" aria-hidden />
                                    </button>
                                );
                            })}
                        </div>
                    </FieldError>
                    {isModal && (
                        <div className="flex items-center gap-2 pt-2 sm:hidden">
                            {editing && onDelete && (
                                <Button
                                    className="flex-1 border-red-300 bg-white text-destructive md:hover:bg-red-50"
                                    type="button"
                                    variant="secondary"
                                    onClick={onDelete}
                                >
                                    Delete
                                </Button>
                            )}
                            <Button className="flex-1" type="submit">
                                {editing ? "Save category" : "Add category"}
                            </Button>
                        </div>
                    )}
                </CardContent>
                <div
                    className={cn(
                        "flex justify-end gap-2 px-4 pb-4",
                        isModal &&
                            "hidden items-center justify-between rounded-b-2xl border-t border-border bg-neutral-50 px-5 py-4 sm:flex",
                    )}
                >
                    {isModal && (
                        <Button
                            data-modal-close
                            type="button"
                            variant="secondary"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                    <div
                        className={cn(
                            "flex gap-2",
                            isModal && "ml-auto",
                        )}
                    >
                        {editing && onDelete && (
                            <Button
                                className="border-red-300 bg-white text-destructive md:hover:bg-red-50"
                                type="button"
                                variant="secondary"
                                onClick={onDelete}
                            >
                                Delete
                            </Button>
                        )}
                        <Button type="submit">
                            {!editing && (
                                <Plus className="h-4 w-4" aria-hidden />
                            )}
                            {editing ? "Save category" : "Add category"}
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}

export function CategoryList({
    categories,
    description,
    onDelete,
    onEdit,
    title,
}: {
    categories: Category[];
    description: string;
    onDelete: (id: string) => void;
    onEdit: (category: Category) => void;
    title: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <p className="text-sm leading-5 text-muted-foreground">
                    {description}
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {categories.length === 0 && (
                    <EmptyState
                        title="No categories yet"
                        description="Create categories to organize your transactions."
                    />
                )}
                {categories.map((category) => (
                    <div
                        key={category.id}
                        className="flex items-center justify-between gap-3 rounded-md border bg-white p-3"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <CategoryIconBadge category={category} />
                            <span className="truncate text-sm font-medium leading-5">
                                {category.name}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(category)}
                            >
                                <Edit3 className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Edit category</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(category.id)}
                            >
                                <Trash2 className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Delete category</span>
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}












