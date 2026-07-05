# Sheela — Live Q&A

A lightweight audience Q&A app for talks and lectures. Single-file, no build step: open `index.html` in a browser.

## Roles

- **Speaker** — create a session with a talk title (and optional name); get a big 4-character code plus a scannable QR code. Approved questions arrive sorted by upvotes, each with asker name (or "Anonymous") and time. Tap "Answered" to move a question to the done pile; "End session" when finished. Feed refreshes every few seconds.
- **Participant** — scan the QR (opens the app pre-joined via `?join=CODE`) or type the code. Ask questions (blank name = anonymous), upvote others' questions on the board, and track your own questions' status: awaiting approval, on the board, answered, or not approved.
- **Admin** — see every session (live and ended), approve or reject incoming questions before the speaker sees them, and view each session's full question list. The Admin view is gated by a passcode (stored as a SHA-256 hash in `index.html`).

## Storage

Set `FIREBASE_DB_URL` at the top of the script in `index.html` to a Firebase Realtime Database URL for real cross-device sync (participants' phones → speaker's laptop). If left empty, the app falls back to `localStorage`, which syncs across tabs on the same browser only — fine for local demos.

The QR code encodes the page's current URL with the session code attached, so it works best once the app is hosted somewhere participants' phones can reach.
