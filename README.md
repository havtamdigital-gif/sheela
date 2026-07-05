# Sheela — Live Lecture Q&A

Participants scan a QR code, land on a clean question form, and their questions appear live on the speaker's admin page.

**Live site:** https://havtamdigital-gif.github.io/sheela/

## Pages

- `index.html` — public participant page: optional name + question form, submits to Firestore without a page refresh, then shows "Thank you, your question was sent."
- `admin.html` — speaker page (passcode-protected): large QR code pointing at the participant page, live total, and a realtime list of questions (newest first) with **Mark as answered** and **Hide question** buttons. Updates live via a Firestore realtime listener — no refresh needed.
- `classic.html` — the previous multi-session Q&A app, kept so nothing breaks.

## Files

- `style.css` — shared styling (soft Sheela brand, mobile-first).
- `app.js` — participant logic (validation, ≤500 chars, double-submit protection).
- `admin.js` — admin logic (passcode gate, realtime listener, actions).
- `firebase-config.js` — public Firebase web config. To point at a different Firebase project, paste its config over the values in this file (Firebase console → Project settings → General → Your apps).

## Firebase

Uses Cloud Firestore (modular SDK, CDN imports), collection `questions`, documents: `{ name, question, createdAt, answered, hidden }`. Security rules allow anyone to create a valid question (≤500 chars) and flip `answered`/`hidden`; deletes and other edits are rejected. Only the public web config is exposed — no admin credentials.

## Publishing changes

The site auto-deploys from the `main` branch via GitHub Pages: commit changes to `main` (edit on github.com or `git push`), wait ~1 minute, hard-refresh the site.
