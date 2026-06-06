import type { Budget, Category, Transaction } from "@/lib/types";

export const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", color: "#171717" },
  { id: "freelance", name: "Freelance", type: "income", color: "#2563EB" },
  { id: "housing", name: "Housing", type: "expense", color: "#7C3AED" },
  { id: "food", name: "Food", type: "expense", color: "#16A34A" },
  { id: "transport", name: "Transport", type: "expense", color: "#F59E0B" },
  { id: "utilities", name: "Utilities", type: "expense", color: "#0891B2" },
  { id: "health", name: "Health", type: "expense", color: "#DC2626" },
  { id: "shopping", name: "Shopping", type: "expense", color: "#DB2777" },
  { id: "subscriptions", name: "Subscriptions", type: "expense", color: "#4F46E5" }
];

export const transactions: Transaction[] = [
];

export const budgets: Budget[] = [
];
