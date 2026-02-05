# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## `0.9.2`

_Released: 2026-02-05_

### Fixed

- Week number calculations in non-GMT timezones.
- Numbering for CSS parts for days eg `day-1` in non-GMT timezones.

## `0.9.1`

_Released: 2026-01-29_

### Fixed

- Handling of min/max in `<calendar-select-month>`.
- February not appearing in `<calendar-select-month>` in some situations.
- Incorrect use of `aria-label` on week number table heading.

## `0.9.0`

_Released: 2025-12-15_

### Added

- `<calendar-select-year>` component for selecting year.
- `<calendar-select-month>` component for selecting month.
- `show-week-numbers` attribute/`showWeekNumbers` property to `<calendar-date>`, `<calendar-range>`, and `<calendar-multi>` components.
- `weeknumber` CSS part for `<calendar-month>` component.
- `col-weeknumber`, `col-1`, `col-2`, etc CSS parts corresponding to column number on `<calendar-month>`.
- `months` CSS part for `<calendar-date>`, `<calendar-range>`, and `<calendar-multi>` components.

## `0.8.0`

_Released: 2025-02-08_

### Added

- `getDayParts` option to `<calendar-date>`, `<calendar-range>`, and `<calendar-multi>` components.
- `target` option to `focus()` on `<calendar-date>`, `<calendar-range>`, `<calendar-multi>` components.
- `format-weekday` attribute/`formatWeekday` property to `<calendar-date>`, `<calendar-range>`, and `<calendar-multi>` components.
- `today` attribute/property on `<calendar-date>`, `<calendar-range>`, and `<calendar-multi>` components.
- `day-0`, `day-1`, etc CSS parts corresponding to day number on `<calendar-month>`.

## `0.7.2`

_Released: 2024-11-01_

### Fixed

- Use user's timezone for calculating today, not UTC.

## `0.7.1`

_Released: 2024-06-05_

### Fixed

- Edge cases in pagination logic.

## `0.7.0`

_Released: 2024-06-04_

### Added

- `page-by` attribute/`pageBy` property to `<calendar-date>`, `<calendar-range>`, and `<calendar-multi>` components.
- `tentative` attribute/property to `<calendar-range>` component.

## `0.6.1`

_Released: 2024-05-23_

### Fixed

- Use UTC-based methods on `Date` when getting day names.

## `0.6.0`

_Released: 2024-05-10_

### Added

- `<calendar-multi>` component.
- `heading` slot for `<calendar-date>`, `<calendar-range>`, and `<calendar-multi>` components.

### Removed

- Hover styles for disallowed dates

## `0.5.3`

_Released: 2024-04-25_

### Fixed

- Reinstate missing `disallowed` and `today` CSS parts.

## `0.5.2`

_Released: 2024-04-22_

### Fixed

- `<calendar-range>` handle empty `value` prop.

## `0.5.1`

_Released: 2024-04-20_

### Fixed

- Reinstate missing `outside` CSS part.

## `0.5.0`

_Released: 2024-04-18_

### Added

- `focused-date` attribute / `focusedDate` property to `<calendar-date>` and `<calendar-range>` components.

### Changed

- Bundle size improvements.

## `0.4.3`

_Released: 2024-04-05_

### Fixed

- Use UTC timezone for formatting day names.

## `0.4.2`

_Released: 2024-04-04_

### Fixed

- Use UTC timezone for formatting dates.

## `0.4.1`

_Released: 2024-04-04_

### Fixed

- Styles for iOS devices

## `0.4.0`

_Released: 2024-04-02_

### Added

- `container` and `header` CSS parts to date and range components.
- `rangestart` and `rangeend` events to `<calendar-range>` component.

### Changed

- Rename `button-next` and `button-previous` slots to `next` and `previous`.
- When and where `focusday` event gets fired.
- Finalized accessibility statement.
- Reuse common visually-hidden CSS styles.

### Fixed

- Table header accessible names.
- Range selection with screen reader virtual cursor.
- Font size in buttons.
- Screen reader announcement for range/date groups.

## `0.3.0`

_Released: 2024-03-26_

### Added

- Typescript types.
- Miscellaneous tweaks and polish.

## `0.2.0`

_Released: 2024-03-21_

Initial release

### Added

- `<calendar-date>`, `<calendar-range>`, and `<calendar-month>` components.
- Astro-based docs site.
