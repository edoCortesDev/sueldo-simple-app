# 001: Monthly Salary Calculator

Status: implemented and verified. See `verification.md` and `../../artifacts/verification.json`.

## User Stories

- As a worker, I enter a month, monthly base and paid advance, then select worked
  days to know the amount earned and the outstanding balance.
- I reopen a month without reentering its values and selections.
- I print a monthly payment statement and save it as PDF using my browser.

## Financial Contract

- A month is identified by `YYYY-MM`, within years 1900 through 9999.
- Working days are Monday through Friday, including holidays. No holiday calendar.
- Base is user-entered each month; initial suggested amount is 400000 pesos.
- Daily rate is base divided by all weekdays in that month, rounded half-up to
  the nearest integer peso. Weekday pay is this rounded rate times selected weekdays.
- Selecting all weekdays can therefore differ from the base by a few pesos.
  Display the rounding adjustment explicitly when it is nonzero.
- A selected Saturday pays 20000; a selected Sunday pays 25000. No base pay on weekends.
- Total earned = weekday pay + Saturday pay + Sunday pay.
- Balance = total earned - advance. Preserve negative balances and label them
  as an advance in excess, never as a debt owed by the employer.
- Base and advance accept only nonnegative integer pesos up to 1000000000000.
  Empty, fractional, signed, scientific and unsafe values are invalid.
- Display CLP with `Intl.NumberFormat('es-CL')`, zero decimal places and `$`.
- Empty calendar earns zero; selecting a date twice deselects it. No duplicates.

## Acceptance Criteria

| ID | Observable outcome |
| --- | --- |
| AC01 | Input base/advance and month; validation prevents invalid calculations and printing. |
| AC02 | Calendar has correct weekday alignment, lengths, leap years and 20-23 weekday counts. |
| AC03 | Tapping/keyboard-activating a date toggles selection, color, pressed state and totals. |
| AC04 | Weekdays, Saturdays and Sundays follow the financial contract with integer results. |
| AC05 | Zero, positive and negative balances display with accurate labels. |
| AC06 | Month navigation, including year boundaries, restores separate saved states. |
| AC07 | Storage failures show feedback; malformed saved states are not overwritten automatically. |
| AC08 | Print shows month, optional worker name, selected dates, base, daily rate, counts, pay, advance and balance. App controls are hidden. |
| AC09 | At widths 320, 390 and 1440 there is no overflow or overlapping text; focus is visible; reduced motion is respected. |
| AC10 | Domain tests run via Node and directly in tests.html, with no dependencies. |

## Interface

First screen is the usable calculator. White surfaces on #F8FAFC with #1E293B
text, #2563EB actions, green weekday selections, blue Saturdays and purple Sundays.
Outstanding amounts use restrained red. Seven fixed calendar columns, explicit
selection checkmarks, legend, month arrows, base/advance inputs and detailed totals.
On mobile, a fixed bottom balance and print action keep the result visible while
using the calendar; reserve bottom space so this bar does not cover page content.
Provide bulk weekday selection and clearing; month data stays local to the browser.
Use small transitions and respect prefers-reduced-motion.

## Scope

Single worker; one accumulated advance per month; optional name; local persistence.
PDF uses browser printing. The statement reflects these agreed rules and contains
no tax, deduction, pension or statutory payroll calculations.
