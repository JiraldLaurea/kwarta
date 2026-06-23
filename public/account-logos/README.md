# Account provider logos

Drop official brand SVG logo files here, named by the provider key used in
`lib/kwarta/account-providers.ts`. When a file is present it is rendered for that
provider's accounts (cards, dropdowns); when it is missing, the app falls back
to the wordmark tile automatically.

Expected files (only those with `hasLogoFile: true` in the registry):

- `gcash.svg`
- `maya.svg`
- `bpi.svg`
- `bdo.svg`
- `unionbank.svg`
- `metrobank.svg`
- `landbank.svg`
- `pnb.svg`
- `securitybank.svg`
- `maribank.svg`
- `gotyme.svg`

Square or near-square SVGs work best; they are rendered with `object-contain`
inside a circular white tile. These are trademarked assets — add only logos you
are permitted to use.
