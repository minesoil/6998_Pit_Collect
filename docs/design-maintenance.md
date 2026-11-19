# Design maintenance

This pass keeps Pit Collect's black and gold theme, bilingual labels, page order,
and scouting workflow. The changes are deliberately small because this is an
existing competition tool.

## Research behind the changes

- [NN/g: Good Visual Design, Explained](https://www.nngroup.com/articles/good-visual-design/)
  recommends clear hierarchy, alignment, and consistent visual choices. The
  interface keeps Lexend and its existing colors, with calmer heading and button
  weights and the original text casing.
- [NN/g: Aesthetic and Minimalist Design](https://www.nngroup.com/articles/aesthetic-minimalist-design/)
  distinguishes useful information from distracting decoration. Card shadows,
  selection glows, and large corner radii were reduced; controls and information
  remain in their original places.
- [GOV.UK: Spacing](https://design-system.service.gov.uk/styles/spacing/)
  supports consistent spacing. Existing widths, padding, gaps, and margins are
  retained here, including the drawing surface's dimensions.
- [USWDS: Design principles](https://designsystem.digital.gov/design-principles/)
  recommends continuity and minimizing disruption. No fields, features, page
  steps, or dependencies were added or removed.

## Display safety

Names and notes are escaped in form displays, review, and saved-entry views.
Saved values and exported text remain raw. Saved-entry and assignment team
identifiers are passed through data attributes rather than interpolated into
JavaScript handlers. This follows [OWASP's DOM XSS guidance](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html).

The legacy TBA integration is unchanged. Its embedded API credential prevented
uploading edits to that file during automatic approval review. Manual-roster and
TBA profile rendering therefore remain outside this safety patch.

## What must stay compatible

- All theme color variables and the field image.
- Form names, IDs, option values, labels, limits, validation, and navigation.
- Storage keys, entry fields, CSV headers and escaping, QR version and field order.
- Weight conversion, compression libraries, path simplification, and rounding.
- Canvas dimensions and coordinate mapping; QR sizes, colors, and white padding.

## Checks

Run `node --test` from the repository root. No package installation is needed.
The fixtures use anonymous synthetic records captured with the unchanged code
from commit `4fdad75`. Tests compare
data and path QR compression inputs and generation settings, saved entries,
counter values, and exact CSV contents for kg and lbs examples. Compression
itself uses the existing CDN library and is not replaced by application code.
Additional tests cover literal text rendering and team identifiers.

Browser checks should include desktop and mobile forms, selected and invalid
controls, settings, saved-entry editing, both QR screens, and path drawing.
