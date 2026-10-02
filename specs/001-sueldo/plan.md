# Implementation Plan

1. Define contracts and tests before implementing the financial services.
2. Implement Calendar, Money, Salary and Selection as pure domain services.
3. Add MonthRepository with injectable storage, versioned validation and errors.
4. Implement accessible HTML and mobile-first styles, then connect an injected
   controller to the view, repository, calculator and print service.
5. Generate a printable statement using text nodes, never untrusted HTML.
6. Run domain tests and real browser checks for input validation, persistence,
   calendar interactions, mobile/desktop layout and print output.
7. Record evidence and update acceptance/task status.

## Technical Decisions

Classic deferred scripts work over file:// without module/CORS restrictions.
No application dependencies or network requests. Integer half-up division avoids
floating point accumulation. localStorage is optional and has explicit fallback
feedback. The print service prepares a separate semantic article with print CSS.
Icons are local Lucide SVG paths with accessible labels on their controls.
Browser automation tools are development verification tools only.
