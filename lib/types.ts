export type TransactionType = "income" | "expense";

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
  merchant: string;
  note?: string;
  date: string;
};

export type Budget = {
  id: string;
  categoryId: string;
  limit: number;
  month: string;
};

export type AuthMode = "login" | "register";
