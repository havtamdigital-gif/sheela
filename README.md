# Sheela — Live Q&A

A lightweight audience Q&A app for talks and lectures. Single-file, no build step: open `index.html` in a browser.

## Roles

- **Speaker** — create a session with a talk title (and optional name); get a big 4-character code plus a scannable QR code. Questions arrive in a numbered queue with asker name (or "Anonymous") and time. Tap "Answered" to move a question to the done pile; "End session" when finished. Feed refreshes every few seconds.
- **Participant** — scan the QR (opens the app pre-joined via `?join=CODE`) or type the code. See the lecture title, ask questions; blank name = anonymous. See a list of your own questions and whether they've been answered.
- **Admin** — see every session (live and ended) and drill into any one's full question list.

## Storage note

Data is kept in `localStorage`, which syncs across tabs on the **same browser** only. For real cross-device audience sync (participants' phones → speaker's laptop), swap the storage layer at the top of the script in `index.html` for a shared backend (e.g. Firebase Realtime Database). All storage access goes through `loadData`/`saveData`, so it's one small section to replace.

The QR code encodes the page's current URL with the session code attached, so it works best once the app is hosted somewhere participants' phones can reach.
