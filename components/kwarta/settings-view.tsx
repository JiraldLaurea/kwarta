import type { RefObject } from "react";
import type { IconType } from "react-icons";
import {
  Check,
  ChevronRight,
  Download,
  Gauge,
  Grid3x3,
  LayoutGrid,
  List,
  LogOut,
  Rows3,
  Target,
  Upload,
  type LucideIcon,
} from "lucide-react";
import {
  FaAdjust,
  FaChartBar,
  FaDesktop,
  FaMoon,
  FaPalette,
  FaSun,
} from "react-icons/fa";
import { RiLayoutFill } from "react-icons/ri";
import { IoPricetagsOutline, IoStatsChart } from "react-icons/io5";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LogoMark,
  PageHeader,
  ProfileImage,
} from "@/components/kwarta/shared";
import { BackupActions } from "@/components/kwarta/backup-controls";
import type { HomeItemStyle } from "@/components/kwarta/home-view";
import {
  accentThemeOptions,
  type AccentTheme,
  type AutomaticBackupRecord,
  type ColorMode,
} from "@/components/kwarta/app-types";

const homeLayoutOptions: Array<{
  icon: LucideIcon;
  label: string;
  value: HomeItemStyle;
}> = [
  { icon: List, label: "List", value: "ios" },
  { icon: Rows3, label: "Compact", value: "compact" },
  { icon: Gauge, label: "Meter", value: "meter" },
  { icon: LayoutGrid, label: "Cards", value: "cards" },
  { icon: Grid3x3, label: "Tiles", value: "tiles" },
  { icon: Target, label: "Rings", value: "rings" },
];

const colorModeOptions = [
  { value: "system" as ColorMode, icon: FaDesktop, label: "System" },
  { value: "light" as ColorMode, icon: FaSun, label: "Light" },
  { value: "dark" as ColorMode, icon: FaMoon, label: "Dark" },
] as const;

export function SettingsView({
  accentTheme,
  accountName,
  automaticBackup,
  previousBackup,
  backupImportError,
  backupImportInputRef,
  budgetsEnabled,
  colorMode,
  email,
  homeItemStyle,
  user,
  onBackupExport,
  onBackupImportClick,
  onBackupImportFile,
  onAutomaticBackupDownload,
  onAutomaticBackupRestore,
  onPreviousBackupDownload,
  onPreviousBackupRestore,
  onColorModeChange,
  onAccentThemeChange,
  onBudgetsEnabledChange,
  onHomeItemStyleChange,
  onManageCategories,
  onViewReports,
  onOpenHelp,
  onSignOut,
}: {
  accentTheme: AccentTheme;
  accountName: string;
  automaticBackup: AutomaticBackupRecord | null;
  previousBackup: AutomaticBackupRecord | null;
  backupImportError: string | null;
  backupImportInputRef: RefObject<HTMLInputElement>;
  budgetsEnabled: boolean;
  colorMode: ColorMode;
  email: string;
  homeItemStyle: HomeItemStyle;
  user: User | null;
  onBackupExport: () => void;
  onBackupImportClick: () => void;
  onBackupImportFile: (file: File) => void;
  onAutomaticBackupDownload: () => void;
  onAutomaticBackupRestore: () => void;
  onPreviousBackupDownload: () => void;
  onPreviousBackupRestore: () => void;
  onColorModeChange: (mode: ColorMode) => void;
  onAccentThemeChange: (theme: AccentTheme) => void;
  onBudgetsEnabledChange: (enabled: boolean) => void;
  onHomeItemStyleChange: (style: HomeItemStyle) => void;
  onManageCategories: () => void;
  onViewReports: () => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
}) {
  const currentAccentColor = accentThemeOptions.find(
    (o) => o.value === accentTheme,
  )?.color;
  const isDarkEffective =
    colorMode === "dark" ||
    (colorMode === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Settings"
        description="Manage app preferences, budget behavior, and account access."
        actions={
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              className="min-w-0 flex-1 sm:flex-none"
              type="button"
              variant="secondary"
              onClick={onViewReports}
            >
              <IoStatsChart className="h-4 w-4" aria-hidden />
              Reports
            </Button>
            <Button
              className="min-w-0 flex-1 sm:flex-none"
              type="button"
              onClick={onManageCategories}
            >
              <IoPricetagsOutline className="h-4 w-4" aria-hidden />
              Manage categories
            </Button>
          </div>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-4 md:gap-5 xl:grid-cols-2">
        <Card className="min-w-0 overflow-visible rounded-2xl">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-lg font-bold tracking-tight">
              General
            </CardTitle>
            <p className="text-sm leading-5 text-muted-foreground">
              How Kwarta looks and behaves.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 px-5 pb-5 pt-2">
            <GeneralBlock
              icon={RiLayoutFill}
              label="Home layout"
              description="How categories appear on the home screen."
            >
              {/* Mobile: horizontal scroll, bled past the card's own x padding
                  so cards aren't clipped by it; pl-5 restores the initial
                  left inset. Browsers don't honor a scroll container's
                  trailing padding once scrolled to the end, so a real spacer
                  element (below) reserves the matching space on the right.
                  Desktop (sm+): wraps into a grid within the normal card
                  padding. */}
              <div className="-mx-5 flex gap-3 overflow-x-auto overscroll-x-contain pb-1 pl-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
                {homeLayoutOptions.map((option) => {
                  const selected = homeItemStyle === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onHomeItemStyleChange(option.value)}
                      className={cn(
                        "relative flex w-52 shrink-0 snap-start flex-col gap-3 rounded-2xl border-[1.6px] bg-muted p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:w-auto sm:shrink",
                        selected
                          ? "border-accent"
                          : "border-border md:hover:bg-[hsl(var(--hover-surface))]",
                      )}
                    >
                      <div className="h-14">
                        <HomeLayoutPreview style={option.value} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold leading-5">
                          {option.label}
                        </span>
                        <span
                          className={cn(
                            "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-opacity",
                            selected
                              ? "bg-accent text-accent-foreground opacity-100"
                              : "opacity-0",
                          )}
                          aria-hidden
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      </div>
                    </button>
                  );
                })}
                {/* Trailing spacer: reserves the same 20px inset as pl-5 at
                    the start (8px width + the existing gap-3 before it).
                    Not part of the desktop grid. */}
                <div className="w-2 shrink-0 sm:hidden" aria-hidden />
              </div>
            </GeneralBlock>

            <GeneralBlock
              icon={FaPalette}
              label="Accent color"
              description="Tap to apply instantly."
            >
              <div className="flex flex-wrap gap-3">
                {accentThemeOptions.map((option) => {
                  const selected = accentTheme === option.value;
                  const isWhiteSwatch =
                    isDarkEffective && option.value === "black";
                  const swatchColor = isWhiteSwatch ? "#F5F5F5" : option.color;
                  // Dark check on the light pastel swatches (and the white
                  // swatch in dark mode); white check only on the black swatch
                  // in light mode.
                  const checkColor =
                    option.value === "black" && !isDarkEffective
                      ? "#FFFFFF"
                      : "#0A0A0A";
                  const optionLabel = isWhiteSwatch ? "White" : option.label;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-label={optionLabel}
                      aria-pressed={selected}
                      onClick={() =>
                        onAccentThemeChange(option.value as AccentTheme)
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    >
                      <span
                        className={cn(
                          "relative flex h-7 w-7 items-center justify-center rounded-full",
                          selected &&
                            "ring-2 ring-accent ring-offset-2 ring-offset-card",
                        )}
                        style={{ backgroundColor: swatchColor }}
                      >
                        {selected && (
                          <Check
                            className="pointer-events-none h-3.5 w-3.5"
                            strokeWidth={3}
                            style={{ color: checkColor }}
                            aria-hidden
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </GeneralBlock>

            <GeneralBlock
              icon={FaAdjust}
              label="Theme"
              description="Follow your system, or pick light or dark."
            >
              <div className="flex gap-1 rounded-full border border-border bg-muted p-1.5">
                {colorModeOptions.map(({ value, icon: Icon, label }) => {
                  const selected = colorMode === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onColorModeChange(value)}
                      className={cn(
                        "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                        selected
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground md:hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {label}
                    </button>
                  );
                })}
              </div>
            </GeneralBlock>

            <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted p-4">
              <SettingIconBadge icon={FaChartBar} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5">
                  Disable Budget Tracking
                </p>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                  Hide budgets &amp; spend limits across the app.
                </p>
              </div>
              <SettingsSwitch
                checked={!budgetsEnabled}
                id="disable-budget-tracking"
                accentColor={currentAccentColor}
                onChange={(checked) => onBudgetsEnabledChange(!checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold">Backup</CardTitle>
            <p className="text-sm leading-5 text-muted-foreground">
              Import or export your full workspace.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            <BackupActionRow
              description="Transactions, budgets, accounts, categories, and subcategories."
              error={backupImportError}
              importInputRef={backupImportInputRef}
              label="Workspace data"
              onExport={onBackupExport}
              onImportClick={onBackupImportClick}
              onImportFile={onBackupImportFile}
            />
            <AutomaticBackupSummary
              backup={automaticBackup}
              previousBackup={previousBackup}
              onDownload={onAutomaticBackupDownload}
              onRestore={onAutomaticBackupRestore}
              onPreviousDownload={onPreviousBackupDownload}
              onPreviousRestore={onPreviousBackupRestore}
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold">Account</CardTitle>
            <p className="text-sm leading-5 text-muted-foreground">
              Your profile and session.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors md:hover:bg-[hsl(var(--hover-surface))]">
              <LogoMark size={40} />
              <div>
                <p className="font-medium leading-5">Kwarta</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Personal budget workspace
                </p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors md:hover:bg-[hsl(var(--hover-surface))]">
              <ProfileImage user={user} size="md" />
              <div className="min-w-0">
                <p className="truncate font-medium leading-5">{accountName}</p>
                <p className="mt-1 truncate text-sm leading-5 text-muted-foreground">
                  {email}
                </p>
              </div>
            </div>
            <Button
              className="w-full justify-between"
              type="button"
              variant="secondary"
              onClick={onOpenHelp}
            >
              <span>Help &amp; tips</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              asChild
              className="w-full justify-between"
              variant="secondary"
            >
              <a href="/" target="_blank" rel="noopener noreferrer">
                <span>About Kwarta</span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </a>
            </Button>
            <Button
              className="w-full justify-between"
              type="button"
              variant="secondary"
              onClick={onSignOut}
            >
              <span>Log Out</span>
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// A small skeleton snippet hinting at each home layout's structure, shown in
// the horizontally-scrollable layout picker. Uses neutral/accent tokens so it
// tracks the active theme.
function HomeLayoutPreview({ style }: { style: HomeItemStyle }) {
  if (style === "ios") {
    return (
      <div className="flex h-full flex-col justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-3 w-3 shrink-0 rounded-full bg-foreground/25" />
            <span className="h-1.5 flex-1 rounded-full bg-foreground/15" />
          </div>
        ))}
      </div>
    );
  }

  if (style === "compact") {
    return (
      <div className="flex h-full flex-col justify-center gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-foreground/25" />
            <span className="h-1 flex-1 rounded-full bg-foreground/15" />
          </div>
        ))}
      </div>
    );
  }

  if (style === "meter") {
    return (
      <div className="flex h-full flex-col justify-center gap-2">
        {[80, 55, 92].map((width, i) => (
          <div key={i} className="space-y-1">
            <span className="block h-1 w-6 rounded-full bg-foreground/15" />
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-accent-muted-foreground/70"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (style === "cards") {
    return (
      <div className="grid h-full grid-cols-2 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-md bg-foreground/15" />
        ))}
      </div>
    );
  }

  if (style === "tiles") {
    return (
      <div className="grid h-full grid-cols-3 grid-rows-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-[3px] bg-foreground/15" />
        ))}
      </div>
    );
  }

  // rings
  return (
    <div className="flex h-full items-center justify-center gap-2.5">
      {[0, 1].map((i) => (
        <span
          key={i}
          className="h-9 w-9 rounded-full border-[3px] border-foreground/15 [border-top-color:hsl(var(--accent-muted-foreground))]"
        />
      ))}
    </div>
  );
}

function GeneralBlock({
  icon,
  label,
  description,
  children,
}: {
  icon: IconType;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-3">
        <SettingIconBadge icon={icon} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5">{label}</p>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SettingIconBadge({ icon: Icon }: { icon: IconType }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent-muted-foreground"
      aria-hidden
    >
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

function SettingsSwitch({
  checked,
  id,
  accentColor,
  onChange,
}: {
  checked: boolean;
  id: string;
  accentColor?: string;
  onChange: (checked: boolean) => void;
}) {
  const normalizedAccent = accentColor?.replace(/\s/g, "").toLowerCase();
  const isWhiteAccent =
    normalizedAccent === "#fff" ||
    normalizedAccent === "#ffffff" ||
    normalizedAccent === "white";
  const knobColor = isWhiteAccent && checked ? "#000" : "#fff";

  return (
    <button
      aria-checked={checked}
      data-theme-switch={id === "dark-mode" ? "true" : undefined}
      className={cn(
        "relative inline-block h-6 w-11 shrink-0 cursor-pointer rounded-full transition-[background,border-color] duration-150 ease-[cubic-bezier(0,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        checked ? "bg-accent" : "bg-neutral-300",
      )}
      id={id}
      role="switch"
      type="button"
      style={
        isWhiteAccent && !checked ? { backgroundColor: "#525252" } : undefined
      }
      onClick={() => onChange(!checked)}
    >
      <span
        className={cn(
          "pointer-events-none absolute left-[2px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-[left] duration-150 ease-[cubic-bezier(0,0,0.2,1)]",
          checked && "left-[22px]",
        )}
        style={{ backgroundColor: knobColor }}
      />
    </button>
  );
}

function AutomaticBackupSummary({
  backup,
  previousBackup,
  onDownload,
  onRestore,
  onPreviousDownload,
  onPreviousRestore,
}: {
  backup: AutomaticBackupRecord | null;
  previousBackup: AutomaticBackupRecord | null;
  onDownload: () => void;
  onRestore: () => void;
  onPreviousDownload: () => void;
  onPreviousRestore: () => void;
}) {
  function formatRecord(record: AutomaticBackupRecord) {
    const createdAt = new Date(record.createdAt).toLocaleString("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      year: "numeric",
    });
    const details = [
      `${record.backup.transactions.length} transactions`,
      `${record.backup.budgets.length} budgets`,
      `${record.backup.accounts.length} accounts`,
      `${record.backup.categories.length} categories`,
    ].join(", ");
    return { createdAt, details };
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5">Latest automatic backup</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {backup
            ? (() => {
                const { createdAt, details } = formatRecord(backup);
                return `Created ${createdAt}. ${details}.`;
              })()
            : "A daily snapshot will appear here after the workspace loads."}
        </p>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        <Button
          className="w-full justify-center"
          disabled={!backup}
          type="button"
          variant="secondary"
          onClick={onRestore}
        >
          <Upload className="h-4 w-4" aria-hidden />
          Restore
        </Button>
        <Button
          className="w-full justify-center"
          disabled={!backup}
          type="button"
          variant="secondary"
          onClick={onDownload}
        >
          <Download className="h-4 w-4" aria-hidden />
          Download
        </Button>
      </div>
      {previousBackup && (
        <>
          <div className="min-w-0 pt-2">
            <p className="text-sm font-medium leading-5">Previous backup</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {(() => {
                const { createdAt, details } = formatRecord(previousBackup);
                return `Created ${createdAt}. ${details}.`;
              })()}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              className="w-full justify-center"
              type="button"
              variant="secondary"
              onClick={onPreviousRestore}
            >
              <Upload className="h-4 w-4" aria-hidden />
              Restore
            </Button>
            <Button
              className="w-full justify-center"
              type="button"
              variant="secondary"
              onClick={onPreviousDownload}
            >
              <Download className="h-4 w-4" aria-hidden />
              Download
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function BackupActionRow({
  description,
  error,
  importInputRef,
  label,
  onExport,
  onImportClick,
  onImportFile,
}: {
  description: string;
  error: string | null;
  importInputRef: RefObject<HTMLInputElement>;
  label: string;
  onExport: () => void;
  onImportClick: () => void;
  onImportFile: (file: File) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
      <div>
        <p className="text-sm font-medium leading-5">{label}</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <BackupActions
        error={error}
        importInputRef={importInputRef}
        onExport={onExport}
        onImportClick={onImportClick}
        onImportFile={onImportFile}
      />
    </div>
  );
}
