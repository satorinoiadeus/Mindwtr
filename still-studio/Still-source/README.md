# Still

A little space for your next action. An offline personal task manager for Android and Windows, rebuilt in this repository from the earlier Things shell and the existing Still interface.

## What is included

Areas → projects → tasks → checklists. Inbox, Today, Upcoming, Anytime, Someday, Logbook, Trash, search, quick capture, date scheduling, deadlines, daily/weekly/monthly repeats, Undo, light/dark themes, project finish lines, ordering, and JSON backups.

Still uses quiet green and neutral colors, a desktop sidebar, and mobile navigation. There are no accounts, sync, analytics, AI, email capture, calendars, MCP servers, Pomodoro timers, or network services.

## Run and verify

Install Node.js 24 and run from the repository root:

```sh
npm ci
npm run dev
npm run verify
```

The app is in `apps/desktop`, shared foundations in `packages/core`. `npm run standalone` creates `apps/desktop/Still.html` for an offline browser preview. Browser workspaces use browser-local storage; installed apps use SQLite. The preview is not a native installer.

## Build Windows EXE

On Windows, install Rust 1.90, Visual Studio Build Tools with C++ and Windows SDK, and WebView2. Then:

```sh
npm ci
npm run desktop -- --ci
```

The NSIS installer is under `apps/desktop/src-tauri/target/release/bundle/nsis/`. Windows packages are unsigned unless signing is separately configured.

## Build Android APK

Install JDK 17, Android SDK API 36, build-tools 36.0.0, NDK 29.0.13846066, and Rust. Set `ANDROID_HOME`, `JAVA_HOME`, and `NDK_HOME` to their installed locations, then:

```sh
npm ci
npm run android:init -- --ci
npm run android:build -- --ci
```

The ARM64 testing APK is under `apps/desktop/src-tauri/gen/android/app/build/outputs/apk/`. For a universal ARM64 + x86-64 build, run `npm run tauri -- android build --apk --debug --target aarch64 x86_64 --ci`.

`.github/workflows/still-build.yml` verifies the app before building Windows EXE and Android APK artifacts. An optional repository secret `STILL_ANDROID_DEBUG_KEYSTORE_BASE64` restores a persistent Android development key. Without it, a CI testing APK uses that runner's generated key and may not update an existing installation. Never commit signing keys. Production distribution requires production signing.

## Existing data

The application identifier is `app.still.tasks`, matching the earlier Still APK. Version 0.2.1 and the compatible `still.db` schema allow an upgrade when the signing key matches. This identifier is deliberately separate from the old app's identifier. Do not uninstall an existing app to bypass a signing mismatch without first exporting its data.

For the previous app, export JSON, open Still → Settings & backups → Import backup, and review the preview before Merge or Replace. The original database/export is never modified. IDs, task relationships, notes, sections as headings, dates, completion, Trash, checklists, tags and supported repeats are copied. Existing Still backups remain compatible. Re-importing the same IDs does not duplicate tasks.

Timed schedules become local dates. Waiting/reference statuses become ordinary tasks with a note; cancellations become Logbook entries. Advanced repeats pause with the original rule recorded in notes. Attachments, people, integrations, settings, and unsupported fields remain in the original export; keep it. Invalid references or dates reject the whole import. There is no direct migration of the old native database or app-private Android data.

## Source and license

AGPL-3.0-only; see LICENSE and NOTICE.md. Full previous implementations remain in Git history. All distributed changes must retain the applicable license and source obligations. The repository's URL may still use its original name; application branding is Still.

See REBUILD.md for the feature comparison and VERIFICATION.md for actual validation results.

## Mobile update (0.2.1)

Mobile screens have visible New area/New project controls, automatic navigation to newly saved containers, lightweight drawer/press/entry motion, reduced-motion support and memoized navigation counts. Version 0.2.1 has compiled Android ARM64 APK and Windows x64 NSIS installer builds. The APK uses the existing test signing certificate; the Windows installer is unsigned. Native device/runtime testing remains unverified.

## Still Studio (0.4.0)

A refreshed, Vikunja-inspired interface adds four functional task layouts:
**List**, **Board**, **Table**, and **Calendar**. Board columns use existing
task headings and support desktop drag/drop, touch drag handles, and a mobile
move-to-column selector. Text and priority filters, sorting, quick capture,
project Trash actions, and a Studio/Classic appearance selector are included.
All existing task data and the offline-first storage model are preserved.

See [DESIGN-QA.md](DESIGN-QA.md) for 20 design rules, tested scope, and
explicit limitations. This is **not** a full Vikunja fork or a server-backed
replacement: team sharing, Gantt, attachments and accounts are not implemented.
The 0.4.0 source has not been compiled to a native installer in this runtime.
