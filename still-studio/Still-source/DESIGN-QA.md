# Still Studio · design and functionality QA

## 20 mobile + web principles applied

1. **Clear hierarchy:** page title → contextual subtitle → view selector → action list.
2. **One primary action:** visible quick capture plus a single mobile add button.
3. **Meaningful grouping:** Areas contain projects; board lanes group tasks.
4. **Consistent spacing:** a small spacing scale, predictable card padding.
5. **Readable typography:** generous line-height and distinct serif page titles.
6. **Accessible contrast:** theme-aware text, borders, and selected states.
7. **Visible status:** progress, priority, date, counts, and save feedback.
8. **Progressive disclosure:** advanced task details remain in the task editor.
9. **Recognizable navigation:** sidebar on desktop, persistent bottom navigation on mobile.
10. **Finger targets:** touch grips and primary mobile controls at least ~40 px.
11. **Discoverable editing:** explicit Edit and Trash controls, not hidden gestures only.
12. **Reversible actions:** Trash and Undo for accidental removals.
13. **No surprise data loss:** existing workspace schema preserved, local-first storage unchanged.
14. **Responsive layout:** board horizontally scrolls on mobile, table scrolls, calendar compresses.
15. **Keyboard support:** Ctrl/Cmd K search, N capture, Enter quick-add.
16. **Feedback:** hover, focus, active, selected, loading, and drop states.
17. **Motion restraint:** short transitions; reduced-motion preference honored.
18. **Customization:** Studio and Classic visual styles, light/dark appearance.
19. **Information density:** filters and sorting live in a compact toolbar.
20. **Consistency across views:** same task data in List, Board, Table, Calendar.

## Functional scope

Working in source code: List, Board, Table, Calendar; board lane movement by
HTML5 drag/drop or touch handle; board lane movement via select for accessible
mobile fallback; list reordering with touch handles; quick task capture;
priority/text filters; task sorting; inline task edits; task/project Trash;
project creation inside an Area; existing local persistence, backup, recurring
tasks, completion, areas and projects.

**Board storage:** existing `heading` field stores lane, so custom headings
show as additional lanes. Three default lanes are To do, In progress, Waiting.
This deliberately avoids migrating existing SQLite databases. Empty custom
lanes do not persist; full configurable Kanban buckets are not yet supported.

**Not implemented:** Vikunja server API, multi-user accounts, synchronization,
comments, assignments, file attachments, Gantt charts, reminders/notifications,
permissions, shared workspaces, automation integrations. These need a different
backend/data model and should not be represented as working features.

## Verification performed

- TypeScript/TSX parser: passed for modified source and new tests.
- Pure board/filter/calendar logic: passed test harness.
- CSS parse: passed with zero top-level syntax errors.
- Desktop visual layout: inspected via HTML-to-image static rendering.
- Native APK/EXE build: **not run for this version** (Node dependencies,
  Android SDK and native build toolchains unavailable in this runtime).
- Interactive browser/mobile device testing: **not run** (headless Chromium
  failed to start in this runtime). Use `npm run verify` and a device smoke
  test before shipping a production build.

## Device smoke checklist

- [ ] Install over the previous APK after backing up data; ensure signing key matches.
- [ ] Create an Area, add a Project inside it, add three tasks.
- [ ] Switch List → Board → Table → Calendar; tasks remain consistent.
- [ ] Move a card to In progress by touch drag and by dropdown; reopen app.
- [ ] Reorder list tasks using touch handles and keyboard up/down buttons.
- [ ] Filter by title, priority; sort by date and title.
- [ ] Complete, delete, restore, and Undo a task.
- [ ] Move a project to Trash; restore it from Trash.
- [ ] Switch Studio/Classic and light/dark, restart app.
- [ ] Test narrow 320 px screen, landscape, large text, reduced motion.
- [ ] Export a backup, import it, confirm task headings persist.
