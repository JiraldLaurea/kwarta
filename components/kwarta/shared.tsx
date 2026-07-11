"use client";

import { type User } from "@supabase/supabase-js";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
import {
    LuCalendar as Calendar,
    LuCheck as Check,
    LuChevronLeft as ChevronLeft,
    LuChevronRight as ChevronRight,
    LuDelete as Delete,
    LuMinus as Minus,
    LuPencil as Pencil,
    LuPlus as Plus,
    LuReceipt as Receipt,
} from "react-icons/lu";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { IconType } from "react-icons";
import { FaCar } from "react-icons/fa";
import {
    FaBagShopping,
    FaBolt,
    FaBriefcase,
    FaBuilding,
    FaClapperboard,
    FaGraduationCap,
    FaHeartPulse,
    FaHouse,
    FaLaptop,
    FaMobileScreenButton,
    FaMoneyBill,
    FaPiggyBank,
    FaReceipt,
    FaWallet,
} from "react-icons/fa6";
import { FiRepeat } from "react-icons/fi";
import { IoFastFood } from "react-icons/io5";
import { RemoveScroll } from "react-remove-scroll";
import type { Category, TransactionType } from "@/lib/types";
import {
    getAccountProvider,
    getProviderLogoSrc,
} from "@/lib/kwarta/account-providers";
import { cn } from "@/lib/utils";
import {
    formatPickerDate,
    formatPeriodLabel,
    createBudgetCyclePeriod,
    createMonthlyPeriod,
    createWeeklyPeriod,
    getBudgetCycleRange,
    getCalendarDays,
    getPeriodMonth,
    getWeekRange,
    isSameDay,
    parseDateValue,
    parseMonthValue,
    toDateInputValue,
    toMonthInputValue,
    type BudgetCycleSettings,
    type PeriodFrequency,
    type SelectedPeriod,
} from "@/lib/kwarta/helpers";
import {
    LOGO_MARK_DATA_URI,
    LOGO_MARK_DATA_URI_DARK,
} from "@/lib/kwarta/logo-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

// Deeper tones of the eight accent hues (see accentThemeOptions). Categories
// render as solid chips with a white icon, so the palette is stored at a depth
// that keeps a white glyph legible while sharing the accent hue family. The
// picker swatch, the icon badge, and progress bars all use this exact value.
export const colorChoices = [
    "#25C18B", // green
    "#25B9C1", // teal
    "#257AC1", // blue
    "#253BC1", // indigo
    "#4F25C1", // purple
    "#C12588", // rose
    "#C18A25", // amber
    "#C12539", // pink
];

export const categoryIconChoices = [
    { value: "home", label: "Home", icon: FaHouse },
    { value: "utensils", label: "Food", icon: IoFastFood },
    { value: "car", label: "Transport", icon: FaCar },
    { value: "zap", label: "Utilities", icon: FaBolt },
    { value: "heart-pulse", label: "Health", icon: FaHeartPulse },
    { value: "shopping-bag", label: "Shopping", icon: FaBagShopping },
    { value: "repeat", label: "Subscriptions", icon: FiRepeat },
    { value: "briefcase", label: "Work", icon: FaBriefcase },
    { value: "laptop", label: "Freelance", icon: FaLaptop },
    { value: "banknote", label: "Cash", icon: FaMoneyBill },
    { value: "landmark", label: "Bank", icon: FaBuilding },
    { value: "piggy-bank", label: "Savings", icon: FaPiggyBank },
    { value: "receipt", label: "Bills", icon: FaReceipt },
    { value: "smartphone", label: "Phone", icon: FaMobileScreenButton },
    { value: "graduation-cap", label: "Education", icon: FaGraduationCap },
    { value: "clapperboard", label: "Entertainment", icon: FaClapperboard },
    { value: "wallet", label: "Wallet", icon: FaWallet },
] satisfies Array<{ value: string; label: string; icon: IconType }>;

export function PageHeader({
    actions,
    description,
    title,
}: {
    actions?: React.ReactNode;
    description: string;
    title: string;
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 className="text-xl font-semibold leading-7">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {actions}
        </div>
    );
}

const categoryIconMap = new Map<string, IconType>(
    categoryIconChoices.map((choice) => [choice.value, choice.icon]),
);
categoryIconMap.set("badge-dollar-sign", FaMoneyBill);

export function DatePickerInput({
    ariaLabel,
    displayTodayLabel = false,
    label,
    id,
    onChange,
    popoverAlign = "left",
    value,
}: {
    ariaLabel?: string;
    displayTodayLabel?: boolean;
    label?: string;
    id?: string;
    onChange: (value: string) => void;
    popoverAlign?: "left" | "right";
    value: string;
}) {
    const selectedDate = parseDateValue(value);
    const selectedLabel =
        label ??
        (displayTodayLabel && isSameDay(selectedDate, new Date())
            ? "Today"
            : formatPickerDate(selectedDate));
    const selectedYear = selectedDate.getFullYear();
    const selectedMonthIndex = selectedDate.getMonth();
    const [isOpen, setIsOpen] = useState(false);
    const [popoverSide, setPopoverSide] = useState<"above" | "below">("below");
    const [visibleMonth, setVisibleMonth] = useState(
        new Date(selectedYear, selectedMonthIndex, 1),
    );
    const pickerRef = useRef<HTMLDivElement>(null);
    const days = getCalendarDays(visibleMonth);

    useEffect(() => {
        setVisibleMonth(new Date(selectedYear, selectedMonthIndex, 1));
    }, [selectedMonthIndex, selectedYear]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [isOpen]);

    function changeMonth(offset: number) {
        setVisibleMonth(
            (current) =>
                new Date(current.getFullYear(), current.getMonth() + offset, 1),
        );
    }

    function togglePicker() {
        if (!isOpen) {
            setPopoverSide(getPopoverSide(pickerRef.current, 390));
        }

        setIsOpen((open) => !open);
    }

    function selectToday() {
        onChange(toDateInputValue(new Date()));
        setIsOpen(false);
    }

    return (
        <div className="relative" ref={pickerRef}>
            <Button
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-label={ariaLabel}
                className={cn(
                    "w-full justify-start rounded-xl px-3 text-left font-normal md:hover:bg-card",
                    isOpen && "border-ring ring-2 ring-ring/20",
                )}
                type="button"
                variant="secondary"
                onClick={togglePicker}
            >
                <Calendar className="h-4 w-4" aria-hidden />
                {selectedLabel}
            </Button>
            {isOpen && (
                <div
                    className={cn(
                        "absolute z-[70] w-full min-w-[312px] rounded-2xl border border-border bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)]",
                        popoverAlign === "right" ? "right-0" : "left-0",
                        popoverSide === "above"
                            ? "bottom-full mb-2"
                            : "top-full mt-2",
                    )}
                >
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-base font-medium leading-6">
                            {visibleMonth.toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                            })}
                        </p>
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => changeMonth(-1)}
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Previous month</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => changeMonth(1)}
                            >
                                <ChevronRight className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Next month</span>
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        {["S", "M", "T", "W", "T", "F", "S"].map((weekday) => (
                            <span
                                key={weekday}
                                className="py-2 text-muted-foreground"
                            >
                                {weekday}
                            </span>
                        ))}
                        {days.map((date) => {
                            const dateValue = toDateInputValue(date);
                            const isCurrentMonth =
                                date.getMonth() === visibleMonth.getMonth();
                            const isSelected = isSameDay(date, selectedDate);

                            return (
                                <button
                                    className={cn(
                                        "h-9 rounded-md text-sm transition-colors md:hover:bg-[hsl(var(--hover-surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        !isCurrentMonth &&
                                            "text-muted-foreground/60",
                                        isSelected &&
                                            "bg-accent text-accent-foreground md:hover:bg-accent",
                                    )}
                                    key={dateValue}
                                    type="button"
                                    onClick={() => {
                                        onChange(dateValue);
                                        setIsOpen(false);
                                    }}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-3">
                        <Button
                            className="w-full justify-center"
                            type="button"
                            variant="secondary"
                            onClick={selectToday}
                        >
                            Today
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function MonthPickerInput({
    ariaLabel,
    compact = false,
    id,
    mobileFullWidth = false,
    onChange,
    triggerClassName,
    value,
}: {
    ariaLabel?: string;
    compact?: boolean;
    id?: string;
    mobileFullWidth?: boolean;
    onChange: (value: string) => void;
    triggerClassName?: string;
    value: string;
}) {
    const selectedMonth = parseMonthValue(value);
    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthIndex = selectedMonth.getMonth();
    const [isOpen, setIsOpen] = useState(false);
    const [visibleYear, setVisibleYear] = useState(selectedYear);
    const [popoverSide, setPopoverSide] = useState<"above" | "below">("below");
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setVisibleYear(selectedYear);
    }, [selectedYear]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [isOpen]);

    function togglePicker() {
        if (!isOpen) {
            setPopoverSide(getPopoverSide(pickerRef.current, 280));
        }

        setIsOpen((open) => !open);
    }

    function selectThisMonth() {
        onChange(toMonthInputValue(new Date()));
        setIsOpen(false);
    }

    return (
        <div className="relative" ref={pickerRef}>
            <Button
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-label={ariaLabel}
                className={cn(
                    "w-full justify-start rounded-xl px-3 text-left font-normal md:hover:bg-card",
                    compact &&
                        "rounded-full border-0 bg-accent-muted text-accent-muted-foreground shadow-none md:hover:bg-accent-muted",
                    isOpen && "border-ring ring-2 ring-ring/20",
                    triggerClassName,
                )}
                id={id}
                type="button"
                variant={compact ? "ghost" : "secondary"}
                onClick={togglePicker}
            >
                <Calendar className="h-4 w-4" aria-hidden />
                {selectedMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                })}
            </Button>
            {isOpen && (
                <div
                    className={cn(
                        mobileFullWidth
                            ? "fixed left-4 right-4 z-[70] w-auto min-w-0 rounded-2xl border border-border bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)] sm:absolute sm:left-0 sm:w-auto sm:min-w-[210px]"
                            : "absolute left-0 z-[70] w-auto min-w-[210px] rounded-2xl border border-border bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)]",
                        popoverSide === "above"
                            ? "bottom-full mb-2"
                            : "top-full mt-2",
                    )}
                >
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-base font-medium leading-6">
                            {visibleYear}
                        </p>
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setVisibleYear((year) => year - 1)
                                }
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Previous year</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setVisibleYear((year) => year + 1)
                                }
                            >
                                <ChevronRight className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Next year</span>
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 12 }, (_, monthIndex) => {
                            const monthDate = new Date(
                                visibleYear,
                                monthIndex,
                                1,
                            );
                            const isSelected =
                                selectedYear === visibleYear &&
                                selectedMonthIndex === monthIndex;

                            return (
                                <button
                                    className={cn(
                                        "h-10 rounded-md text-sm transition-colors md:hover:bg-[hsl(var(--hover-surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        isSelected &&
                                            "bg-accent text-accent-foreground md:hover:bg-accent",
                                    )}
                                    key={monthDate.toISOString()}
                                    type="button"
                                    onClick={() => {
                                        onChange(toMonthInputValue(monthDate));
                                        setIsOpen(false);
                                    }}
                                >
                                    {monthDate.toLocaleDateString("en-US", {
                                        month: "short",
                                    })}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-3">
                        <Button
                            className="w-full justify-center"
                            type="button"
                            variant="secondary"
                            onClick={selectThisMonth}
                        >
                            This month
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function PeriodSelector({
    budgetCycleSettings,
    onBudgetCycleSettingsChange,
    onChange,
    value,
}: {
    budgetCycleSettings: BudgetCycleSettings;
    onBudgetCycleSettingsChange: (value: BudgetCycleSettings) => void;
    onChange: (value: SelectedPeriod) => void;
    value: SelectedPeriod;
}) {
    function handleFrequencyChange(nextFrequency: string) {
        const frequency = nextFrequency as PeriodFrequency;

        if (frequency === "monthly") {
            onChange(createMonthlyPeriod(getPeriodMonth(value)));
            return;
        }

        if (frequency === "weekly") {
            onChange(createWeeklyPeriod(toDateInputValue(new Date())));
            return;
        }

        if (frequency === "cycle") {
            onChange(
                createBudgetCyclePeriod(
                    toDateInputValue(new Date()),
                    budgetCycleSettings,
                ),
            );
            return;
        }
    }

    return (
        <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="w-[7.5rem] shrink-0 sm:w-32">
                <Select
                    aria-label="Select period frequency"
                    onValueChange={handleFrequencyChange}
                    options={[
                        { label: "Monthly", value: "monthly" },
                        { label: "Weekly", value: "weekly" },
                        { label: "Cycle", value: "cycle" },
                    ]}
                    triggerClassName="h-11 rounded-xl"
                    value={value.frequency}
                />
            </div>
            {value.frequency === "monthly" && (
                <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
                    <MonthPickerInput
                        ariaLabel="Select month"
                        mobileFullWidth
                        triggerClassName="h-11 rounded-xl"
                        value={getPeriodMonth(value)}
                        onChange={(month) =>
                            onChange(createMonthlyPeriod(month))
                        }
                    />
                </div>
            )}
            {value.frequency === "weekly" && (
                <div className="min-w-0 flex-1 sm:w-64 sm:flex-none">
                    <WeekPickerInput
                        triggerClassName="h-11 rounded-xl"
                        value={value.startDate}
                        onChange={(date) => onChange(createWeeklyPeriod(date))}
                    />
                </div>
            )}
            {value.frequency === "cycle" && (
                <div className="min-w-0 flex-1 sm:w-64 sm:flex-none">
                    <BudgetCyclePickerInput
                        settings={budgetCycleSettings}
                        triggerClassName="h-11 rounded-xl"
                        value={value.startDate}
                        onSettingsChange={(settings) => {
                            onBudgetCycleSettingsChange(settings);

                            if (value.frequency === "cycle") {
                                onChange(
                                    createBudgetCyclePeriod(
                                        value.startDate,
                                        settings,
                                    ),
                                );
                            }
                        }}
                        onChange={(date) =>
                            onChange(
                                createBudgetCyclePeriod(
                                    date,
                                    budgetCycleSettings,
                                ),
                            )
                        }
                    />
                </div>
            )}
            <span className="sr-only">{formatPeriodLabel(value)}</span>
        </div>
    );
}

export function BudgetCyclePickerInput({
    onChange,
    onSettingsChange,
    settings,
    triggerClassName,
    value,
}: {
    onChange: (value: string) => void;
    onSettingsChange?: (value: BudgetCycleSettings) => void;
    settings: BudgetCycleSettings;
    triggerClassName?: string;
    value: string;
}) {
    const selectedCycle = getBudgetCycleRange(value, settings);
    const selectedStart = parseDateValue(selectedCycle.startDate);
    const selectedStartYear = selectedStart.getFullYear();
    const selectedStartMonth = selectedStart.getMonth();
    const [isOpen, setIsOpen] = useState(false);
    const [popoverSide, setPopoverSide] = useState<"above" | "below">("below");
    const [visibleMonth, setVisibleMonth] = useState(
        new Date(selectedStartYear, selectedStartMonth, 1),
    );
    const [isEditingCycle, setIsEditingCycle] = useState(false);
    const [draftFirstStartDay, setDraftFirstStartDay] = useState(
        String(settings.firstStartDay),
    );
    const [draftSecondStartDay, setDraftSecondStartDay] = useState(
        String(settings.secondStartDay),
    );
    const pickerRef = useRef<HTMLDivElement>(null);
    const selectedLabel = formatPeriodLabel({
        frequency: "cycle",
        ...selectedCycle,
    });
    const firstCycle = getBudgetCycleRange(
        toDateInputValue(
            new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth(),
                settings.firstStartDay,
            ),
        ),
        settings,
    );
    const secondCycle = getBudgetCycleRange(
        toDateInputValue(
            new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth(),
                settings.secondStartDay,
            ),
        ),
        settings,
    );

    useEffect(() => {
        setVisibleMonth(new Date(selectedStartYear, selectedStartMonth, 1));
    }, [selectedStartMonth, selectedStartYear]);

    useEffect(() => {
        setDraftFirstStartDay(String(settings.firstStartDay));
        setDraftSecondStartDay(String(settings.secondStartDay));
    }, [settings.firstStartDay, settings.secondStartDay]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [isOpen]);

    function changeMonth(offset: number) {
        setVisibleMonth(
            (current) =>
                new Date(current.getFullYear(), current.getMonth() + offset, 1),
        );
    }

    function togglePicker() {
        if (!isOpen) {
            setPopoverSide(getPopoverSide(pickerRef.current, 260));
        }

        setIsOpen((open) => !open);
    }

    function selectCycle(cycle: SelectedPeriod) {
        onChange(cycle.startDate);
        setIsOpen(false);
    }

    function selectThisCycle() {
        onChange(toDateInputValue(new Date()));
        setIsOpen(false);
    }

    function applyCycleSettings() {
        const firstStartDay = Number(draftFirstStartDay);
        const secondStartDay = Number(draftSecondStartDay);

        if (
            !Number.isFinite(firstStartDay) ||
            !Number.isFinite(secondStartDay) ||
            firstStartDay < 1 ||
            secondStartDay > 28 ||
            firstStartDay >= secondStartDay
        ) {
            return;
        }

        onSettingsChange?.({
            firstStartDay,
            secondStartDay,
        });
        setIsEditingCycle(false);
    }

    return (
        <div className="relative" ref={pickerRef}>
            <Button
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-label="Select budget cycle"
                className={cn(
                    "w-full justify-start rounded-xl px-3 text-left font-normal md:hover:bg-card",
                    isOpen && "border-ring ring-2 ring-ring/20",
                    triggerClassName,
                )}
                type="button"
                variant="secondary"
                onClick={togglePicker}
            >
                <Calendar className="h-4 w-4" aria-hidden />
                {selectedLabel}
            </Button>
            {isOpen && (
                <div
                    className={cn(
                        "fixed left-4 right-4 z-[70] w-auto min-w-0 rounded-2xl border border-border bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)] sm:absolute sm:left-0 sm:w-full sm:min-w-[344px]",
                        popoverSide === "above"
                            ? "bottom-full mb-2"
                            : "top-full mt-2",
                    )}
                >
                    {!isEditingCycle && (
                        <div className="mb-4 flex items-center justify-between">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => changeMonth(-1)}
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Previous month</span>
                            </Button>
                            <p className="text-base font-medium leading-6">
                                {visibleMonth.toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => changeMonth(1)}
                            >
                                <ChevronRight className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Next month</span>
                            </Button>
                        </div>
                    )}
                    {isEditingCycle ? (
                        <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-2">
                                <label className="grid gap-2 text-sm font-medium">
                                    1st cycle
                                    <input
                                        className="h-11 rounded-md border border-border px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                        inputMode="numeric"
                                        max={27}
                                        min={1}
                                        type="number"
                                        value={draftFirstStartDay}
                                        onChange={(event) =>
                                            setDraftFirstStartDay(
                                                event.currentTarget.value,
                                            )
                                        }
                                    />
                                </label>
                                <label className="grid gap-2 text-sm font-medium">
                                    2nd cycle
                                    <input
                                        className="h-11 rounded-md border border-border px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                        inputMode="numeric"
                                        max={28}
                                        min={2}
                                        type="number"
                                        value={draftSecondStartDay}
                                        onChange={(event) =>
                                            setDraftSecondStartDay(
                                                event.currentTarget.value,
                                            )
                                        }
                                    />
                                </label>
                            </div>
                            <p className="text-sm leading-5 text-muted-foreground">
                                The second cycle ends the day before the first
                                cycle starts next month.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setDraftFirstStartDay(
                                            String(settings.firstStartDay),
                                        );
                                        setDraftSecondStartDay(
                                            String(settings.secondStartDay),
                                        );
                                        setIsEditingCycle(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={applyCycleSettings}
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {[firstCycle, secondCycle].map((cycle) => {
                                const isSelected =
                                    cycle.startDate ===
                                        selectedCycle.startDate &&
                                    cycle.endDate === selectedCycle.endDate;

                                return (
                                    <button
                                        className={cn(
                                            "flex h-12 items-center justify-center rounded-md border border-border px-3 text-center text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hover:bg-[hsl(var(--hover-surface))]",
                                            isSelected &&
                                                "border-accent bg-accent text-accent-foreground md:hover:bg-accent",
                                        )}
                                        key={cycle.startDate}
                                        type="button"
                                        onClick={() =>
                                            selectCycle({
                                                frequency: "cycle",
                                                ...cycle,
                                            })
                                        }
                                    >
                                        {formatPeriodLabel({
                                            frequency: "cycle",
                                            ...cycle,
                                        })}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {!isEditingCycle && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button
                                className="w-full justify-center"
                                type="button"
                                variant="secondary"
                                onClick={() => setIsEditingCycle(true)}
                            >
                                <Pencil className="h-4 w-4" aria-hidden />
                                Edit cycle
                            </Button>
                            <Button
                                className="w-full justify-center"
                                type="button"
                                variant="secondary"
                                onClick={selectThisCycle}
                            >
                                This cycle
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function WeekPickerInput({
    onChange,
    triggerClassName,
    value,
}: {
    onChange: (value: string) => void;
    triggerClassName?: string;
    value: string;
}) {
    const selectedWeek = getWeekRange(value);
    const selectedStart = parseDateValue(selectedWeek.startDate);
    const selectedStartYear = selectedStart.getFullYear();
    const selectedStartMonth = selectedStart.getMonth();
    const [isOpen, setIsOpen] = useState(false);
    const [popoverSide, setPopoverSide] = useState<"above" | "below">("below");
    const [visibleMonth, setVisibleMonth] = useState(
        new Date(selectedStartYear, selectedStartMonth, 1),
    );
    const pickerRef = useRef<HTMLDivElement>(null);
    const days = getWeekPickerDays(visibleMonth);
    const selectedLabel = formatPeriodLabel({
        frequency: "weekly",
        ...selectedWeek,
    });

    useEffect(() => {
        setVisibleMonth(new Date(selectedStartYear, selectedStartMonth, 1));
    }, [selectedStartMonth, selectedStartYear]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [isOpen]);

    function changeMonth(offset: number) {
        setVisibleMonth(
            (current) =>
                new Date(current.getFullYear(), current.getMonth() + offset, 1),
        );
    }

    function togglePicker() {
        if (!isOpen) {
            setPopoverSide(getPopoverSide(pickerRef.current, 390));
        }

        setIsOpen((open) => !open);
    }

    function selectThisWeek() {
        onChange(toDateInputValue(new Date()));
        setIsOpen(false);
    }

    return (
        <div className="relative" ref={pickerRef}>
            <Button
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-label="Select week"
                className={cn(
                    "w-full justify-start rounded-xl px-3 text-left font-normal md:hover:bg-card",
                    isOpen && "border-ring ring-2 ring-ring/20",
                    triggerClassName,
                )}
                type="button"
                variant="secondary"
                onClick={togglePicker}
            >
                <Calendar className="h-4 w-4" aria-hidden />
                {selectedLabel}
            </Button>
            {isOpen && (
                <div
                    className={cn(
                        "fixed left-4 right-4 z-[70] w-auto min-w-0 rounded-2xl border border-border bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)] sm:absolute sm:left-0 sm:w-full sm:min-w-[344px]",
                        popoverSide === "above"
                            ? "bottom-full mb-2"
                            : "top-full mt-2",
                    )}
                >
                    <div className="mb-4 flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => changeMonth(-1)}
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Previous month</span>
                        </Button>
                        <p className="text-base font-medium leading-6">
                            {visibleMonth.toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                            })}
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => changeMonth(1)}
                        >
                            <ChevronRight className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Next month</span>
                        </Button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                            (weekday) => (
                                <span
                                    key={weekday}
                                    className="py-2 text-muted-foreground"
                                >
                                    {weekday}
                                </span>
                            ),
                        )}
                        {days.map((date) => {
                            const dateValue = toDateInputValue(date);
                            const isCurrentMonth =
                                date.getMonth() === visibleMonth.getMonth();
                            const isInWeek =
                                dateValue >= selectedWeek.startDate &&
                                dateValue <= selectedWeek.endDate;
                            const isWeekStart =
                                dateValue === selectedWeek.startDate;
                            const isWeekEnd =
                                dateValue === selectedWeek.endDate;
                            const isWeekMiddle =
                                isInWeek && !isWeekStart && !isWeekEnd;

                            return (
                                <button
                                    className={cn(
                                        "h-11 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        !isCurrentMonth &&
                                            "text-muted-foreground/50",
                                        isCurrentMonth &&
                                            "md:hover:bg-[hsl(var(--hover-surface))]",
                                        isWeekMiddle &&
                                            "md:hover:bg-accent-muted",
                                        (isWeekStart || isWeekEnd) &&
                                            "bg-accent font-medium text-accent-foreground md:hover:bg-accent",
                                    )}
                                    key={dateValue}
                                    style={
                                        isWeekMiddle
                                            ? {
                                                  backgroundColor:
                                                      "hsl(var(--accent-muted))",
                                                  color: "hsl(var(--accent-muted-foreground))",
                                              }
                                            : undefined
                                    }
                                    type="button"
                                    onClick={() => {
                                        onChange(dateValue);
                                        setIsOpen(false);
                                    }}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-3">
                        <Button
                            className="w-full justify-center"
                            type="button"
                            variant="secondary"
                            onClick={selectThisWeek}
                        >
                            This week
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function getWeekPickerDays(month: Date) {
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}

function getPopoverSide(element: HTMLElement | null, estimatedHeight: number) {
    if (!element) {
        return "below";
    }

    const rect = element.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    return spaceBelow < estimatedHeight && spaceAbove > spaceBelow
        ? "above"
        : "below";
}

type MobileModalMotion = "bottom" | "right";

export function useSwipeToClose(
    onClose: () => void,
    motion: MobileModalMotion = "bottom",
) {
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isSwipeDismissing, setIsSwipeDismissing] = useState(false);
    const touchStartRef = useRef<{
        x: number;
        y: number;
    } | null>(null);

    function isInteractiveTarget(target: EventTarget | null) {
        return (
            target instanceof HTMLElement &&
            Boolean(
                target.closest(
                    "button,input,select,textarea,[role='button'],[role='combobox'],[data-radix-select-trigger]",
                ),
            )
        );
    }

    return {
        onTouchStart(event: React.TouchEvent<HTMLElement>) {
            if (window.innerWidth >= 640 || event.touches.length !== 1) {
                touchStartRef.current = null;
                return;
            }

            if (isInteractiveTarget(event.target)) {
                touchStartRef.current = null;
                return;
            }

            const scrollContainer =
                event.target instanceof HTMLElement
                    ? event.target.closest<HTMLElement>(
                          "[data-bottom-sheet-scroll]",
                      )
                    : null;

            if (
                motion === "bottom" &&
                scrollContainer &&
                scrollContainer.scrollTop > 0
            ) {
                touchStartRef.current = null;
                return;
            }

            const touch = event.touches[0];

            touchStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
            };
        },
        onTouchMove(event: React.TouchEvent<HTMLElement>) {
            const start = touchStartRef.current;

            if (!start || window.innerWidth >= 640) {
                return;
            }

            const touch = event.touches[0];
            const deltaY = touch.clientY - start.y;
            const deltaX = touch.clientX - start.x;
            const primaryDelta = motion === "right" ? deltaX : deltaY;
            const crossDelta = motion === "right" ? deltaY : deltaX;

            if (primaryDelta <= 0 || Math.abs(crossDelta) > primaryDelta) {
                return;
            }

            event.preventDefault();
            setIsDragging(true);
            setDragOffset(primaryDelta);
        },
        onTouchEnd(event: React.TouchEvent<HTMLElement>) {
            const start = touchStartRef.current;
            touchStartRef.current = null;

            if (!start || window.innerWidth >= 640) {
                return;
            }

            const touch = event.changedTouches[0];
            const deltaY = touch.clientY - start.y;
            const deltaX = touch.clientX - start.x;
            const primaryDelta = motion === "right" ? deltaX : deltaY;
            const crossDelta = motion === "right" ? deltaY : deltaX;
            const isCloseSwipe =
                primaryDelta > 90 && Math.abs(crossDelta) < primaryDelta;

            if (isCloseSwipe) {
                setIsDragging(false);
                setIsSwipeDismissing(true);
                setDragOffset(
                    motion === "right" ? window.innerWidth : window.innerHeight,
                );
                window.setTimeout(onClose, 180);
                return;
            }

            setIsDragging(false);
            setDragOffset(0);
        },
        onTouchCancel() {
            touchStartRef.current = null;
            setIsDragging(false);
            setIsSwipeDismissing(false);
            setDragOffset(0);
        },
        dragOffset,
        isDragging,
        isSwipeDismissing,
    };
}

// Wraps an in-flow sub-page (e.g. Reports, Manage categories) so a rightward
// swipe on mobile navigates back. Vertical scrolling and taps on interactive
// elements are preserved (the underlying hook ignores those).
export function SwipeBackArea({
    children,
    className,
    onBack,
}: {
    children: React.ReactNode;
    className?: string;
    onBack: () => void;
}) {
    const {
        dragOffset,
        isDragging,
        isSwipeDismissing,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onTouchCancel,
    } = useSwipeToClose(onBack, "right");
    const transform = isSwipeDismissing
        ? "translateX(100%)"
        : isDragging
          ? `translateX(${dragOffset}px)`
          : undefined;

    return (
        <div
            className={className}
            style={{
                transform,
                transition: isDragging
                    ? "none"
                    : "transform 220ms cubic-bezier(0.22,1,0.36,1)",
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchCancel}
        >
            {children}
        </div>
    );
}

// Tracks the user's reduced-motion preference. SSR-safe: starts false on the
// server and first client render, then syncs to the media query.
function usePrefersReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setPrefersReducedMotion(query.matches);

        update();
        query.addEventListener("change", update);

        return () => query.removeEventListener("change", update);
    }, []);

    return prefersReducedMotion;
}

// Reactive viewport check matching the `sm` Tailwind breakpoint (640px).
// SSR-safe: starts false on the server and first client render.
export function useIsMobileViewport() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(max-width: 639px)");
        const update = () => setIsMobile(query.matches);

        update();
        query.addEventListener("change", update);

        return () => query.removeEventListener("change", update);
    }, []);

    return isMobile;
}

// Mobile-only bottom sheet: slides up from the bottom on mount, rounds its
// top corners, and can be dismissed by swiping down or tapping the backdrop.
// The caller's content stays mounted behind it (not replaced), so the
// backdrop dims real page content instead of a blank scrim.
// Mobile-only bottom sheet: slides up from the bottom on mount, rounds its
// top corners, and can be dismissed by swiping down or tapping the backdrop.
// The caller's content stays mounted behind it, so the backdrop dims real
// page content instead of a blank scrim.
//
// Also handles real native <input>/<textarea> fields safely: the on-screen
// keyboard opening triggers browser auto-scroll-into-view and visualViewport
// resize events that would otherwise fight this fixed, animated sheet (this
// is the exact failure mode plain full-page mobile forms were built to
// avoid) — the focus-aware scroll lock and pointer-capture handling below
// port that proven logic onto the sheet.
export function MobileBottomSheet({
    allowContentScroll = false,
    children,
    className,
    onOpenComplete,
    onClose,
}: {
    allowContentScroll?: boolean;
    children: React.ReactNode;
    className?: string;
    onOpenComplete?: () => void;
    onClose: () => void;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLButtonElement>(null);
    const [mounted, setMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const closingRef = useRef(false);
    // Where the page was scrolled to when the sheet opened, so locking the
    // background scroll holds it there instead of snapping to the top.
    const lockedScrollPositionRef = useRef({ x: 0, y: 0 });

    const requestClose = useCallback(() => {
        if (closingRef.current) {
            return;
        }

        closingRef.current = true;
        setIsVisible(false);
    }, []);

    // Scheduled here (rather than inline in requestClose) so the timer is
    // tied to this instance's effect lifecycle: if the sheet is keyed to
    // different content and this instance unmounts mid-close, the cleanup
    // cancels the pending close instead of leaving a stale timer that would
    // later fire onClose against whatever content replaced it.
    useEffect(() => {
        if (!closingRef.current) {
            return;
        }

        const timeout = window.setTimeout(onClose, 240);
        return () => window.clearTimeout(timeout);
    }, [isVisible, onClose]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Swipe-to-dismiss, driven imperatively: the sheet and backdrop are moved
    // by writing to their DOM styles directly inside the touch handlers, never
    // through React state. A React re-render per touchmove (the previous
    // approach) reconciles on every frame and drops them, making the drag feel
    // laggy; touching the DOM directly keeps it on the compositor. React still
    // owns the resting transform/opacity (via isVisible) and the class-based
    // transitions, so releasing hands control cleanly back to it — settle back
    // to open, or route through requestClose for one coherent slide-out.
    useEffect(() => {
        const sheet = sheetRef.current;

        if (!sheet || !mounted) {
            return;
        }

        let startY = 0;
        let tracking = false;
        let dragging = false;

        // Text-entry controls always need their own gesture handling. Plain
        // buttons (nav rows, pills, keypad keys) are deliberately not
        // excluded here: the 6px vertical dead zone below already tells a tap
        // apart from a real downward swipe, so a swipe starting on a button
        // still dismisses the sheet instead of only working from the gaps
        // between content.
        function isInteractive(target: EventTarget | null) {
            return (
                target instanceof Element &&
                Boolean(
                    target.closest(
                        "input,select,textarea,[role='combobox'],[data-radix-select-trigger]",
                    ),
                )
            );
        }

        function handleStart(event: TouchEvent) {
            if (
                window.innerWidth >= 640 ||
                event.touches.length !== 1 ||
                closingRef.current ||
                isInteractive(event.target)
            ) {
                return;
            }

            // Only start a drag from the top of the content; if it's scrolled
            // down, let the scroll happen instead.
            const scroller =
                event.target instanceof Element
                    ? event.target.closest<HTMLElement>(
                          "[data-bottom-sheet-scroll]",
                      )
                    : null;

            if (scroller && scroller.scrollTop > 0) {
                return;
            }

            startY = event.touches[0].clientY;
            tracking = true;
            dragging = false;
        }

        function handleMove(event: TouchEvent) {
            if (!tracking || !sheet) {
                return;
            }

            const offset = event.touches[0].clientY - startY;

            if (!dragging) {
                // Wait for a clear downward intent before capturing, so taps
                // and small jitters still reach the content underneath.
                if (offset < 6) {
                    return;
                }

                dragging = true;
                sheet.style.transition = "none";

                if (backdropRef.current) {
                    backdropRef.current.style.transition = "none";
                }
            }

            event.preventDefault();
            sheet.style.transform = `translateY(${Math.max(0, offset)}px)`;

            if (backdropRef.current) {
                backdropRef.current.style.opacity = String(
                    Math.max(0, 1 - Math.max(0, offset) / (window.innerHeight * 0.5)),
                );
            }
        }

        function handleEnd(event: TouchEvent) {
            if (!tracking || !sheet) {
                return;
            }

            tracking = false;

            if (!dragging) {
                return;
            }

            dragging = false;

            const offset =
                (event.changedTouches[0]?.clientY ?? startY) - startY;

            // Hand the resting transition back to the CSS classes.
            sheet.style.transition = "";

            if (backdropRef.current) {
                backdropRef.current.style.transition = "";
            }

            if (offset > Math.min(window.innerHeight * 0.25, 160)) {
                // Leave the inline transform where the finger left it; React
                // flips isVisible and writes the off-screen target, so the
                // slide-out continues from here in one direction.
                requestClose();
            } else {
                sheet.style.transform = "translateY(0px)";

                if (backdropRef.current) {
                    backdropRef.current.style.opacity = "1";
                }
            }
        }

        sheet.addEventListener("touchstart", handleStart, { passive: true });
        sheet.addEventListener("touchmove", handleMove, { passive: false });
        sheet.addEventListener("touchend", handleEnd);
        sheet.addEventListener("touchcancel", handleEnd);

        return () => {
            sheet.removeEventListener("touchstart", handleStart);
            sheet.removeEventListener("touchmove", handleMove);
            sheet.removeEventListener("touchend", handleEnd);
            sheet.removeEventListener("touchcancel", handleEnd);
        };
    }, [mounted, requestClose]);

    // Two rAFs, not one: the sheet only enters the DOM (in its off-screen
    // position) once `mounted` flips true, so a single rAF scheduled here
    // can fire before that first paint ever lands, collapsing the slide-up
    // into an instant jump. Waiting a full extra frame guarantees the
    // off-screen state has actually been painted before animating in.
    useEffect(() => {
        if (!mounted) {
            return;
        }

        let innerFrame = 0;
        const outerFrame = window.requestAnimationFrame(() => {
            innerFrame = window.requestAnimationFrame(() => {
                setIsVisible(true);
                onOpenComplete?.();
            });
        });

        return () => {
            window.cancelAnimationFrame(outerFrame);
            window.cancelAnimationFrame(innerFrame);
        };
    }, [mounted, onOpenComplete]);

    useEffect(() => {
        // Lock the underlying page scroll so the sheet's content is the only
        // scroll container. <RemoveScroll> below already prevents new scroll
        // input from reaching the background; this just guards against
        // programmatic scrolls (e.g. focus-into-view). Deliberately does NOT
        // touch documentElement/body overflow — doing so breaks position:
        // sticky on descendants (like the page header), which then falls
        // back to its normal-flow offset and renders off-screen.
        const target = scrollRef.current;

        if (!target) {
            return;
        }

        lockedScrollPositionRef.current = { x: window.scrollX, y: window.scrollY };
        const previousBodyOverscrollBehavior =
            document.body.style.overscrollBehavior;
        const lockViewport = () => {
            target.scrollTop = 0;
            window.scrollTo(
                lockedScrollPositionRef.current.x,
                lockedScrollPositionRef.current.y,
            );
        };

        document.body.style.overscrollBehavior = "none";
        lockViewport();
        window.addEventListener("scroll", lockViewport, { passive: true });
        window.addEventListener("resize", lockViewport);
        if (!allowContentScroll) {
            target.addEventListener("scroll", lockViewport, { passive: true });
        }
        window.visualViewport?.addEventListener("resize", lockViewport);
        window.visualViewport?.addEventListener("scroll", lockViewport);

        return () => {
            window.removeEventListener("scroll", lockViewport);
            window.removeEventListener("resize", lockViewport);
            if (!allowContentScroll) {
                target.removeEventListener("scroll", lockViewport);
            }
            window.visualViewport?.removeEventListener("resize", lockViewport);
            window.visualViewport?.removeEventListener("scroll", lockViewport);
            document.body.style.overscrollBehavior =
                previousBodyOverscrollBehavior;
        };
    }, [allowContentScroll, mounted]);

    useEffect(() => {
        // While an input is focused, the mobile browser scrolls it into view
        // by scrolling our container, which shifts the whole sheet. Lock the
        // scroll position for the duration of the focus so nothing moves.
        const container = scrollRef.current;

        if (!container) {
            return;
        }

        let lockedScrollTop: number | null = null;

        function isFormControl(node: EventTarget | null) {
            return (
                node instanceof HTMLInputElement ||
                node instanceof HTMLTextAreaElement ||
                node instanceof HTMLSelectElement
            );
        }

        function handleFocusIn(event: FocusEvent) {
            if (!isFormControl(event.target) || !container) {
                return;
            }

            lockedScrollTop = container.scrollTop;
        }

        function handleFocusOut(event: FocusEvent) {
            if (!isFormControl(event.target)) {
                return;
            }

            lockedScrollTop = null;
        }

        function handleScroll() {
            if (lockedScrollTop === null || !container) {
                return;
            }

            // Reassert the locked position if the browser tried to scroll the
            // focused field into view.
            if (container.scrollTop !== lockedScrollTop) {
                container.scrollTop = lockedScrollTop;
            }
        }

        container.addEventListener("focusin", handleFocusIn);
        container.addEventListener("focusout", handleFocusOut);
        container.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            container.removeEventListener("focusin", handleFocusIn);
            container.removeEventListener("focusout", handleFocusOut);
            container.removeEventListener("scroll", handleScroll);
        };
    }, [mounted]);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                requestClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [requestClose]);

    if (!mounted) {
        return null;
    }

    function isTextInputTarget(target: EventTarget | Element | null) {
        if (!(target instanceof HTMLElement)) {
            return false;
        }

        if (target instanceof HTMLTextAreaElement) {
            return true;
        }

        if (target instanceof HTMLInputElement) {
            return ![
                "button",
                "checkbox",
                "color",
                "file",
                "hidden",
                "image",
                "radio",
                "range",
                "reset",
                "submit",
            ].includes(target.type);
        }

        return target.isContentEditable;
    }

    return createPortal(
        <RemoveScroll
            allowPinchZoom
            className="fixed inset-0 z-[60] overflow-hidden"
            removeScrollBar={false}
        >
            <button
                ref={backdropRef}
                aria-label="Close"
                className="absolute inset-0 cursor-default bg-black/40 transition-opacity duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ opacity: isVisible ? 1 : 0 }}
                type="button"
                onClick={requestClose}
            />
            <div
                ref={sheetRef}
                className="absolute inset-x-0 bottom-0 top-14 flex flex-col overflow-hidden rounded-t-2xl bg-white transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
                style={{ transform: `translateY(${isVisible ? "0px" : "100%"})` }}
            >
                <div className="flex h-4 shrink-0 items-center justify-center">
                    <span className="h-1 w-10 rounded-full bg-neutral-300" />
                </div>
                <div
                    ref={scrollRef}
                    data-bottom-sheet-scroll
                    className={cn(
                        "flex-1 overscroll-none [&>*]:!min-h-0 [&>*]:!border-0 [&>*]:!rounded-none [&>*]:!shadow-none",
                        allowContentScroll
                            ? "overflow-y-auto overscroll-contain"
                            : "overflow-hidden",
                        className,
                    )}
                    role="dialog"
                    aria-modal="true"
                    onPointerDownCapture={(event) => {
                        const target = event.target;

                        if (
                            !isTextInputTarget(target) ||
                            document.activeElement === target ||
                            !(target instanceof HTMLElement)
                        ) {
                            return;
                        }

                        event.preventDefault();
                        target.focus({ preventScroll: true });
                        const restoreScroll = () =>
                            window.scrollTo(
                                lockedScrollPositionRef.current.x,
                                lockedScrollPositionRef.current.y,
                            );
                        window.requestAnimationFrame(restoreScroll);
                        window.setTimeout(restoreScroll, 80);
                    }}
                    onClickCapture={(event) => {
                        if (
                            event.target instanceof Element &&
                            event.target.closest("[data-modal-close]")
                        ) {
                            event.preventDefault();
                            event.stopPropagation();
                            requestClose();
                        }
                    }}
                >
                    {children}
                </div>
            </div>
        </RemoveScroll>,
        document.body,
    );
}

// Keys for the on-screen amount keypad, laid out 3 per row.
const AMOUNT_KEYPAD_KEYS = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    ".",
    "0",
    "backspace",
] as const;

export function formatAmountDisplay(value: string) {
    if (!value) {
        return "0.00";
    }

    const [whole, ...rest] = value.split(".");
    const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";

    return rest.length > 0
        ? `${formattedWhole}.${rest.join("")}`
        : formattedWhole;
}

// Currency amount readout for the on-screen keypad below. Split out from the
// keypad itself since callers (e.g. the quick-add form) place other fields
// between the two.
export function AmountDisplay({
    value,
    className,
}: {
    value: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex h-16 items-center rounded-2xl border border-border bg-muted px-4 tabular-nums",
                className,
            )}
        >
            <div className="flex items-end gap-1">
                <span
                    className={cn(
                        "text-3xl text-muted-foreground",
                        !value && "text-muted-foreground/50",
                    )}
                >
                    ₱
                </span>
                <span
                    className={cn(
                        "text-3xl font-semibold",
                        !value && "text-muted-foreground/50",
                    )}
                >
                    {formatAmountDisplay(value)}
                </span>
            </div>
        </div>
    );
}

// On-screen numeric keypad, used by mobile forms that enter currency amounts
// without a native keyboard. `value` is the raw typed string (whole digits
// first; "." switches to a 2-digit fraction), matching what
// `parseDecimalInput` expects. Pair with `AmountDisplay` for the readout.
export function AmountKeypadGrid({
    value,
    onChange,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}) {
    const [pressedKey, setPressedKey] = useState<string | null>(null);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTriggeredRef = useRef(false);

    function appendDigit(digit: string) {
        const dotIndex = value.indexOf(".");

        if (dotIndex === -1) {
            const whole = `${value}${digit}`.replace(/^0+(?=\d)/, "");
            onChange(whole.length > 9 ? value : whole);
            return;
        }

        const fraction = value.slice(dotIndex + 1);
        onChange(fraction.length >= 2 ? value : `${value}${digit}`);
    }

    function appendDecimalPoint() {
        onChange(value.includes(".") ? value : `${value || "0"}.`);
    }

    function backspace() {
        onChange(value.slice(0, -1));
    }

    // Long-pressing backspace clears the amount outright; the release
    // handler checks longPressTriggeredRef to skip the single-digit delete
    // that would otherwise also fire once the press is released.
    function startHold() {
        longPressTriggeredRef.current = false;
        holdTimerRef.current = setTimeout(() => {
            longPressTriggeredRef.current = true;
            onChange("");
        }, 500);
    }

    function cancelHold() {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }

    function handlePointerDown(key: string) {
        setPressedKey(key);

        if (key === "backspace") {
            startHold();
        }
    }

    function handlePointerUp(key: string) {
        const wasPressed = pressedKey === key;
        setPressedKey((current) => (current === key ? null : current));

        if (key === "backspace") {
            cancelHold();
        }

        if (!wasPressed) {
            return;
        }

        if (key === "backspace") {
            if (longPressTriggeredRef.current) {
                longPressTriggeredRef.current = false;
            } else {
                backspace();
            }
        } else if (key === ".") {
            appendDecimalPoint();
        } else {
            appendDigit(key);
        }
    }

    function handlePointerCancel(key: string) {
        setPressedKey((current) => (current === key ? null : current));

        if (key === "backspace") {
            cancelHold();
        }
    }

    return (
        <div className={cn("grid grid-cols-3 gap-2", className)}>
            {AMOUNT_KEYPAD_KEYS.map((key) => (
                <button
                    key={key}
                    type="button"
                    aria-label={
                        key === "backspace"
                            ? "Delete last digit"
                            : key === "."
                              ? "Add decimal point"
                              : undefined
                    }
                    className={cn(
                        "flex h-14 select-none items-center justify-center rounded-2xl border border-border text-xl font-semibold text-foreground transition-none md:hover:bg-[hsl(var(--hover-surface))]",
                        pressedKey === key
                            ? "bg-[hsl(var(--pressed-surface))]"
                            : "bg-muted",
                    )}
                    onPointerCancel={() => handlePointerCancel(key)}
                    onPointerDown={() => handlePointerDown(key)}
                    onPointerLeave={() => handlePointerCancel(key)}
                    onPointerUp={() => handlePointerUp(key)}
                >
                    {key === "backspace" ? (
                        <Delete className="h-7 w-7" aria-hidden />
                    ) : (
                        key
                    )}
                </button>
            ))}
        </div>
    );
}

// On mobile this renders as a MobileBottomSheet (slide-up, rounded top,
// swipe/backdrop to dismiss); on desktop (>=640px) it stays a centered
// modal dialog.
export function EditModal(props: {
    animateMobileEnter?: boolean;
    allowContentScroll?: boolean;
    children: React.ReactNode;
    className?: string;
    mobileMotion?: MobileModalMotion;
    onOpenComplete?: () => void;
    onClose: () => void;
}) {
    const isMobile = useIsMobileViewport();

    if (isMobile) {
        return (
            <MobileBottomSheet
                // Bottom sheets should scroll when their form is taller than
                // the sheet (e.g. the keypad forms) instead of clipping the
                // content. Callers can still opt out by passing false.
                allowContentScroll={props.allowContentScroll ?? true}
                className={props.className}
                onOpenComplete={props.onOpenComplete}
                onClose={props.onClose}
            >
                {props.children}
            </MobileBottomSheet>
        );
    }

    return <DesktopEditModal {...props} />;
}

function DesktopEditModal({
    animateMobileEnter = true,
    allowContentScroll = false,
    children,
    className,
    mobileMotion = "right",
    onOpenComplete,
    onClose,
}: {
    animateMobileEnter?: boolean;
    allowContentScroll?: boolean;
    children: React.ReactNode;
    className?: string;
    mobileMotion?: MobileModalMotion;
    onOpenComplete?: () => void;
    onClose: () => void;
}) {
    const [isVisible, setIsVisible] = useState(false);
    const [isMobileInputFocused, setIsMobileInputFocused] = useState(false);
    const prefersReducedMotion = usePrefersReducedMotion();
    const closingRef = useRef(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    const requestClose = useCallback(() => {
        if (closingRef.current) {
            return;
        }

        closingRef.current = true;
        setIsVisible(false);
    }, []);

    // Scheduled here (rather than inline in requestClose) so the timer is
    // tied to this instance's effect lifecycle: if this instance unmounts
    // mid-close (e.g. keyed to different content), the cleanup cancels the
    // pending close instead of leaving a stale timer that would later fire
    // onClose against whatever content replaced it.
    useEffect(() => {
        if (!closingRef.current) {
            return;
        }

        const timeout = window.setTimeout(
            onClose,
            prefersReducedMotion ? 0 : window.innerWidth >= 640 ? 100 : 240,
        );
        return () => window.clearTimeout(timeout);
    }, [isVisible, onClose, prefersReducedMotion]);
    const {
        dragOffset,
        isDragging,
        onTouchCancel,
        onTouchEnd,
        onTouchMove,
        onTouchStart,
        isSwipeDismissing,
    } = useSwipeToClose(requestClose, mobileMotion);
    const dragging = isDragging || isSwipeDismissing;
    const isOpenPosition =
        isVisible || (!animateMobileEnter && !closingRef.current);
    // Off-screen when closed, in place when open, following the finger while
    // dragging. Force-disabled on desktop via `sm:!transform-none`.
    const modalOffset = dragging
        ? `${dragOffset}px`
        : isOpenPosition
          ? "0px"
          : "100%";
    const modalTransform =
        mobileMotion === "right"
            ? `translateX(${modalOffset})`
            : `translateY(${modalOffset})`;
    // Skip the transition while the finger is actively dragging (so it tracks
    // 1:1) or when the user prefers reduced motion.
    const disableTransform =
        prefersReducedMotion || (isDragging && !isSwipeDismissing);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            setIsVisible(true);
            onOpenComplete?.();
        });

        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [onOpenComplete]);

    useEffect(() => {
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyOverscrollBehavior =
            document.body.style.overscrollBehavior;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        if (window.innerWidth < 640) {
            // Unlike `hidden`, `clip` prevents background scrolling without
            // creating a new scroll container that resets sticky positioning.
            document.documentElement.style.overflow = "clip";
            document.body.style.overflow = "clip";
            document.body.style.overscrollBehavior = "none";

            return () => {
                document.documentElement.style.overflow = previousHtmlOverflow;
                document.body.style.overflow = previousBodyOverflow;
                document.body.style.overscrollBehavior =
                    previousBodyOverscrollBehavior;
            };
        }

        document.body.style.overscrollBehavior = "none";

        return () => {
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.overscrollBehavior =
                previousBodyOverscrollBehavior;
        };
    }, []);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                requestClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [requestClose]);

    useEffect(() => {
        const dialog = dialogRef.current;
        let focusTimer: number | undefined;

        if (!dialog) {
            return;
        }

        function isMobile() {
            return window.innerWidth < 640;
        }

        function isTextInputTarget(target: EventTarget | Element | null) {
            if (!(target instanceof HTMLElement)) {
                return false;
            }

            if (target instanceof HTMLTextAreaElement) {
                return true;
            }

            if (target instanceof HTMLInputElement) {
                return ![
                    "button",
                    "checkbox",
                    "color",
                    "file",
                    "hidden",
                    "image",
                    "radio",
                    "range",
                    "reset",
                    "submit",
                ].includes(target.type);
            }

            return target.isContentEditable;
        }

        function syncInputFocus() {
            setIsMobileInputFocused(
                isMobile() && isTextInputTarget(document.activeElement),
            );
        }

        function handleFocusIn(event: FocusEvent) {
            setIsMobileInputFocused(
                isMobile() && isTextInputTarget(event.target),
            );
        }

        function handleFocusOut() {
            if (focusTimer) {
                window.clearTimeout(focusTimer);
            }

            focusTimer = window.setTimeout(syncInputFocus, 0);
        }

        dialog.addEventListener("focusin", handleFocusIn);
        dialog.addEventListener("focusout", handleFocusOut);
        window.addEventListener("resize", syncInputFocus);
        syncInputFocus();

        return () => {
            if (focusTimer) {
                window.clearTimeout(focusTimer);
            }

            dialog.removeEventListener("focusin", handleFocusIn);
            dialog.removeEventListener("focusout", handleFocusOut);
            window.removeEventListener("resize", syncInputFocus);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[60] flex items-stretch justify-center overflow-hidden sm:items-center sm:px-4 sm:py-6">
            <button
                aria-label="Close modal"
                className={cn(
                    "absolute inset-0 cursor-default bg-white/20 transition-opacity duration-200 sm:bg-white/45 sm:backdrop-blur-sm sm:duration-100",
                    isVisible ? "opacity-100" : "opacity-0",
                )}
                style={
                    isDragging || isSwipeDismissing
                        ? { opacity: Math.max(0, 1 - dragOffset / 400) }
                        : undefined
                }
                type="button"
                onClick={requestClose}
            />
            <div
                ref={dialogRef}
                className={cn(
                    "relative flex h-dvh max-h-dvh min-h-dvh w-full flex-col overflow-hidden bg-white opacity-100 will-change-transform transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-auto sm:min-h-0 sm:max-h-[calc(100dvh-3rem)] sm:max-w-[540px] sm:!transform-none sm:overflow-visible sm:rounded-2xl sm:border sm:border-border sm:transition-opacity sm:duration-100 sm:will-change-auto",
                    disableTransform ? "duration-0" : "duration-[160ms]",
                    allowContentScroll && "sm:overflow-hidden",
                    mobileMotion === "bottom" && "rounded-t-2xl",
                    !isVisible && "sm:opacity-0",
                    className,
                )}
                style={{ transform: modalTransform }}
                role="dialog"
                aria-modal="true"
                onClickCapture={(event) => {
                    if (
                        event.target instanceof Element &&
                        event.target.closest("[data-modal-close]")
                    ) {
                        event.preventDefault();
                        event.stopPropagation();
                        requestClose();
                    }
                }}
                onTouchCancel={onTouchCancel}
                onTouchEnd={onTouchEnd}
                onTouchMove={onTouchMove}
                onTouchStart={onTouchStart}
            >
                {mobileMotion === "bottom" && (
                    <div className="flex h-6 shrink-0 items-center justify-center sm:hidden">
                        <span className="h-1 w-10 rounded-full bg-neutral-300" />
                    </div>
                )}
                <div
                    className={cn(
                        "min-h-0 flex-1 overflow-y-auto overscroll-contain sm:overflow-visible [&>*]:!border-0 max-sm:[&>*]:!min-h-0 max-sm:[&>*]:!rounded-none",
                        allowContentScroll && "sm:overflow-y-auto",
                    )}
                    data-bottom-sheet-scroll
                    style={
                        isMobileInputFocused
                            ? { overflowY: "hidden" }
                            : undefined
                    }
                    onTouchMove={(event) => {
                        if (isMobileInputFocused) {
                            event.preventDefault();
                        }
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

export function ModalBackButton(_props: { onClick: () => void }) {
    return (
        <Button
            data-modal-close
            type="button"
            variant="ghost"
            size="icon"
            className="-ml-2 mb-3 sm:hidden"
        >
            <ChevronLeft className="h-5 w-5" aria-hidden />
            <span className="sr-only">Back</span>
        </Button>
    );
}

export function CategoryIconBadge({
    category,
    className = "",
    iconClassName = "",
}: {
    category: Category;
    className?: string;
    iconClassName?: string; // icon
}) {
    const Icon = categoryIconMap.get(category.icon) ?? Receipt;

    return (
        <span
            className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white",
                className,
            )}
            style={{ color: "#FFFFFF", backgroundColor: category.color }}
        >
            <Icon className={cn("h-4 w-4", iconClassName)} aria-hidden />
        </span>
    );
}

export function IconBadge({
    color,
    icon,
    className = "",
    iconClassName = "",
}: {
    color: string;
    icon: string;
    className?: string;
    iconClassName?: string;
}) {
    const Icon = categoryIconMap.get(icon) ?? Receipt;

    return (
        <span
            className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white",
                className,
            )}
            style={{ color: "#FFFFFF", backgroundColor: color }}
        >
            <Icon className={cn("h-4 w-4", iconClassName)} aria-hidden />
        </span>
    );
}

// Small accent-colored checkmark badge that overlaps a selected pill's
// top-right corner, matching the accent-color-swatch selection pattern in
// Settings. The ring color matches the pill's own surrounding card
// background so the badge reads as "cut out" of the pill's border.
export function PillCheckBadge() {
    return (
        <span
            aria-hidden
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground ring-2 ring-card"
        >
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
    );
}

export function AccountLogo({
    account,
    className = "",
    iconClassName = "",
}: {
    account: { color: string; icon: string; provider?: string };
    className?: string;
    iconClassName?: string;
}) {
    const provider = getAccountProvider(account.provider);
    const [logoFailed, setLogoFailed] = useState<string | null>(null);
    const logoSrc =
        provider?.hasLogoFile && provider
            ? getProviderLogoSrc(provider.key)
            : undefined;

    if (provider && logoSrc && logoFailed !== provider.key) {
        return (
            <span
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-transparent",
                    className,
                )}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    alt={provider.label}
                    className="h-full w-full object-contain"
                    decoding="sync"
                    fetchPriority="high"
                    loading="eager"
                    src={logoSrc}
                    onError={() => setLogoFailed(provider.key)}
                />
            </span>
        );
    }

    if (provider?.kind === "brand-icon" && provider.icon) {
        const BrandIcon = provider.icon;

        return (
            <span
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    className,
                )}
                style={{
                    backgroundColor: provider.color,
                    color: provider.textColor ?? "white",
                }}
            >
                <BrandIcon
                    className={cn("h-4 w-4", iconClassName)}
                    aria-hidden
                />
                <span className="sr-only">{provider.label}</span>
            </span>
        );
    }

    if (provider?.kind === "wordmark" && provider.wordmark) {
        return (
            <span
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full px-1 text-center font-semibold leading-none tracking-tight",
                    className,
                )}
                style={{
                    backgroundColor: provider.color,
                    color: provider.textColor ?? "white",
                    // Scale the wordmark down so longer names still fit the tile.
                    fontSize:
                        provider.wordmark.length > 4
                            ? "0.5rem"
                            : provider.wordmark.length > 2
                              ? "0.6rem"
                              : "0.72rem",
                }}
            >
                {provider.wordmark}
                <span className="sr-only">{provider.label}</span>
            </span>
        );
    }

    return (
        <IconBadge
            color={account.color}
            icon={account.icon}
            className={className}
            iconClassName={iconClassName}
        />
    );
}

export function TransactionIcon({
    category,
    type,
}: {
    category?: Category;
    type: TransactionType;
}) {
    if (category) {
        return <CategoryIconBadge category={category} />;
    }

    return (
        <span
            className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                type === "income" ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]",
            )}
        >
            {type === "income" ? (
                <Plus className="h-4 w-4 text-[#15803D]" aria-hidden />
            ) : (
                <Minus className="h-4 w-4 text-[#DC2626]" aria-hidden />
            )}
        </span>
    );
}

export function ProfileImage({
    size = "sm",
    user,
}: {
    size?: "xs" | "sm" | "md" | "xl";
    user: User | null;
}) {
    const avatarUrl =
        typeof user?.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : null;
    const dimensions = {
        xs: 20,
        sm: 24,
        md: 40,
        xl: 96,
    };
    const classNames = {
        xs: "h-5 w-5 text-xs",
        sm: "h-6 w-6 text-xs",
        md: "h-10 w-10 text-xs",
        xl: "h-24 w-24 text-3xl",
    };
    const dimension = dimensions[size];
    const className = classNames[size];

    if (avatarUrl) {
        return (
            <Image
                alt=""
                className={cn(className, "rounded-full object-cover")}
                height={dimension}
                src={avatarUrl}
                width={dimension}
            />
        );
    }

    return (
        <span
            className={cn(
                "flex items-center justify-center rounded-full bg-[hsl(var(--hover-surface))] font-medium text-foreground",
                className,
            )}
        >
            {getAccountInitials(user)}
        </span>
    );
}

export function getAccountName(user: User | null) {
    const metadata = user?.user_metadata ?? {};
    const name =
        typeof metadata.full_name === "string"
            ? metadata.full_name
            : typeof metadata.name === "string"
              ? metadata.name
              : null;

    return name || user?.email?.split("@")[0] || "Account";
}

export function getAccountInitials(user: User | null) {
    const parts = getAccountName(user).trim().split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }

    return parts[0]?.slice(0, 2).toUpperCase() ?? "";
}

export function GoogleLogo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden>
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
            />
        </svg>
    );
}

export function LogoMark({ size }: { size: number }) {
    // Both variants are inlined data URIs (not file srcs) so the mark renders
    // on the first paint — the loading screen showed the "Kwarta" text
    // instantly while a raster logo lagged behind its network fetch. The
    // dark-mode variant (white square, black glyph) is swapped in via a `dark:`
    // CSS variant so no theme check is needed before paint.
    return (
        <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                alt=""
                aria-hidden
                className="shrink-0 rounded-md dark:hidden"
                decoding="sync"
                fetchPriority="high"
                height={size}
                loading="eager"
                src={LOGO_MARK_DATA_URI}
                width={size}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                alt=""
                aria-hidden
                className="hidden shrink-0 rounded-md dark:block"
                decoding="sync"
                fetchPriority="high"
                height={size}
                loading="eager"
                src={LOGO_MARK_DATA_URI_DARK}
                width={size}
            />
        </>
    );
}

export function EmptyState({
    className,
    description,
    title,
}: {
    className?: string;
    description: string;
    title: string;
}) {
    return (
        <div
            className={cn(
                "rounded-md border border-dashed p-6 text-center",
                className,
            )}
        >
            <p className="font-medium leading-6">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

export function FieldError({
    children,
    message,
}: {
    children: React.ReactNode;
    message?: string;
}) {
    return (
        <div className="space-y-2">
            {children}
            {message && (
                <p className="!mt-1 text-sm leading-5 text-destructive">
                    {message}
                </p>
            )}
        </div>
    );
}
