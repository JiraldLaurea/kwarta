---
version: alpha
name: Vercel Minimal AI Cloud
description: A clean, high-contrast developer platform system with spacious white surfaces, tight typography, and restrained monochrome UI accented by subtle blue UI states.
colors:
  primary: "#171717"
  primary-contrast: "#FFFFFF"
  secondary: "#6B7280"
  tertiary: "#2563EB"
  neutral: "#FAFAFA"
  neutral-100: "#FFFFFF"
  neutral-200: "#E5E7EB"
  surface: "#FFFFFF"
  on-surface: "#171717"
  muted: "#525252"
  accent: "#000000"
  error: "#DC2626"
typography:
  headline-display:
    fontFamily: Geist
    fontSize: 35px
    fontWeight: 600
    lineHeight: 46px
    letterSpacing: -1.95px
  headline-lg:
    fontFamily: Geist
    fontSize: 29px
    fontWeight: 500
    lineHeight: 35px
    letterSpacing: -0.28px
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: 500
    lineHeight: 32px
    letterSpacing: -0.96px
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0px
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
    letterSpacing: 0px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0px
  nav-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  nav-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  xs: 2px
  sm: 10px
  md: 24px
  lg: 40px
  xl: 198px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-contrast}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "13px 14px"
    height: "40px"
    width: "181px"
  button-primary-hover:
    backgroundColor: "#383838"
    textColor: "{colors.primary-contrast}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.neutral-100}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "13px 14px"
    height: "40px"
    width: "181px"
  button-secondary-hover:
    backgroundColor: "#F2F2F2"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: "16px"
    height: "auto"
  input:
    backgroundColor: "{colors.neutral-100}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    mobileFontSize: "16px"
    desktopFontSize: "14px"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  input-focus:
    borderColor: "#2563EB"
    outline: "none"
    boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.18)"
    transition: "border-color 150ms ease-out, box-shadow 150ms ease-out"
  chip:
    backgroundColor: "#E8F0FE"
    textColor: "#0B57D0"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  modal:
    backgroundColor: "{colors.neutral-100}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    maxWidth: "540px"
    bodyPadding: "20px 24px 24px"
    footerBackgroundColor: "{colors.neutral}"
    footerBorderColor: "{colors.neutral-200}"
    footerPadding: "16px 20px"
    titleTypography:
      fontFamily: Geist
      fontSize: 24px
      fontWeight: 500
      lineHeight: 32px
      letterSpacing: 0px
    subheaderTypography:
      fontFamily: Geist
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
      letterSpacing: 0px
  date-picker:
    triggerBackgroundColor: "{colors.neutral-100}"
    triggerTextColor: "{colors.on-surface}"
    triggerRounded: "{rounded.md}"
    triggerHeight: "40px"
    triggerPadding: "8px 12px"
    popoverBackgroundColor: "{colors.neutral-100}"
    popoverRounded: "{rounded.lg}"
    popoverPadding: "16px"
    popoverShadow: "0 18px 60px rgba(0, 0, 0, 0.12)"
    selectedDayBackgroundColor: "{colors.tertiary}"
    selectedDayTextColor: "{colors.primary-contrast}"
  loading-spinner:
    color: "{colors.on-surface}"
    size: "16px"
    animation: "spin"
---

# Vercel Minimal AI Cloud

## Overview
This system feels crisp, product-led, and highly engineered, with a strong preference for whitespace and sharp contrast over ornament. It is tailored to technical audiences who want clarity, speed, and trust: developers, platform teams, and founders evaluating infrastructure. The tone is professional and modern, with a subtle editorial polish and a light, spacious density.

## Colors
- **Primary (#171717):** The main ink color for headlines, primary buttons, and high-emphasis text. It gives the interface its confident, near-black backbone.
- **Primary contrast (#FFFFFF):** Used for text and iconography on dark controls, especially filled buttons, to preserve legibility and crisp contrast.
- **Secondary (#6B7280):** A restrained gray for supporting copy, navigation, and secondary metadata. It softens the hierarchy without feeling disabled.
- **Tertiary (#2563EB):** A subtle blue used for interactive emphasis such as badges, links, and attention states. It should stay sparing so the UI remains mostly monochrome.
- **Neutral (#FAFAFA):** The main page and surface wash. This almost-white tone keeps the UI airy and makes content blocks feel softly separated.
- **Neutral 100 (#FFFFFF):** Pure white for elevated controls and panels, especially secondary buttons and cards that need a clear surface distinction.
- **Neutral 200 (#E5E7EB):** The light border and divider tone. It defines structure without introducing visible heaviness.
- **Surface (#FFFFFF):** Default component surface color, especially for cards, inputs, and button backgrounds on light pages.
- **On-surface (#171717):** The default readable text color on light backgrounds.
- **Muted (#525252):** Used for longer supporting paragraphs and subtle explanatory copy where a slightly softer tone is appropriate.
- **Accent (#000000):** The deepest black reserved for maximum contrast moments, including the strongest UI emphasis and dark icon treatment.
- **Error (#DC2626):** Reserved for validation and destructive states; it should remain rare so it does not compete with the otherwise restrained palette.

## Typography
Geist is the defining voice of the system: geometric, modern, and highly legible. Headlines use medium to semi-bold weights with negative letter-spacing to keep large text compact and authoritative. Body copy stays regular weight with generous line-height for readability, while labels and buttons use medium weight to create clear action hierarchy without looking heavy.

Headlines should follow the tight Vercel rhythm: large, confident, and minimally decorative. H1-style display text is compact and prominent; H2 and H3 levels retain the same family and weight discipline with subtle size reductions. Navigation and button text are small but strong, relying on weight rather than uppercase treatment.

There is no strong uppercase system in the screenshot; instead, emphasis comes from weight, spacing, and contrast. Keep letter-spacing near zero for most text, and use slight negative tracking only for major headings.

## Layout
The page uses a wide, centered desktop container with a very large visual canvas and generous outer margins. Content is organized in stacked bands: navigation, promotional strip, hero, then supporting proof points and text blocks. The rhythm is spacious and deliberate, with large vertical separations that allow the hero illustration to dominate.

Spacing follows a clean scale anchored by small increments and a few larger jumps. Use 2px for micro adjustments, 10px for compact gaps, 24px for standard section spacing, and 40px for major separations. The 198px value functions as a large hero-scale offset or breathing room for expansive compositions rather than routine spacing.

Cards and panels should use modest internal padding, typically 16px, with thin borders instead of heavy shadows. Layout should remain fluid on the inside but preserve a stable, centered composition overall.

Dashboard summary panels use a consistent 16px gap (`gap-4`) between cards and between the summary group and the following dashboard panels. The overview chip above dashboard summaries uses a 16px bottom margin (`mb-4`) to keep the rhythm equal.

Form action rows place the primary add/save action on the right side of the form. In modal footers, the secondary cancel action remains on the left while the primary action remains on the right. Inline add forms should also right-align their primary submit button for consistency with the modal action model.

Authentication screens show only the product mark and form on small screens. Hide the larger intro headline and supporting copy until larger viewports so mobile login stays focused and avoids pushing the form too far down the page. On small screens, group the product mark and form in one centered vertical stack so viewport height does not stretch the gap; keep that gap tight, around 12px, then restore the split layout and more generous spacing on larger screens. Sign-in form headers use direct action copy such as "Sign in" with a friendly subheader, social auth appears first, and a thin horizontal divider with centered "or" separates social auth from email/password fields. Primary auth submit buttons use text only.

## Elevation & Depth
The system is intentionally flat. Depth is created mostly through contrast, hairline borders, and occasional soft shadow rather than layered elevation stacks. The secondary button uses a subtle 1px shadow or border-like inset effect to distinguish itself from the page without appearing raised.

Use tonal separation sparingly: white controls on off-white surfaces, pale borders, and soft divisions. The hero illustration adds visual energy, but the UI itself should remain calm and disciplined.

## Shapes
The shape language is rounded but restrained. Buttons use soft rectangular corners, typically 8px, giving actions a modern product feel without becoming pill-like. Cards and inputs use matching small radii, typically 8px, to keep surfaces softly contained without looking playful. Modals use a larger but still disciplined radius, typically 16px, so the dialog feels elevated and intentional.

Avoid overly sharp geometry on interactive elements, but also avoid decorative rounding beyond the modal container. The overall impression should be clean, minimal, and slightly soft around the edges.

## Components
Buttons are the most visually expressive component. Primary buttons use a dark fill, white text, 8px rounding, and compact padding for a strong call to action. Primary button hover uses #383838. Secondary buttons invert the surface treatment: white fill, dark text, very subtle border/shadow, and the same 8px rounding. Secondary button hover uses #F2F2F2. Button sizing should remain consistent at about 40px tall with compact horizontal padding; this keeps navigation and actions aligned.

Use `button-primary` for the dominant action and `button-secondary` for adjacent or exploratory actions. Hover states should deepen or slightly darken the background rather than introducing new colors. Link-style buttons should stay minimal, with no container fill and underlined text only when they need to read as inline navigation.

Cards are quiet containers with white or near-white backgrounds, 1px neutral borders, small radii, and modest padding. They should feel like organized content surfaces rather than raised modules. Inputs should follow the same surface logic as cards: white background, subtle border, rounded corners, and body-sized text. Form controls use 16px text on mobile to prevent iOS Safari focus zoom, then reduce to 14px on larger screens where compact density is appropriate. Focused inputs and select triggers use the system blue border (#2563EB) and a soft outer ring (`0 0 0 3px rgba(37, 99, 235, 0.18)`) with a 150ms ease-out transition for both border color and shadow.

Modals use a centered white dialog with a 16px radius, 540px max width, thin neutral border, and subtle shadow over a separate lightly washed backdrop. Use a dedicated full-screen backdrop layer with `bg-white/45` and `backdrop-blur-sm` so content behind the modal softens while the dialog itself stays crisp and unaffected by blur. Modal backdrops can close the dialog when clicked, but hovering the backdrop should keep the default cursor rather than a pointer cursor. Modal content padding is 20px top, 24px sides, and 24px bottom. Modal titles use 24px type with 32px line-height, while subheaders use 16px type with 24px line-height. Modal action rows are separated from the body by a 1px neutral divider, use a #FAFAFA-style footer background, and place the secondary cancel action on the left with the primary action on the right.

Category list panels include a muted subheader below the panel title to clarify the group purpose. Category row labels use 14px type with 20px line-height and medium weight, paired with compact action icons aligned to the right.

Transaction type indicators use semantic tints: income uses green (`#15803D` on `#DCFCE7`) and expense uses red (`#DC2626` on `#FEE2E2`). Use these colors for compact transaction icons and transaction amount emphasis where the sign needs to scan quickly. Transaction amounts should be vertically centered against the merchant/source and category text block, with income amounts green and expense amounts red.

Budget progress rows show the category name, posted spend against the monthly limit, and a compact remaining or excess value on the same metadata line. Remaining values use muted text; excess values use the error color so over-budget states are easy to scan without adding extra decoration. Progress bars use the primary fill while within budget, then switch to the error color when spend exceeds the limit.

Chart panels do not use decorative header icons; let the title, subheader, and chart shape carry the section. Chart hover states use a pale vertical cursor band and a compact white date tooltip. The tooltip should be a small rounded label with subtle border/shadow, body-sm text, and a centered pointer notch so it reads as anchored to the active bar without covering the chart.

Date and month inputs use custom popovers rather than browser-native controls. The trigger is a 40px white input-like button with a calendar icon on the left, 8px radius, and the same neutral focus ring as text inputs. The date picker popover uses a white 16px-radius panel, 16px padding, subtle shadow, month navigation icons, seven-column day grid, muted adjacent-month days, and a blue selected-day state. Month pickers use the same trigger and popover shell, with year navigation and a compact three-column month grid. Date and month popovers should position dynamically: open below the input when space allows, and flip above the input when there is insufficient room below.

Loading states use a compact 16px monochrome CSS ring spinner placed inline with the loading message. Use an even circular border with one darker segment so the spinner rotates around its own center without visually orbiting. Keep the spinner close to the text with a small gap so the state reads as one unit rather than a separate decorative element.

Chips and badges are small, lightweight status markers. They should use compact padding, full rounding, and a gentle accent tint rather than a saturated fill. Keep iconography simple and monochrome, with blue reserved for small informational highlights or active states.

The favicon/app icon mirrors the Kwarta product mark: a primary black circular field with a simple white wallet glyph. Keep it high-contrast and legible at 16px; avoid text, gradients, or detailed decorative marks in the favicon.

Account menus use the person's display name in the navigation trigger instead of a generic "Account" label. The dropdown opens as a compact white rounded panel with a left-aligned account summary: display name on the first line and email beneath it in muted text. Keep irrelevant menu items out of the Kwarta account menu; it should include the account summary, one divider, and a single log-out row. Use the same structure inside the small-screen navigation panel so account actions feel consistent across breakpoints. On small screens, render the navigation panel as an overlay below the header rather than in document flow so opening it does not push dashboard content downward. Keep the mobile menu trigger neutral when opened; do not add a blue border or ring to the hamburger button. Use a separate fixed backdrop below the header with a light wash and `backdrop-blur-sm` so content outside the menu softens while the menu itself stays crisp; hovering that backdrop should keep the default cursor rather than a pointer cursor. The log-out action is inset inside the menu with 8px horizontal padding, a 44px row height, 14px text, and a compact 16px icon aligned to the right so the hover background reads as a contained menu item rather than an edge-to-edge footer. On small screens, reduce account menu typography one step: 14px for the account name, 12px for email, and 12px for the log-out row to keep the compact menu balanced.

## Do's and Don'ts
- Do keep the interface spacious and centered, with large breathing room around hero content.
- Do use dark text on light surfaces and reserve black for the highest-emphasis actions.
- Do rely on typography weight and scale for hierarchy instead of adding heavy decoration.
- Do keep shadows minimal; prefer borders and tonal contrast for separation.
- Don't introduce loud accent colors beyond the restrained blue interaction tone.
- Don't make buttons square or overly rounded beyond the pill style used for primary actions.
- Don't stack too many competing visual effects in the hero; let the illustration be the focal point.
- Don't use dense card grids or cramped spacing that would undermine the editorial, open feel.
