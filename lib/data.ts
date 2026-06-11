import type { Budget, Category, Transaction } from "@/lib/types";

export const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", color: "#171717", icon: "briefcase" },
  { id: "freelance", name: "Freelance", type: "income", color: "#2563EB", icon: "laptop" },
  { id: "housing", name: "Housing", type: "expense", color: "#7C3AED", icon: "home" },
  { id: "food", name: "Food", type: "expense", color: "#16A34A", icon: "utensils" },
  { id: "transport", name: "Transport", type: "expense", color: "#F59E0B", icon: "car" },
  { id: "utilities", name: "Utilities", type: "expense", color: "#0891B2", icon: "zap" },
  { id: "health", name: "Health", type: "expense", color: "#DC2626", icon: "heart-pulse" },
  { id: "shopping", name: "Shopping", type: "expense", color: "#DB2777", icon: "shopping-bag" },
  { id: "subscriptions", name: "Subscriptions", type: "expense", color: "#4F46E5", icon: "repeat" }
];

export const transactions: Transaction[] = [
];

export const budgets: Budget[] = [
];
