# Still — HamsterBase Tasks rebuild

## Source of truth

Base application: https://github.com/beocaca/tasks_hamsterbase
License: AGPL-3.0-only. Preserve license, notices and source availability.

## Scope

- Retain HamsterBase Tasks core, database, sync, reminders, task model, and services unchanged.
- Rebrand and redesign mobile and desktop UI as Still.
- Improve navigation, task editing, drag-and-drop discoverability, project and area placement.
- Preserve existing `.hbTask` native backup import/export.
- Add interoperable CSV task import/export in the presentation/application adapter layer, mapping into existing ITodoService.addTask and reading ITodoService.modelState.taskList.
- Never claim support for other apps' proprietary formats without a tested adapter.

## Build

Upstream uses pnpm, Vite, Capacitor Android and Electron desktop. Android and Windows builds need to be compiled and verified.

## Status

This is a design/implementation brief only. The HamsterBase code has not yet been vendored into this branch. No APK/EXE has been built from this branch.
