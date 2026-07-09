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
// dot matches what actually gets applied. `color` is the dark-mode tone
// (:root.dark[data-accent="…"] --accent), `lightColor` is the light-mode tone
// (:root[data-accent="…"] --accent). Palette matches the design file.
export const accentThemeOptions: Array<{
  color: string;
  lightColor: string;
  label: string;
  value: AccentTheme;
}> = [
  { color: "#171717", lightColor: "#171717", label: "Black", value: "black" },
  { color: "#74E8C0", lightColor: "#2C966A", label: "Green", value: "green" },
  { color: "#6AD6DC", lightColor: "#278286", label: "Teal", value: "teal" },
  { color: "#7CC4FF", lightColor: "#1275D9", label: "Blue", value: "blue" },
  { color: "#9CAAFC", lightColor: "#465CD8", label: "Indigo", value: "indigo" },
  { color: "#B79CFF", lightColor: "#6E43D0", label: "Purple", value: "purple" },
  { color: "#F797D4", lightColor: "#BC2F88", label: "Rose", value: "rose" },
  { color: "#F5C56B", lightColor: "#B3660F", label: "Amber", value: "amber" },
  { color: "#FF9BA8", lightColor: "#D02541", label: "Pink", value: "pink" },
];

export function isAccentTheme(value: string | null): value is AccentTheme {
  return accentThemeOptions.some((option) => option.value === value);
}

// The "black" theme swaps to a white accent in dark mode
// (:root.dark[data-accent="black"] --accent is 0 0% 96%), which isn't
// captured by the static color/lightColor pair above.
export function getAccentSwatchHex(
  value: AccentTheme,
  isDarkEffective: boolean,
): string {
  if (value === "black") {
    return isDarkEffective ? "#F5F5F5" : "#171717";
  }

  const option = accentThemeOptions.find((o) => o.value === value);

  return (isDarkEffective ? option?.color : option?.lightColor) ?? "#171717";
}
