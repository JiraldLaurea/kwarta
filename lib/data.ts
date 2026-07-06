import type {
  Account,
  Budget,
  Category,
  Transaction,
  Transfer,
} from "@/lib/types";

export const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", color: "#257AC1", icon: "briefcase" },
  { id: "freelance", name: "Freelance", type: "income", color: "#25B9C1", icon: "laptop" },
  { id: "housing", name: "Housing", type: "expense", color: "#4F25C1", icon: "home" },
  { id: "food", name: "Food", type: "expense", color: "#25C18B", icon: "utensils" },
  { id: "transport", name: "Transport", type: "expense", color: "#C18A25", icon: "car" },
  { id: "utilities", name: "Utilities", type: "expense", color: "#25B9C1", icon: "zap" },
  { id: "health", name: "Health", type: "expense", color: "#C12539", icon: "heart-pulse" },
  { id: "shopping", name: "Shopping", type: "expense", color: "#C12588", icon: "shopping-bag" },
  { id: "subscriptions", name: "Subscriptions", type: "expense", color: "#253BC1", icon: "repeat" }
];

export const accounts: Account[] = [
  {
    id: "cash",
    name: "Cash",
    type: "cash",
    color: "#25C18B",
    icon: "banknote",
    openingBalance: 0,
    syncStatus: "manual"
  }
];

export const transactions: Transaction[] = [
];

export const transfers: Transfer[] = [
];

export const budgets: Budget[] = [
];
