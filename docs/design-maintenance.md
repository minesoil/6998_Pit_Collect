# Design maintenance

Pit Collect keeps its black and gold theme, bilingual labels, page order, and
scouting workflow. The interface now follows a field worksheet: continuous form
sections, visible checkbox and radio marks, and a compact aligned header.

## Research behind the changes

- [Carbon: Forms](https://www.carbondesignsystem.com/building-blocks/core/patterns/forms)
  recommends clear group headings, logical order, aligned controls, and distinct
  primary actions. The form uses section headings and neutral dividing rules;
  the fixed navigation stays within the form's visual width on desktop.
- [Carbon: Typography](https://www.carbondesignsystem.com/building-blocks/foundations/typography/type-sets)
  distinguishes productive UI type from expressive presentation type. Data entry
  uses the system UI font and a small fixed type scale. QR and drawing screens
  retain Lexend, including the existing canvas text.
- [NN/g: Cards](https://www.nngroup.com/articles/cards-component/)
  describes cards as summaries that usually lead to more detail. Our design
  inference is that ordinary form questions do not need an enclosing card.
  Their original boxes remain in the DOM, with transparent paint and separators.
- [GOV.UK: Checkboxes](https://design-system.service.gov.uk/components/checkboxes/)
  and [radios](https://design-system.service.gov.uk/components/radios/) use visible
  controls beside labels. Pit Collect exposes its existing native inputs while
  keeping each label clickable. Square and round marks now distinguish multiple
  selection from single selection.
- [The Next Default](https://www.claudiavaduvescu.com/en/articles/the-next-default)
  is a designer's opinion essay, not peer-reviewed research. It argues that
  avoiding a checklist of AI styles creates another default. The choice here is
  a practical competition worksheet tied to Unipards' existing identity.

Gold is reserved mainly for identity, links, selections, focus, and primary
actions. Successful event and team details use the existing dark surface and
readable metadata; invalid-team messages retain their red styling.

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

This visual pass changes only CSS and this document. HTML and all JavaScript are
unchanged from the prior draft. Canvas ancestor widths, padding, and borders are
preserved, and the QR/drawing cards keep their previous geometry.
The drawing page also retains its earlier header and section-title dimensions so
the redesign does not introduce a scrollbar that changes canvas width.

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
