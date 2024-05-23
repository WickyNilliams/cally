# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2024-05-23

### Fixed

- Use UTC-based methods on `Date` when getting day names

## [0.6.0] - 2024-05-10

### Added

- `<calendar-multi>` component.
- `heading` slot for `<calendar-date>`, `<calendar-range>`, and `<calendar-multi>` components.

### Removed

- Hover styles for disallowed dates

## [0.5.3] - 2024-04-25

### Fixed

- Reinstate missing `disallowed` and `today` CSS parts.

## [0.5.2] - 2024-04-22

### Fixed

- `<calendar-range>` handle empty `value` prop.

## [0.5.1] - 2024-04-20

### Fixed

- Reinstate missing `outside` CSS part.

## [0.5.0] - 2024-04-18

### Added

- `focused-date` attribute / `focusedDate` property to `<calendar-date>` and `<calendar-range>` components.

### Changed

- Bundle size improvements.

## [0.4.3] - 2024-04-05

### Fixed

- Use UTC timezone for formatting day names.

## [0.4.2] - 2024-04-04

### Fixed

- Use UTC timezone for formatting dates.

## [0.4.1] - 2024-04-04

### Fixed

- Styles for iOS devices

## [0.4.0] - 2024-04-02

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

## [0.3.0] - 2024-03-26

### Added

- Typescript types.
- Miscellaneous tweaks and polish.

## [0.2.0] - 2024-03-21

Initial release

### Added

- `<calendar-date>`, `<calendar-range>`, and `<calendar-month>` components.
- Astro-based docs site.
