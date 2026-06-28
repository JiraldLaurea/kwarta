export type TransactionType = "income" | "expense";
export type BudgetFrequency = "monthly" | "weekly" | "cycle" | "custom";

export type AccountType = "bank" | "ewallet" | "cash";

export type AccountSyncStatus = "manual" | "linked" | "syncing" | "error";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  icon: string;
  openingBalance: number;
  // API-ready fields for future bank/e-wallet aggregation. Unused while
  // accounts are managed manually, but persisted so a real aggregator
  // (e.g. Plaid, Brankas) can be layered on without a migration rewrite.
  provider?: string;
  externalId?: string;
  syncStatus?: AccountSyncStatus;
};

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId?: string;
  subcategory: string;
  note?: string;
  date: string;
  time: string;
};

export type Budget = {
  id: string;
  categoryId: string;
  frequency?: BudgetFrequency;
  limit: number;
  month: string;
  periodEnd?: string;
  periodStart?: string;
};

export type Transfer = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  fee: number;
  note?: string;
  date: string;
  time: string;
};

export type AuthMode = "login" | "register";
