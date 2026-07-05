import { useEffect, useRef, useState, type RefObject } from "react";
import type { IconType } from "react-icons";
import {
  ChevronRight,
  Download,
  HelpCircle,
  Info,
  LayoutGrid,
  List,
  LogOut,
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
import { Select } from "@/components/ui/select";
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
  { icon: LayoutGrid, label: "Cards", value: "cards" },
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

      <div className="grid gap-4 md:gap-5 xl:grid-cols-2">
        <Card className="overflow-visible rounded-xl">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold">General</CardTitle>
            <p className="text-sm leading-5 text-muted-foreground">
              How Kwarta looks and behaves.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 px-5 pb-4 pt-1">
            <SettingRow
              icon={RiLayoutFill}
              label="Home layout"
              description="How categories appear on the home screen."
              controlClassName="w-36 sm:w-[200px]"
              control={
                <Select
                  aria-label="Home layout"
                  options={homeLayoutOptions.map((option) => {
                    const Icon = option.icon;
                    return {
                      icon: <Icon className="h-4 w-4" aria-hidden />,
                      label: option.label,
                      value: option.value,
                    };
                  })}
                  value={homeItemStyle}
                  onValueChange={(value) =>
                    onHomeItemStyleChange(value as HomeItemStyle)
                  }
                />
              }
            />
            <SettingRow
              icon={FaPalette}
              label="Accent color"
              description="The highlight color across the app."
              controlClassName="w-36 sm:w-[200px]"
              control={
                <Select
                  aria-label="Accent color"
                  compactOptions
                  options={accentThemeOptions.map((option) => ({
                    icon: (
                      <span
                        className="h-2 w-2 rounded-full bg-current"
                        style={{
                          color:
                            isDarkEffective && option.value === "black"
                              ? "#F5F5F5"
                              : option.color,
                        }}
                      />
                    ),
                    label:
                      isDarkEffective && option.value === "black"
                        ? "White"
                        : option.label,
                    value: option.value,
                  }))}
                  value={accentTheme}
                  onValueChange={(value) =>
                    onAccentThemeChange(value as AccentTheme)
                  }
                />
              }
            />
            <SettingRow
              icon={FaAdjust}
              label="Theme"
              description="Follow your system, or pick light or dark."
              control={
                <div className="flex items-center gap-0.5 rounded-full border border-border p-1">
                  {colorModeOptions.map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={label}
                      onClick={() => onColorModeChange(value)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                        colorMode === value
                          ? "ring-1 ring-border text-foreground"
                          : "text-muted-foreground hover:bg-[hsl(var(--hover-surface))] hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              }
            />
            <SettingRow
              icon={FaChartBar}
              label="Disable Budget Tracking"
              description="Add expenses without setting category budgets."
              showInfoOnMobile
              control={
                <SettingsSwitch
                  checked={!budgetsEnabled}
                  id="disable-budget-tracking"
                  accentColor={currentAccentColor}
                  onChange={(checked) => onBudgetsEnabledChange(!checked)}
                />
              }
            />
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
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-[hsl(var(--hover-surface))]">
              <LogoMark size={40} />
              <div>
                <p className="font-medium leading-5">Kwarta</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Personal budget workspace
                </p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-[hsl(var(--hover-surface))]">
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
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" aria-hidden />
                Help &amp; tips
              </span>
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

function SettingRow({
  icon,
  label,
  description,
  control,
  controlClassName,
  showInfoOnMobile = false,
}: {
  icon: IconType;
  label: string;
  description: string;
  control: React.ReactNode;
  controlClassName?: string;
  // When true, the description is replaced by a tappable info popup on mobile
  // (where descriptions are hidden). Use for rows whose behavior isn't
  // self-explanatory.
  showInfoOnMobile?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <SettingIconBadge icon={icon} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium leading-5">{label}</p>
          {showInfoOnMobile && (
            <span className="sm:hidden">
              <InfoPopover text={description} label={label} />
            </span>
          )}
        </div>
        <p className="mt-0.5 hidden text-xs leading-4 text-muted-foreground sm:block">
          {description}
        </p>
      </div>
      <div className={cn("shrink-0", controlClassName)}>{control}</div>
    </div>
  );
}

function InfoPopover({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`About ${label}`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:hover:bg-[hsl(var(--hover-surface))] md:hover:text-foreground"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-20 mt-2 w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
          role="dialog"
        >
          <p className="text-sm leading-5 text-muted-foreground">{text}</p>
        </div>
      )}
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
        "relative inline-block h-6 w-10 shrink-0 cursor-pointer rounded-full transition-[background,border-color] duration-150 ease-[cubic-bezier(0,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
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
          "pointer-events-none absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.22)] transition-[left] duration-150 ease-[cubic-bezier(0,0,0.2,1)]",
          checked && "left-[18px]",
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
