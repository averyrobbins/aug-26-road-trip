# Review before making this repository public

Status: **owner approved public publication on September 7, 2026**.
That approval covers the reviewed draft; future changes require review.
This checklist is not a privacy guarantee.
The entire public Git repository—not just what appears on the page—will be
downloadable. JavaScript data is visible to anyone who can open the site.

## Deliberately retained

- Trip date range and purchase calendar dates.
- Cities, states, business names, approximate purchase locations, and spending.
- Category, food, merchant, daily, and fuel summaries; fuel grades and prices.
- Uncertainty and coverage amounts, including undated and manually added spending.

This can reveal travel patterns and purchasing habits. It is **not anonymous**.
Locations are rounded to two decimal places (roughly one kilometer), but a
business name and city may still identify a particular store. Confirm that this
level of detail is acceptable before publishing.

## Excluded from the export

Original photos and evidence crops; individual shopping items; transaction
identifiers; payment or membership details; printed street addresses; exact
purchase times; source links and local file paths; private logs, databases,
extraction notes, and embedded copies of the private report.

Only selected summary fields and public-display map fields are exported. No
external scripts, fonts, map tiles, analytics, or automatic network requests are
used. After hosting, GitHub may process ordinary hosting request information.

## Review checklist for future updates

- [ ] Inspect the report and map, including every purchase detail and filter.
- [ ] Inspect `assets/trip-data.js` and `report-data.json`; hidden or downloadable data is still public.
- [ ] Accept disclosure of dates, cities, merchants, amounts, and approximate locations.
- [ ] Inspect every file and the complete staged diff before the first commit.
- [ ] Confirm no private history, images, hidden files, or credentials were added.
- [ ] Explicitly approve creation/upload of the public repository and Pages activation.

The unchecked boxes are reminders for the next update, not a claim that the
initial approval is missing. The local exporter does not mark these boxes or
perform GitHub actions.
