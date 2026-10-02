# Verification Evidence

Date: 2026-09-30, America/Santiago (machine-readable timestamp is in UTC).

## Domain

`node tests.js`: 22/22 passed. `node --check app.js`: passed.
The same 22 tests passed in `tests.html` over file:// in Chrome.

## Browser

Playwright with locally installed Chrome 154.0.8037.59; isolated temporary
browser contexts, without changing the user's real browser storage. 13 grouped
checks passed; machine-readable evidence: `artifacts/verification.json`.

| Acceptance | Evidence |
| --- | --- |
| AC01 | Valid/invalid monetary input; fractional base blocks both print buttons and native browser print. |
| AC02 | Domain month-length/weekday/alignment/leap-year tests; September calendar rendered with 30 buttons. |
| AC03 | Click, Space and Enter toggle dates and pressed state; bulk weekdays preserve extras; clear confirms. |
| AC04 | Real browser mixed weekday/weekend totals; domain rounding and safe-integer boundary cases. |
| AC05 | Zero balance and excess advance labeled correctly; negative monetary value retained. |
| AC06 | Monthly values remain independent, with save/load and reload verification; year-boundary domain tests. |
| AC07 | Corrupt storage preserved; denied read/write feedback; calculation and printing remain usable. |
| AC08 | Both print controls invoke print; native print handles invalid values; output contains metadata, exact dates, quantities, rates, advances and balance. |
| AC09 | Widths 320, 390, 768, 1440 checked for overflow and calendar cell overlap, including maximum monetary inputs. Screenshots visually inspected. Reduced-motion disables animation. |
| AC10 | Tests run in Node and directly from tests.html without application dependencies. |

## Print

`artifacts/liquidacion-ejemplo.pdf` generated from the actual application's
print view. PDF inspected using Poppler and pypdf: one A4 page. Rendered PDF
visually inspected for margins, table alignment, money values, dates and clipping.

Sample: September 2026, ten weekdays, one Saturday, one Sunday, base $400.000,
advance $130.000, total $226.820, balance $96.820.

The PDF dialog's Save as PDF destination is a user/browser action. Automation
verifies the print invocation and produces the equivalent A4 print output;
it does not automate the operating-system print dialog. Safari and Firefox
were not independently tested.

## Fixes Found During Verification

- CLP negative-value test adjusted to the native es-CL currency format ($-5.000).
- Edge tooltips constrained to prevent narrow-screen overflow.
- Calendar aspect ratio adjusted below 360px to avoid adjacent-cell overlap.
- Large monetary inputs/results use smaller fixed typography.
- Screenshot animations disabled to avoid transient capture artifacts.

All T01-T07 tasks are complete. No application server is needed.
