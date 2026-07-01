# Kwarta Design System

This document describes the current visual language and interaction behavior of
Kwarta. The implementation in `app/globals.css`, `components/kwarta-app.tsx`,
`components/kwarta/`, and `components/ui/` is the source of truth.

## Product Character

Kwarta is a personal finance workspace. It should feel calm, direct, and
trustworthy. The interface favors scanability, predictable placement, and fast
repeated actions over decorative presentation.

Core principles:

- Keep financial values and status changes easy to compare.
- Use restrained surfaces, thin borders, and small radii.
- Let category colors identify data, not decorate entire screens.
- Keep desktop workflows dense and mobile workflows touch-friendly.
- Preserve layout stability when content, hover, focus, or loading states change.

## Responsive App Shell

### Desktop

- Use a fixed left sidebar for Home, Transactions, Budgets, Accounts, and
  Settings.
- The Kwarta mark and name navigate to Home.
- Use outline navigation icons for both inactive and active items. The active
  row uses a quiet neutral background rather than a filled icon.
- Main content fills the remaining viewport width and uses responsive internal
  padding. Do not impose an unnecessary narrow page maximum.
- Settings panels form two columns when enough width is available.

### Mobile

- Use a fixed five-item bottom tab bar with the same destinations and icon
  family as desktop.
- Reserve bottom content padding so the tab bar never covers actions or fields.
- Hide the desktop sidebar and nonessential shell controls.
- Quick-add transaction and required-budget forms are separate full-screen
  views. They are not modals or overlays and must not expose the app header or
  mobile tabs.
- Other modal workflows may use a bottom sheet. Sheets start slightly above the
  viewport midpoint, have rounded top corners and a drag handle, and respond
  directly to downward dragging.

## Color System

Colors are semantic CSS variables defined in `app/globals.css`.

### Light mode

- Page background: near white.
- Cards and controls: white.
- Primary text and actions: near black.
- Borders: light neutral gray.
- Muted text: medium neutral gray.

### Dark mode

- Page background: black.
- Cards and elevated controls: near black with visible neutral borders.
- Primary text: near white.
- Muted text: medium gray with sufficient contrast.
- Hovered interactive rows use a dedicated brighter dark surface so hover is
  distinct from static muted panels.
- The loading mark uses a white tile with a dark glyph, and loading rings remain
  visible against black.

Theme color changes are instant. Only the dark-mode switch thumb animates during
the change, preventing a page-wide color transition.

### Accent themes

Supported accents are black/white, blue, green, and purple.

- Black is the default accent in light mode and becomes white in dark mode.
- Input focus remains blue when the black/white accent is selected.
- Selected option checkmarks remain black regardless of accent.
- Accent colors mark selection, progress, and high-emphasis controls. They must
  not tint entire page backgrounds.

### Semantic colors

- Green communicates income and positive values.
- Red communicates expenses, errors, over-budget values, and destructive
  actions.
- Destructive outline controls use the semantic destructive border and a subtle
  destructive hover fill in both modes.
- Category colors belong to category badges, charts, and progress segments.

## Typography

Kwarta uses Geist with system sans-serif fallbacks.

- Page title: 20px, medium weight, 28px line height.
- Modal or full-screen form title: 24px, medium weight, 32px line height.
- Panel title: 16px, semibold, 24px line height.
- Body: 16px on mobile where needed for iOS input behavior, otherwise 14px.
- Labels and navigation: 14px, medium weight, 20px line height.
- Supporting text: 14px with muted color and 20px line height.
- Compact metadata: 12px with 16px line height.

Use zero letter spacing. Reserve large type for page-level titles and keep panel
headings compact.

## Spacing, Shape, and Surfaces

- Base control height: 40px.
- Compact icon buttons: 32px to 36px where the surrounding layout permits.
- Standard panel gap: 16px on small screens and 20px on larger screens.
- Standard card radius: 8px or less.
- Desktop modal radius: 16px.
- Use 1px semantic borders for structure.
- Keep shadows subtle and limited to popovers, menus, and modals.
- Do not nest decorative cards inside cards. Framed rows are acceptable when
  they are independent editable or repeated items.

## Navigation and Page Headers

- Page headers contain a title, one short description, and right-aligned actions
  when needed.
- Settings exposes Reports and Manage categories as actions, not primary tabs.
- Buttons use an icon when a familiar command icon exists.
- Tooltips and info popovers must fit within the mobile viewport and center when
  anchored near an edge.

## Forms and Controls

### Inputs and selects

- Inputs and select triggers use white/card surfaces, semantic borders, and an
  8px radius.
- Focus uses a blue border and soft blue ring.
- Mobile text inputs use at least 16px text to avoid iOS zoom.
- Numeric money inputs accept decimal digits without signs or currency symbols.
- Select menus stay near their trigger, remain above sheets and dialogs, and use
  compact option padding where the Settings accent selector requires it.
- Hover fills apply to menu options and interactive rows, not to the date-picker
  trigger itself.

### Switches

- Switches appear beside their label and align with the first line of text.
- The switch track is 40px by 24px with a 20px thumb.
- Use switches only for binary settings such as dark mode, budget tracking, and
  reusable budgets.

### Date and period pickers

- Use custom month, week, date, and cycle popovers instead of native browser
  controls.
- Picker inputs do not darken on hover.
- Interactive calendar cells retain a visible hover state.
- Selected week endpoints use the accent color. Days between endpoints use the
  accent-muted surface with no gaps between adjacent cells.
- Popovers flip or reposition when there is insufficient space below.

## Buttons and Action Rows

- Primary actions use the active accent with readable foreground color.
- Secondary actions use a card surface and semantic border.
- Destructive actions use red text and border rather than borrowing a light-mode
  pink border.
- Modal footers place Cancel on the left and the primary action on the right.
- Mobile forms may use a full-width primary action.
- Backup action pairs fill their row equally on small screens.

## Categories and Home Layout

- Categories use a stable color and icon everywhere they appear.
- The category editor provides color swatches and a full-width grid of equal,
  square icon containers. The icon glyph stays fixed in size as its container
  grows.
- A selected color uses a blue ring separated from the swatch by a card-colored
  gap, so the gap adapts to light and dark mode.
- A selected icon keeps its blue focus/selection treatment without a white inner
  border.
- Subcategories can be reordered by drag and drop. The mobile drag overlay must
  begin at the touched row position without an initial vertical jump.
- Home supports List and Cards layouts. Layout controls show only a black check
  for selection, without a dark selected background or heavy border.
- Category cards use a compact width, taller proportion, centered icon, centered
  labels, and visible budget progress. The responsive grid fills the available
  width with three, five, or seven columns as the viewport grows.

## Transactions and Quick Add

- Desktop create/edit flows use centered dialogs with a stable border and no
  vertical entrance movement.
- Dialog appearance is a quick center fade. Closing through Cancel uses the same
  exit animation.
- Mobile category quick add opens as a full-screen page so keyboard resizing does
  not expose or shift the underlying app shell.
- Amount and Subcategory share one row in the mobile quick-add form. Account and
  date remain clearly reachable.
- Quick add focuses the relevant Amount or Limit field only when focus can be
  transferred without scrolling the page unexpectedly.
- When an input is focused in the mobile quick-add view, the document must not
  gain stray scroll space or nudge vertically.

## Budgets and Data Visualization

- Period selection supports monthly, weekly, and custom twice-monthly cycles.
- Budget rows show spent amount, limit, remaining or excess value, and category
  progress.
- Over-budget values and progress use the destructive color.
- Aggregate budget bars place colored segments directly beside one another with
  no white separator lines.
- Charts use semantic border, foreground, muted, and card variables so tooltips,
  grid lines, cursors, and bars remain legible in both themes.
- Empty chart and list panels retain enough height to look intentional.

## Accounts and Transfers

- Accounts are grouped as Bank, E-Wallet, and Cash.
- Account cards show provider branding when available and a calculated balance.
- Forms support manual accounts while preserving provider and sync fields for a
  future aggregation service.
- Transfers move value between accounts without counting as income or expense.
  Optional fees reduce the source account only.
- Transfer history is editable and uses the same responsive form patterns as
  other finance records.

## Settings and Backup

- General contains Home layout, Dark mode, Accent color, and Disable Budget
  Tracking in that order.
- Settings controls use compact 72px rows with labels on the left and controls on
  the right.
- Backup contains a full-workspace import/export row and a latest automatic
  backup row. Each row places its two actions below the description and lets the
  actions fill the available width.
- JSON backups include accounts, categories, subcategories, transactions,
  transfers, and budgets.
- Restoring or importing over current data requires confirmation.
- Account contains the Kwarta workspace identity, signed-in profile, and Log Out.

## Loading, Motion, and Feedback

- The initial loading screen shows the Kwarta mark immediately with a visible
  semantic spinner.
- Desktop dialogs fade in at the center without translating upward.
- Mobile bottom sheets animate from the bottom and track the pointer while being
  dragged down.
- Respect reduced-motion preferences.
- Avoid transitions during light/dark color replacement except for the theme
  switch itself.
- Disabled actions retain their dimensions and use opacity rather than layout
  changes.

## Accessibility

- Every icon-only button has an accessible label and a tooltip when its meaning
  is not obvious.
- Use native buttons for actions and preserve keyboard focus rings.
- Dialogs and popovers expose the appropriate expanded, selected, checked, and
  modal states.
- Color is not the only indicator of selection, transaction type, or budget
  status.
- Maintain readable contrast in both themes and every accent.
- Touch targets remain comfortably usable on mobile.

## PWA and Brand

- The Kwarta mark is a high-contrast Peso-style glyph.
- Light surfaces use the black mark tile. Dark surfaces may invert it to a white
  tile with a dark glyph for visibility.
- Favicon, Apple touch icon, manifest icons, and in-app branding use the same
  mark family.
- The installed app uses standalone display, portrait orientation, finance and
  productivity categories, and maskable artwork.

## Do and Do Not

Do:

- Keep operational screens compact, consistent, and easy to scan.
- Use semantic tokens instead of hardcoded light-only colors.
- Verify fixed navigation, popovers, forms, and text at mobile and desktop sizes.
- Keep hover, focus, selected, loading, empty, and destructive states complete.

Do not:

- Add marketing-style hero sections to the application shell.
- Use oversized headings inside cards or settings panels.
- Add decorative gradients, floating color blobs, or one-note theme washes.
- Animate the whole page during theme changes.
- Allow fixed navigation, keyboards, or dropdowns to cover required actions.
- Change icon dimensions when only the surrounding option container should grow.
