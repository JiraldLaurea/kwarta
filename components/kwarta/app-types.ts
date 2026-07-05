import type { WorkspaceBackupPayload } from "@/lib/kwarta/backup";

export type View =
  | "dashboard"
  | "transactions"
  | "budgets"
  | "accounts"
  | "reports"
  | "settings"
  | "manage-categories";

export type AccentTheme = "black" | "blue" | "green" | "purple";
export type ColorMode = "light" | "dark" | "system";

export type AutomaticBackupRecord = {
  backup: WorkspaceBackupPayload;
  createdAt: string;
};

export const accentThemeOptions: Array<{
  color: string;
  label: string;
  value: AccentTheme;
}> = [
  { color: "#171717", label: "Black", value: "black" },
  { color: "#2563EB", label: "Blue", value: "blue" },
  { color: "#15803D", label: "Green", value: "green" },
  { color: "#7C3AED", label: "Purple", value: "purple" },
];

export function isAccentTheme(value: string | null): value is AccentTheme {
  return accentThemeOptions.some((option) => option.value === value);
}
