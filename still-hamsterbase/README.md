# Still — HamsterBase Tasks edition

A clean, quiet Still interface for **Android, Windows, and the web**, built on top of [HamsterBase Tasks](https://github.com/beocaca/tasks_hamsterbase).

## What's actually implemented

- A responsive Still palette (warm off-white, sage, graphite), cleaner spacing, rounded controls, mobile safe areas, desktop refinements.
- Mobile home is branded Still. Existing HamsterBase task creation, projects, areas, sorting, touch drag/drop, deletion, reminders, sync, local storage and encryption remain the upstream implementations.
- A **Move data** dialog on mobile and desktop:
  - export task data as **JSON**, **CSV**, **Markdown**;
  - import **Todoist-style CSV** (task rows), generic CSV, Still JSON, Markdown checklists;
  - import groups tasks into projects based on the CSV project name;
  - file size and task-count limits, import confirmation, user-visible error/success messages.
- Existing native **.hbTask** backup/restore is retained in upstream Settings, for complete data backups.
- GitHub Actions workflow to attempt **web**, **Android debug APK**, and **Windows Electron** builds.

## Backend untouched

The patch only changes frontend files:
- `src/styles/main.css`, `src/styles/still.css`
- `src/mobile/App.tsx`, `src/mobile/pages/home.tsx`
- `src/desktop/app.tsx`
- `src/still/StillTransfer.tsx`
- `index.html`

**No changes** to `src/core`, `src/services`, `src/server`, database, CRDT, sync, or network code. All task writes go through the existing `ITodoService`.

## Apply locally

```bash
git clone https://github.com/beocaca/tasks_hamsterbase.git hamsterbase-tasks
# From a checkout of the Still repository, run:
node still-hamsterbase/apply.mjs ./hamsterbase-tasks
cd hamsterbase-tasks
pnpm install
pnpm web:dev
```

The installer is repeatable and rejects unexpected upstream layouts rather than silently modifying backend files.

## Import limitations

The portable formats transfer common fields (title, notes, date, tags, completion, and named project for CSV/JSON). They do **not** fully round-trip nested subtasks, attachments, recurring tasks, reminders, project/area structures, or all app-specific metadata. Keep a **.hbTask backup** before migrating. Todoist CSV exports differ by version; the importer supports the common CONTENT, DESCRIPTION, PROJECT NAME, DATE, LABELS columns, and TYPE=task rows.

## Building

The workflow `.github/workflows/still-hamsterbase.yml` fetches a **pinned upstream source commit**, installs this UI patch, and attempts the three builds. Artifacts appear in the workflow run **only if its jobs succeed**. The Android debug APK is not a Play Store signed release. Windows packaging may need upstream platform-specific fixes. No unverified APK/EXE is claimed.

## Attribution / license

HamsterBase Tasks is **AGPL-3.0-only**. Any distributed modified version must comply with the AGPL, including the appropriate source and license notices. This overlay does not remove upstream copyright or license files. Still branding does not imply endorsement by HamsterBase.
