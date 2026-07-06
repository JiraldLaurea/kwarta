import type { WorkspaceBackupPayload } from "@/lib/kwarta/backup";

export type View =
  | "dashboard"
  | "transactions"
  | "budgets"
  | "accounts"
  | "reports"
  | "settings"
  | "manage-categories";

export type AccentTheme =
  | "black"
  | "green"
  | "teal"
  | "blue"
  | "indigo"
  | "purple"
  | "rose"
  | "amber"
  | "pink";
export type ColorMode = "light" | "dark" | "system";

export type AutomaticBackupRecord = {
  backup: WorkspaceBackupPayload;
  createdAt: string;
};

// Swatch colors mirror the accent tokens applied in globals.css so the picker
// dot matches what actually gets applied. Palette matches the design file.
export const accentThemeOptions: Array<{
  color: string;
  label: string;
  value: AccentTheme;
}> = [
  { color: "#171717", label: "Black", value: "black" },
  { color: "#74E8C0", label: "Green", value: "green" },
  { color: "#6AD6DC", label: "Teal", value: "teal" },
  { color: "#7CC4FF", label: "Blue", value: "blue" },
  { color: "#9CAAFC", label: "Indigo", value: "indigo" },
  { color: "#B79CFF", label: "Purple", value: "purple" },
  { color: "#F797D4", label: "Rose", value: "rose" },
  { color: "#F5C56B", label: "Amber", value: "amber" },
  { color: "#FF9BA8", label: "Pink", value: "pink" },
];

export function isAccentTheme(value: string | null): value is AccentTheme {
  return accentThemeOptions.some((option) => option.value === value);
}
