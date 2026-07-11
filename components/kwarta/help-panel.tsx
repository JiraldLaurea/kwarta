import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  LuArrowLeft as ArrowLeft,
  LuChevronLeft as ChevronLeft,
  LuChevronRight as ChevronRight,
  LuImageOff as ImageOff,
  LuX as X,
} from "react-icons/lu";
import {
  IoHomeOutline,
  IoPieChartOutline,
  IoPricetagsOutline,
  IoReceiptOutline,
  IoSettingsOutline,
  IoStatsChartOutline,
  IoWalletOutline,
} from "react-icons/io5";
import { cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import {
  EditModal,
  useIsMobileViewport,
} from "@/components/kwarta/shared";
import type { View } from "@/components/kwarta/app-types";

type HelpStep = {
  caption: string;
  detail: string;
};

type HelpTopic = {
  title: string;
  icon: IconType;
  steps: HelpStep[];
};

// Order the index list follows.
const topicOrder: View[] = [
  "dashboard",
  "transactions",
  "budgets",
  "accounts",
  "reports",
  "manage-categories",
  "settings",
];

// Each step's screenshot lives at
//   /help/{view}/step-{n}-{mobile|desktop}.png
// derived from the topic key and the step index, so no paths are hard-coded
// here. Until a screenshot exists, a labeled placeholder frame is shown.
const helpTopics: Partial<Record<View, HelpTopic>> = {
  dashboard: {
    title: "Home",
    icon: IoHomeOutline,
    steps: [
      {
        caption: "Log money in a tap",
        detail: "Tap any category to add an income or expense for the period.",
      },
      {
        caption: "Track spending vs. budget",
        detail:
          "Each expense shows its running total and how much of its budget is left.",
      },
    ],
  },
  transactions: {
    title: "Transactions",
    icon: IoReceiptOutline,
    steps: [
      {
        caption: "Every entry, by day",
        detail: "Income and expenses are grouped under the date they happened.",
      },
      {
        caption: "Edit or delete",
        detail:
          "Tap a transaction to change its amount, note, category, account, or date.",
      },
    ],
  },
  budgets: {
    title: "Budgets",
    icon: IoPieChartOutline,
    steps: [
      {
        caption: "See the whole picture",
        detail:
          "The summary shows total spent against your total budget for the period.",
      },
      {
        caption: "Set a limit per category",
        detail: "Tap a category to set or edit its limit and track what's left.",
      },
      {
        caption: "Reuse last period",
        detail: "In the budget form, toggle reuse to carry limits forward.",
      },
    ],
  },
  accounts: {
    title: "Accounts",
    icon: IoWalletOutline,
    steps: [
      {
        caption: "Track every balance",
        detail: "Add banks, e-wallets, and cash to see your total net worth.",
      },
      {
        caption: "Record transfers",
        detail: "Use Transfer to move money between accounts, kept in a history.",
      },
    ],
  },
  settings: {
    title: "Settings",
    icon: IoSettingsOutline,
    steps: [
      {
        caption: "Make it yours",
        detail:
          "Set the home layout, accent color, and light or dark theme; turn budgets off if you like.",
      },
      {
        caption: "Back up your data",
        detail: "Export or import your whole workspace; a daily snapshot is kept.",
      },
      {
        caption: "Account & shortcuts",
        detail:
          "Reach Reports and Manage categories up top; your profile and sign-out are here.",
      },
    ],
  },
  reports: {
    title: "Reports",
    icon: IoStatsChartOutline,
    steps: [
      {
        caption: "Your money at a glance",
        detail:
          "Income, expenses, and balance for the period, plus health indicators.",
      },
      {
        caption: "Spot the trends",
        detail: "A six-month line chart of income, expenses, and net.",
      },
      {
        caption: "Budget vs. actual",
        detail:
          "Compare spending against limits and how categories changed vs. last period.",
      },
    ],
  },
  "manage-categories": {
    title: "Manage categories",
    icon: IoPricetagsOutline,
    steps: [
      {
        caption: "Add a category",
        detail: "Create an expense or income category with its own icon and color.",
      },
      {
        caption: "Reorder & edit",
        detail: "Drag to reorder, or tap a category to rename or restyle it.",
      },
      {
        caption: "Subcategories",
        detail: "Group related spending under a parent with Manage subcategories.",
      },
    ],
  },
};

export function HelpPanel({
  view,
  showIndex = false,
  onClose,
}: {
  view: View;
  showIndex?: boolean;
  onClose: () => void;
}) {
  // When opened from the account panel (`showIndex`), start on the page list;
  // otherwise open the current page's tips directly.
  const initialView: View | null = showIndex
    ? null
    : helpTopics[view]
      ? view
      : "dashboard";
  const [selectedView, setSelectedView] = useState<View | null>(initialView);

  const canReturnToList = showIndex && selectedView !== null;

  return (
    <EditModal allowContentScroll onClose={onClose}>
      <Card className="min-h-dvh rounded-none border-0 bg-white sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:border">
        <div className="flex flex-col px-5 pb-5 pt-5 sm:px-6">
          {selectedView ? (
            <HelpTopicView
              topicKey={selectedView}
              canReturnToList={canReturnToList}
              onReturnToList={() => setSelectedView(null)}
              onClose={onClose}
            />
          ) : (
            <HelpIndex
              onSelect={(key) => setSelectedView(key)}
              onClose={onClose}
            />
          )}
        </div>
      </Card>
    </EditModal>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      aria-label="Close"
      data-modal-close
      type="button"
      onClick={onClose}
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex md:hover:bg-[hsl(var(--hover-surface))] md:hover:text-foreground"
    >
      <X className="h-5 w-5" aria-hidden />
    </button>
  );
}

function HelpIndex({
  onSelect,
  onClose,
}: {
  onSelect: (key: View) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Help
          </p>
          <CardTitle className="mt-0.5 text-2xl font-medium leading-8">
            Tips by page
          </CardTitle>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {topicOrder.map((key) => {
          const topic = helpTopics[key];
          if (!topic) {
            return null;
          }
          const Icon = topic.icon;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className="flex w-full items-center gap-3 bg-card px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:hover:bg-[hsl(var(--hover-surface))]"
            >
              <Icon
                className="h-5 w-5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-5">
                {topic.title}
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </>
  );
}

function HelpTopicView({
  topicKey,
  canReturnToList,
  onReturnToList,
  onClose,
}: {
  topicKey: View;
  canReturnToList: boolean;
  onReturnToList: () => void;
  onClose: () => void;
}) {
  const topic = helpTopics[topicKey] ?? helpTopics.dashboard!;
  const [index, setIndex] = useState(0);
  const stepCount = topic.steps.length;
  const startXRef = useRef<number | null>(null);

  const goTo = (next: number) =>
    setIndex(Math.max(0, Math.min(stepCount - 1, next)));

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(0, current - 1));
      } else if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(stepCount - 1, current + 1));
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [stepCount]);

  const step = topic.steps[index];

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {canReturnToList && (
            <button
              aria-label="Back to all tips"
              type="button"
              onClick={onReturnToList}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hover:bg-[hsl(var(--hover-surface))] md:hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
          )}
          <div className="min-w-0">
            <CardTitle className="text-2xl font-medium leading-8">
              {topic.title}
            </CardTitle>
          </div>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <div
        className="mt-5"
        onTouchStart={(event) => {
          // Keep this gesture local to the carousel so it doesn't also trigger
          // the mobile form's swipe-to-close.
          event.stopPropagation();
          startXRef.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (startXRef.current === null) {
            return;
          }

          const delta =
            (event.changedTouches[0]?.clientX ?? startXRef.current) -
            startXRef.current;
          startXRef.current = null;

          if (delta > 50) {
            goTo(index - 1);
          } else if (delta < -50) {
            goTo(index + 1);
          }
        }}
      >
        <HelpImage
          topicKey={topicKey}
          stepNumber={index + 1}
          alt={`${topic.title}: ${step.caption}`}
        />
      </div>

      <div className="mt-4 min-h-[3.5rem]">
        <p className="text-base font-semibold leading-6">{step.caption}</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {step.detail}
        </p>
      </div>

      {stepCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-6">
          <button
            aria-label="Previous"
            type="button"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 md:hover:bg-[hsl(var(--hover-surface))]"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>

          <div
            className="flex items-center gap-1.5"
            role="tablist"
            aria-label="Steps"
          >
            {topic.steps.map((s, i) => (
              <button
                key={s.caption}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Step ${i + 1}: ${s.caption}`}
                onClick={() => goTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index
                    ? "w-5 bg-foreground"
                    : "w-2 bg-neutral-300 md:hover:bg-neutral-400",
                )}
              />
            ))}
          </div>

          <button
            aria-label="Next"
            type="button"
            disabled={index === stepCount - 1}
            onClick={() => goTo(index + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 md:hover:bg-[hsl(var(--hover-surface))]"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}

function HelpImage({
  topicKey,
  stepNumber,
  alt,
}: {
  topicKey: View;
  stepNumber: number;
  alt: string;
}) {
  const isMobile = useIsMobileViewport();
  const variant = isMobile ? "mobile" : "desktop";
  const src = `/help/${topicKey}/step-${stepNumber}-${variant}.png`;
  const [failed, setFailed] = useState(false);

  // Reset the error state whenever the target image changes (step or viewport),
  // so swapping between existing and missing screenshots re-attempts the load.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className="flex h-[46vh] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted sm:h-[380px]">
      {failed ? (
        <div className="flex flex-col items-center gap-2 px-6 text-center">
          <ImageOff className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-xs leading-4 text-muted-foreground">
            Add a screenshot at
          </p>
          <code className="rounded bg-background px-1.5 py-0.5 text-[11px] leading-4 text-foreground">
            public{src}
          </code>
        </div>
      ) : (
        // Art-directed screenshot with a graceful onError placeholder;
        // next/image can't fall back cleanly for a missing runtime src.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
