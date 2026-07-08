"use client";

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    LuArrowDown as ArrowDown,
    LuArrowUp as ArrowUp,
    LuMinus as Minus,
} from "react-icons/lu";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/kwarta/shared";

export type TrendPoint = {
    month: string;
    income: number;
    expense: number;
    net: number;
};

export type BudgetVsActualItem = {
    name: string;
    color: string;
    spent: number;
    limit: number;
};

export type CategoryComparisonItem = {
    name: string;
    color: string;
    current: number;
    previous: number;
};

export type FinancialHealth = {
    savingsRate: number | null;
    avgPerDay: number;
    projected: number | null;
    biggest: { amount: number; category: string } | null;
};

const INCOME_COLOR = "#16A34A";
const EXPENSE_COLOR = "#DC2626";

function formatCompactCurrency(value: number) {
    return new Intl.NumberFormat("en-PH", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);
}

export function DashboardView({
    budgetVsActual,
    budgetsEnabled,
    categoryComparison,
    financialHealth,
    trendData,
}: {
    budgetVsActual: BudgetVsActualItem[];
    budgetsEnabled: boolean;
    categoryComparison: CategoryComparisonItem[];
    financialHealth: FinancialHealth;
    trendData: TrendPoint[];
}) {
    return (
        <div className="space-y-4 md:space-y-5">
            <FinancialHealthCard health={financialHealth} />
            <TrendCard data={trendData} />
            <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
                <BudgetVsActualCard
                    budgetsEnabled={budgetsEnabled}
                    items={budgetVsActual}
                />
                <PeriodComparisonCard items={categoryComparison} />
            </div>
        </div>
    );
}

function FinancialHealthCard({ health }: { health: FinancialHealth }) {
    const savingsRateLabel =
        health.savingsRate === null
            ? "—"
            : `${Math.round(health.savingsRate * 100)}%`;
    const savingsRatePositive =
        health.savingsRate !== null && health.savingsRate >= 0;

    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Financial health</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Key indicators for this period
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Stat
                        label="Savings rate"
                        value={savingsRateLabel}
                        valueClassName={
                            health.savingsRate === null
                                ? undefined
                                : savingsRatePositive
                                  ? "text-green-600"
                                  : "text-red-600"
                        }
                    />
                    <Stat
                        label="Avg / day"
                        value={formatCurrency(health.avgPerDay)}
                    />
                    <Stat
                        label="Projected spend"
                        value={
                            health.projected === null
                                ? "—"
                                : formatCurrency(health.projected)
                        }
                    />
                    <Stat
                        label="Biggest expense"
                        value={
                            health.biggest
                                ? formatCurrency(health.biggest.amount)
                                : "—"
                        }
                        sub={health.biggest?.category}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function Stat({
    label,
    value,
    sub,
    valueClassName,
}: {
    label: string;
    value: string;
    sub?: string;
    valueClassName?: string;
}) {
    return (
        <div className="min-w-0">
            <p className="truncate text-xs font-medium leading-4 text-muted-foreground">
                {label}
            </p>
            <p
                className={cn(
                    "mt-1 truncate text-lg font-semibold leading-6",
                    valueClassName,
                )}
            >
                {value}
            </p>
            {sub ? (
                <p className="truncate text-xs leading-4 text-muted-foreground">
                    {sub}
                </p>
            ) : null}
        </div>
    );
}

function TrendCard({ data }: { data: TrendPoint[] }) {
    const hasData = data.some(
        (point) => point.income !== 0 || point.expense !== 0,
    );

    return (
        <Card>
            <CardHeader>
                <div>
                    <CardTitle>Trends</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Income, expenses, and net over the last 6 months
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                {hasData ? (
                    <div>
                        <div className="h-56 md:h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={data}
                                    margin={{
                                        top: 8,
                                        right: 8,
                                        bottom: 0,
                                        left: 0,
                                    }}
                                >
                                    <CartesianGrid
                                        stroke="hsl(var(--border))"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="month"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 12 }}
                                        width={44}
                                        tickFormatter={(value) =>
                                            formatCompactCurrency(Number(value))
                                        }
                                    />
                                    <Tooltip
                                        content={<TrendTooltip />}
                                        cursor={{
                                            stroke: "hsl(var(--border))",
                                        }}
                                        wrapperStyle={{ outline: "none" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="income"
                                        stroke={INCOME_COLOR}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="expense"
                                        stroke={EXPENSE_COLOR}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="net"
                                        stroke="hsl(var(--foreground))"
                                        strokeWidth={2}
                                        strokeDasharray="4 4"
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm leading-5">
                            <LegendDot color={INCOME_COLOR} label="Income" />
                            <LegendDot color={EXPENSE_COLOR} label="Expenses" />
                            <LegendDot
                                color="hsl(var(--foreground))"
                                label="Net"
                            />
                        </div>
                    </div>
                ) : (
                    <EmptyState
                        className="flex h-56 flex-col items-center justify-center md:h-72"
                        title="Not enough history yet"
                        description="Add transactions across a few months to see your trend."
                    />
                )}
            </CardContent>
        </Card>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
            />
            <span>{label}</span>
        </div>
    );
}

function TrendTooltip({
    active,
    label,
    payload,
}: {
    active?: boolean;
    label?: string | number;
    payload?: Array<{ dataKey?: string | number; value?: number }>;
}) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const lookup = new Map(
        payload.map((entry) => [String(entry.dataKey), entry.value ?? 0]),
    );

    return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm leading-5 text-foreground shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
            <p className="mb-1 font-medium">{label}</p>
            <TooltipRow
                color={INCOME_COLOR}
                label="Income"
                value={lookup.get("income") ?? 0}
            />
            <TooltipRow
                color={EXPENSE_COLOR}
                label="Expenses"
                value={lookup.get("expense") ?? 0}
            />
            <TooltipRow
                color="hsl(var(--foreground))"
                label="Net"
                value={lookup.get("net") ?? 0}
            />
        </div>
    );
}

function TooltipRow({
    color,
    label,
    value,
}: {
    color: string;
    label: string;
    value: number;
}) {
    return (
        <div className="flex items-center gap-2">
            <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground">{label}</span>
            <span className="ml-auto font-medium tabular-nums">
                {formatCurrency(value)}
            </span>
        </div>
    );
}

function BudgetVsActualCard({
    budgetsEnabled,
    items,
}: {
    budgetsEnabled: boolean;
    items: BudgetVsActualItem[];
}) {
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <div>
                    <CardTitle>Budget vs. actual</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        How your spending tracks against each limit
                    </p>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                {!budgetsEnabled ? (
                    <EmptyState
                        className="flex h-full min-h-40 flex-col items-center justify-center"
                        title="Budgets are off"
                        description="Turn budgets on in Settings to track spending against limits."
                    />
                ) : items.length === 0 ? (
                    <EmptyState
                        className="flex h-full min-h-40 flex-col items-center justify-center"
                        title="No budgets set"
                        description="Set a budget on a category to see it tracked here."
                    />
                ) : (
                    <div className="space-y-4">
                        {items.map((item) => {
                            const pct =
                                item.limit > 0 ? item.spent / item.limit : 0;
                            const over = item.spent > item.limit;

                            return (
                                <div key={item.name}>
                                    <div className="flex items-center justify-between text-sm leading-5">
                                        <span className="min-w-0 truncate font-medium">
                                            {item.name}
                                        </span>
                                        <span
                                            className={cn(
                                                "ml-2 shrink-0 tabular-nums",
                                                over
                                                    ? "font-medium text-red-600"
                                                    : "text-muted-foreground",
                                            )}
                                        >
                                            {Math.round(pct * 100)}%
                                        </span>
                                    </div>
                                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${Math.min(pct, 1) * 100}%`,
                                                backgroundColor: over
                                                    ? EXPENSE_COLOR
                                                    : item.color,
                                            }}
                                        />
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-xs leading-4 text-muted-foreground">
                                        <span className="tabular-nums">
                                            {formatCurrency(item.spent)} of{" "}
                                            {formatCurrency(item.limit)}
                                        </span>
                                        <span
                                            className={cn(
                                                "ml-2 shrink-0 tabular-nums",
                                                over &&
                                                    "font-medium text-red-600",
                                            )}
                                        >
                                            {over
                                                ? `${formatCurrency(item.spent - item.limit)} over`
                                                : `${formatCurrency(item.limit - item.spent)} left`}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function PeriodComparisonCard({
    items,
}: {
    items: CategoryComparisonItem[];
}) {
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <div>
                    <CardTitle>Vs. last period</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Top spending categories and how they changed
                    </p>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                {items.length === 0 ? (
                    <EmptyState
                        className="flex h-full min-h-40 flex-col items-center justify-center"
                        title="No spending yet"
                        description="Expenses this period will be ranked and compared here."
                    />
                ) : (
                    <ul className="space-y-3">
                        {items.map((item) => (
                            <li
                                key={item.name}
                                className="flex items-center gap-3"
                            >
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium leading-5">
                                    {item.name}
                                </span>
                                <span className="shrink-0 text-sm tabular-nums leading-5">
                                    {formatCurrency(item.current)}
                                </span>
                                <ChangeBadge
                                    current={item.current}
                                    previous={item.previous}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function ChangeBadge({
    current,
    previous,
}: {
    current: number;
    previous: number;
}) {
    if (previous === 0) {
        return (
            <span className="flex w-16 shrink-0 items-center justify-end text-xs font-medium leading-4 text-amber-600">
                New
            </span>
        );
    }

    const delta = (current - previous) / previous;
    const pct = Math.round(Math.abs(delta) * 100);

    if (pct === 0) {
        return (
            <span className="flex w-16 shrink-0 items-center justify-end gap-0.5 text-xs leading-4 text-muted-foreground">
                <Minus className="h-3 w-3" aria-hidden />
                0%
            </span>
        );
    }

    // Rising expenses are unfavorable (red); falling expenses are favorable
    // (green).
    const rising = delta > 0;

    return (
        <span
            className={cn(
                "flex w-16 shrink-0 items-center justify-end gap-0.5 text-xs font-medium leading-4 tabular-nums",
                rising ? "text-red-600" : "text-green-600",
            )}
        >
            {rising ? (
                <ArrowUp className="h-3 w-3" aria-hidden />
            ) : (
                <ArrowDown className="h-3 w-3" aria-hidden />
            )}
            {pct}%
        </span>
    );
}
