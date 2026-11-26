# SmartEvents

## Keep the Flutter app in step with this project

The mobile app lives in a separate repository, the fork
`umarqureshi16/SmartEvents-Flutter` (local copy: `../SmartEvents-Flutter`, app in
`mobile/`). It uses this project's API, so every feature added or changed here
(`server/` routes, `client/` pages and their form rules) must also reach the app.

When a change here adds or changes something people can do:

1. Commit and push it here first.
2. In `../SmartEvents-Flutter`: `git fetch upstream && git merge upstream/master`
   (this repository is `upstream`; take this side for anything in `server/` or `client/`).
3. Run `node mobile/tool/parity.js`. It lists every endpoint the website calls
   that the app does not. Build each one into the app (same rules and messages
   as `server/utils/validation.js`, prices through `money()` / `Money.toBase`),
   or, only if it truly cannot work on a phone, add it to
   `mobile/tool/parity_ignore.json` with a reason.
4. `flutter analyze` and `flutter test` in `mobile/`, check it on the emulator,
   then commit and push the fork.

A daily GitHub Action in the fork (`Feature parity with the main project`) runs
the same check against this repository and fails when the app falls behind.
