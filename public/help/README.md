# Help screenshots

The in-app Help panel ( `?` in the header, or Settings → Help & tips ) shows a
per-page, swipeable carousel of screenshots. Drop real screenshots here and they
appear automatically — no code changes needed. Until a file exists, the panel
shows a labeled placeholder frame telling you the exact path to add.

## Naming convention

```
public/help/{view}/step-{n}-{mobile|desktop}.png
```

- `{view}` — the page the help belongs to (see the guide below)
- `{n}` — the step number, starting at `1`
- `mobile` / `desktop` — shown below / above the 640px breakpoint respectively

Provide **both** a `mobile` and a `desktop` image for each step. The mobile one
should be a phone-width capture (portrait, ~390px wide); the desktop one a wide
capture of the same page. The frame scales any aspect down with `object-contain`,
so exact dimensions don't matter — just keep the feature clearly visible.

The captions/steps live in `components/kwarta/help-panel.tsx` (`helpTopics`).

---

## Screenshot guide — what to capture for each step

> Tip: seed a bit of realistic data first (a few categories with transactions,
> one or two budgets, a couple of accounts) so the screenshots don't look empty.

### `dashboard` — Home

| Step | File base            | Capture this                                                                                              |
| ---- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| 1    | `dashboard/step-1`   | The Home screen showing the Expenses/Income category cards. Frame it so the tappable cards are the focus. |
| 2    | `dashboard/step-2`   | Close on one or two expense cards that show the **budget progress bar** and the "₱X left / ₱X excess" line (include one that's over budget in red if you can). |

### `transactions` — Transactions

| Step | File base            | Capture this                                                                                             |
| ---- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| 1    | `transactions/step-1`| The transaction list with a couple of **day group headers** and several income/expense rows underneath. |
| 2    | `transactions/step-2`| The transaction **edit form** open (tap a row) — showing amount, note, category, account, and date fields. |

### `budgets` — Budgets

| Step | File base        | Capture this                                                                                             |
| ---- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| 1    | `budgets/step-1` | The **budget summary** at the top: the segmented total bar with "total spent / total budget" and left/excess. |
| 2    | `budgets/step-2` | The per-category **budget list** with progress bars; or the budget form open after tapping a category.  |
| 3    | `budgets/step-3` | The budget form focused on the **Reuse budget** toggle.                                                  |

### `accounts` — Accounts

| Step | File base         | Capture this                                                                                            |
| ---- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| 1    | `accounts/step-1` | The **Net worth summary** plus the account cards grouped by type (bank, e-wallet, cash) with balances. |
| 2    | `accounts/step-2` | The **Transfer** flow — either the transfer form open, or the Transfers history list.                  |

### `settings` — Settings

| Step | File base         | Capture this                                                                                       |
| ---- | ----------------- | -------------------------------------------------------------------------------------------------- |
| 1    | `settings/step-1` | The **General** card: Home layout, Accent color, Theme, and Disable Budget Tracking rows.          |
| 2    | `settings/step-2` | The **Backup** card: Workspace data export/import and the automatic backup summary.                |
| 3    | `settings/step-3` | The top **Reports / Manage categories** actions and the **Account** card (profile, Help, sign-out). |

### `reports` — Reports

| Step | File base        | Capture this                                                                                    |
| ---- | ---------------- | ----------------------------------------------------------------------------------------------- |
| 1    | `reports/step-1` | The top **metric cards** (Income / Expenses / Balance) and the **Financial health** indicators. |
| 2    | `reports/step-2` | The **Trends** line chart (income, expenses, net over six months).                              |
| 3    | `reports/step-3` | The **Budget vs. actual** card and/or the **Vs. last period** comparison list.                  |

### `manage-categories` — Manage categories

| Step | File base                  | Capture this                                                                                |
| ---- | -------------------------- | ------------------------------------------------------------------------------------------- |
| 1    | `manage-categories/step-1` | The **Add category** form (or the "Add category" button with the category list behind it).  |
| 2    | `manage-categories/step-2` | A category list with a **drag handle** / mid-reorder, or the edit-category form open.       |
| 3    | `manage-categories/step-3` | The **Manage subcategories** screen/form.                                                    |

---

Example files for the Home page:

```
public/help/dashboard/step-1-mobile.png
public/help/dashboard/step-1-desktop.png
public/help/dashboard/step-2-mobile.png
public/help/dashboard/step-2-desktop.png
```
