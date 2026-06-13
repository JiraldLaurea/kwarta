"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart as RePieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { Budget, Category, Transaction } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, TransactionIcon } from "@/components/kwarta/shared";
import { BudgetProgressList } from "@/components/kwarta/budget-progress-list";

export function DashboardView({
    budgets,
    categories,
    cashflowData,
    spendingByCategory,
    transactions,
}: {
    budgets: Budget[];
    categories: Category[];
    cashflowData: Array<{ date: string; income: number; expense: number }>;
    spendingByCategory: Array<{ name: string; value: number; color: string }>;
    transactions: Transaction[];
}) {
    const expenses = transactions.filter(
        (transaction) => transaction.type === "expense",
    );

    return (
        <div className="grid gap-4 md:gap-5 lg:grid-cols-[1.4fr_0.6fr]">
            <BudgetProgressList
                budgets={budgets}
                categories={categories}
                transactions={expenses}
            />

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Spending</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Expense mix by category
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    {spendingByCategory.length > 0 ? (
                        <div>
                            <div className="h-56 md:h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={spendingByCategory}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={56}
                                            outerRadius={86}
                                            paddingAngle={3}
                                        >
                                            {spendingByCategory.map((entry) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={entry.color}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) =>
                                                formatCurrency(Number(value))
                                            }
                                        />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                                {spendingByCategory.map((entry) => (
                                    <div
                                        key={entry.name}
                                        className="flex min-w-0 items-center gap-2 text-sm leading-5"
                                    >
                                        <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: entry.color,
                                            }}
                                        />
                                        <span className="truncate">
                                            {entry.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            className="flex h-56 flex-col items-center justify-center md:h-72"
                            title="No spending yet"
                            description="Expense transactions will appear here by category."
                        />
                    )}
                </CardContent>
            </Card>

            <CashflowCard cashflowData={cashflowData} />
            <RecentTransactions
                categories={categories}
                transactions={transactions.slice(0, 6)}
            />
        </div>
    );
}

function CashflowCard({
    cashflowData,
}: {
    cashflowData: Array<{ date: string; income: number; expense: number }>;
}) {
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <div>
                    <CardTitle>Cashflow</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Income and expenses by transaction date
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                {cashflowData.length > 0 ? (
                    <div className="h-56 md:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cashflowData}>
                                <CartesianGrid
                                    stroke="#E5E7EB"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis tickLine={false} axisLine={false} />
                                <Tooltip
                                    content={<CashflowTooltip />}
                                    cursor={{ fill: "#E5E5E5" }}
                                    wrapperStyle={{ outline: "none" }}
                                />
                                <Bar
                                    dataKey="income"
                                    fill="#171717"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="expense"
                                    fill="#2563EB"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <EmptyState
                        className="flex h-56 flex-col items-center justify-center md:h-72"
                        title="No cashflow yet"
                        description="Add your first transaction to populate this chart."
                    />
                )}
            </CardContent>
        </Card>
    );
}

function CashflowTooltip({
    active,
    label,
}: {
    active?: boolean;
    label?: string | number;
}) {
    if (!active || !label) {
        return null;
    }

    return (
        <div className="pointer-events-none relative rounded-md border border-border bg-white px-3 py-2 text-sm leading-5 text-foreground shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
            <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-border bg-white" />
            {label}
        </div>
    );
}

function RecentTransactions({
    categories,
    transactions,
}: {
    categories: Category[];
    transactions: Transaction[];
}) {
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Latest income and expense entries.
                </p>
            </CardHeader>
            <CardContent
                className={cn(transactions.length === 0 && "flex flex-1")}
            >
                {transactions.length === 0 ? (
                    <EmptyState
                        className="flex min-h-48 flex-1 flex-col items-center justify-center md:min-h-72"
                        title="No activity yet"
                        description="New transactions will appear here."
                    />
                ) : (
                    <div className="space-y-3">
                        {transactions.map((transaction) => {
                            const category = categories.find(
                                (item) => item.id === transaction.categoryId,
                            );

                            return (
                                <div
                                    key={transaction.id}
                                    className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <TransactionIcon
                                            category={category}
                                            type={transaction.type}
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate font-medium leading-6">
                                                {transaction.subcategory}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {category?.name ??
                                                    "Uncategorized"}
                                            </p>
                                        </div>
                                    </div>
                                    <p
                                        className={cn(
                                            "shrink-0 font-medium",
                                            transaction.type === "income"
                                                ? "text-[#15803D]"
                                                : "text-[#DC2626]",
                                        )}
                                    >
                                        {transaction.type === "income"
                                            ? "+"
                                            : "-"}
                                        {formatCurrency(transaction.amount)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
