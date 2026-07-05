import { memo } from "react";
import type { IconType } from "react-icons";
import {
  IoHome,
  IoHomeOutline,
  IoPieChart,
  IoPieChartOutline,
  IoReceipt,
  IoReceiptOutline,
  IoSettings,
  IoSettingsOutline,
  IoWallet,
  IoWalletOutline,
} from "react-icons/io5";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/kwarta/shared";
import type { View } from "@/components/kwarta/app-types";

const navigationItems: Array<{
  activeIcon: IconType;
  icon: IconType;
  label: string;
  view: View;
}> = [
  { icon: IoHomeOutline, activeIcon: IoHome, label: "Home", view: "dashboard" },
  {
    icon: IoReceiptOutline,
    activeIcon: IoReceipt,
    label: "Transactions",
    view: "transactions",
  },
  {
    icon: IoPieChartOutline,
    activeIcon: IoPieChart,
    label: "Budgets",
    view: "budgets",
  },
  {
    icon: IoWalletOutline,
    activeIcon: IoWallet,
    label: "Accounts",
    view: "accounts",
  },
  {
    icon: IoSettingsOutline,
    activeIcon: IoSettings,
    label: "Settings",
    view: "settings",
  },
];

function toNavView(activeView: View): View {
  return activeView === "manage-categories" || activeView === "reports"
    ? "settings"
    : activeView;
}

export const DesktopSidebar = memo(function DesktopSidebar({
  activeView,
  onSelect,
}: {
  activeView: View;
  onSelect: (view: View) => void;
}) {
  const currentNavView = toNavView(activeView);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-white md:flex">
      <div className="w-full mb-2 pt-4 border-border px-4 text-left">
        <button
          aria-label="Go to Home"
          type="button"
          onClick={() => onSelect("dashboard")}
          className="cursor-pointer gap-2 items-center flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <LogoMark size={30} />
          <span className="text-xl font-semibold leading-7">Kwarta</span>
        </button>
      </div>
      <nav aria-label="Primary navigation" className="flex-1 space-y-1 p-3">
        {navigationItems.map((item) => {
          const active = currentNavView === item.view;
          const Icon = item.icon;

          return (
            <button
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hover:bg-[hsl(var(--hover-surface))] md:hover:text-foreground",
                active && "bg-[hsl(var(--hover-surface))] text-foreground",
              )}
              key={item.view}
              type="button"
              onClick={() => onSelect(item.view)}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
});

export const MobileTabBar = memo(function MobileTabBar({
  activeView,
  onSelect,
}: {
  activeView: View;
  onSelect: (view: View) => void;
}) {
  const currentNavView = toNavView(activeView);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {navigationItems.map((item) => {
          const active = currentNavView === item.view;
          const Icon = active ? item.activeIcon : item.icon;

          return (
            <button
              className={cn(
                "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-medium leading-3 text-[#9CA3AF] transition-colors",
                active && "text-primary dark:text-white",
              )}
              key={item.view}
              type="button"
              onClick={() => onSelect(item.view)}
            >
              <Icon className="h-6 w-6" aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
