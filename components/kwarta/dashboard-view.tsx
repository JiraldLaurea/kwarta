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
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/kwarta/shared";

export function DashboardView({
    cashflowData,
    spendingByCategory,
}: {
    budgets: Budget[];
    budgetsEnabled: boolean;
    categories: Category[];
    cashflowData: Array<{ date: string; income: number; expense: number }>;
    spendingByCategory: Array<{ name: string; value: number; color: string }>;
    transactions: Transaction[];
}) {
    return (
        <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
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
                                            contentStyle={{
                                                backgroundColor:
                                                    "hsl(var(--card))",
                                                borderColor:
                                                    "hsl(var(--border))",
                                                borderRadius: "6px",
                                                color: "hsl(var(--foreground))",
                                            }}
                                            itemStyle={{
                                                color: "hsl(var(--foreground))",
                                            }}
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
                                    stroke="hsl(var(--border))"
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
                                    cursor={{ fill: "hsl(var(--muted))" }}
                                    wrapperStyle={{ outline: "none" }}
                                />
                                <Bar
                                    dataKey="income"
                                    fill="hsl(var(--foreground))"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="expense"
                                    fill="hsl(var(--accent))"
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

