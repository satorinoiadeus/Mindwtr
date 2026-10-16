# Still — independent repository release

This is the source for the experimental Still release. Keep the existing Mindwtr repository unchanged.

1. Create a **public, empty** repository named `still` under `satorinoiadeus` (do not initialize a README, license, or `.gitignore`).
2. Push this source to its `main` branch. The included `.github/workflows/still-build.yml` builds test artifacts on every push.
3. Create a tag such as `v0.2.2` on the tested commit. `.github/workflows/still-release.yml` will independently build both Android and Windows installers and create a GitHub prerelease **only after all tests and builds succeed**.
4. Review signing before distributing widely. Android builds use development signing unless `STILL_ANDROID_DEBUG_KEYSTORE_BASE64` is configured; Windows installers are unsigned.

## Changes from Quiet Edition

- Project sections: add named sections even when empty; create tasks directly within a section; preserve existing task headings and old backups.
- Touch/mouse drag handles reorder tasks and move them between project sections, with a lifted card, insertion indicator and smooth row transitions.
- Existing keyboard-accessible up/down controls remain available; reduced-motion settings are respected.
- No new dependencies, accounts, syncing or unrelated features.

The new repository needs a GitHub account owner to create it if your connected GitHub integration does not support repository administration. The project files and workflows are ready to push once it exists.
