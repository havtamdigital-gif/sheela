// Speaker Dashboard — QR + live "Questions & Audience Insights" for one session.
//
// Pipeline (in this order):
//   1. Listen to Firestore questions live with onSnapshot().
//   2. Remove hidden questions.
//   3. Group EXACT duplicates using a normalized duplicate key.
//   4. Convert duplicate groups into display items.
//   5. Order display items so SIMILAR questions sit near each other
//      (separate cards — never merged, never summarized).
//   6. Render.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, query, where, onSnapshot, doc, getDoc, updateDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

/* ------------------------- tunables ------------------------- */
// Minimum shared meaningful keywords for two questions to count as "similar".
// Raise to 3 for stricter grouping, lower to 1 for looser grouping.
const SIMILARITY_THRESHOLD = 2;
// A question is labelled "New" if it arrived within this many seconds.
const NEW_SECONDS = 90;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const code = (new URLSearchParams(location.search).get("c") || "").toUpperCase();
const $ = (id) => document.getElementById(id);

function esc(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtTime(ts) {
  if (!ts) return "just now";
  const d = ts.toDate();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ---------------- session lookup ---------------- */
const snap = code ? await getDoc(doc(db, "sessions", code)) : null;
if (!snap || !snap.exists()) {
  document.querySelector(".container").innerHTML =
    '<div class="empty-state"><div class="icon">🌷</div>Session not found.<br><br><a class="speaker-link" href="./">← Home</a></div>';
  throw new Error("no session");
}
const session = snap.data();

$("talk-line").textContent = session.title + (session.speaker ? " · " + session.speaker : "");
$("code-display").textContent = code;

const joinUrl = location.origin + location.pathname.replace("speaker.html", "") + "?s=" + code;
new QRCode($("qrcode"), { text: joinUrl, width: 220, height: 220, colorDark: "#3d3238", colorLight: "#ffffff" });
$("join-url").textContent = joinUrl;

/* ================= PART 1 — exact duplicate key ================= */
// Normalization for EXACT duplicate detection only:
// trim → lowercase → collapse whitespace → strip ENDING punctuation (? ! .)
// Words are never removed and the question is never rewritten.
function duplicateKey(text) {
  return (text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.]+$/g, "")
    .trim();
}

/* ================= PART 2 — keyword similarity =================== */
// Simple keyword-overlap similarity. NOT AI — just shared-word counting,
// used ONLY to place similar cards near each other. Cards stay separate.
const STOP_WORDS = new Set([
  "the", "is", "are", "a", "an", "of", "to", "in", "on", "for", "with",
  "how", "what", "why", "can", "i", "you", "do", "does", "my", "your",
  "we", "our", "it", "be", "will", "and", "or", "if", "at", "this", "that"
]);
function keywords(text) {
  return new Set(
    duplicateKey(text)
      .replace(/[^\p{L}\p{N}\s]/gu, " ")   // strip punctuation anywhere (for comparison only)
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w))
  );
}
// Number of meaningful keywords two questions share.
function sharedKeywords(setA, setB) {
  let n = 0;
  for (const w of setA) if (setB.has(w)) n++;
  return n;
}

/* ---------------- live listener + pipeline ---------------- */
const list = $("question-list");
const q = query(collection(db, "questions"), where("sessionCode", "==", code));
onSnapshot(q, (snapshot) => {
  // 1–2. collect visible questions
  const visible = [];
  snapshot.forEach(d => { const data = d.data(); if (!data.hidden) visible.push({ id: d.id, ...data }); });

  // 3. group exact duplicates by normalized key
  const groups = new Map();
  for (const item of visible) {
    const key = duplicateKey(item.question);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  // 4. one display item per duplicate group
  const items = [...groups.values()].map(members => {
    members.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    const latest = members[0];
    return {
      ids: members.map(m => m.id),
      text: latest.question,                       // shown verbatim — never rewritten
      count: members.length,
      latestAt: latest.createdAt,
      names: [...new Set(members.map(m => m.name).filter(Boolean))],
      answered: members.every(m => m.answered),
      kw: keywords(latest.question)
    };
  });

  // newest groups first as the base order
  items.sort((a, b) => (b.latestAt?.toMillis?.() || 0) - (a.latestAt?.toMillis?.() || 0));

  // 5. similar-question ordering: walk the newest-first list and, each time
  //    a card is placed, immediately place any remaining cards that share
  //    >= SIMILARITY_THRESHOLD keywords with it. Cards remain separate.
  const ordered = [];
  const remaining = [...items];
  while (remaining.length) {
    const base = remaining.shift();
    base.similar = false;
    ordered.push(base);
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (sharedKeywords(base.kw, remaining[i].kw) >= SIMILARITY_THRESHOLD) {
        const s = remaining.splice(i, 1)[0];
        s.similar = true;                          // visually tag as part of a nearby theme
        ordered.push(s);
      }
    }
  }

  // 6. render
  $("count").textContent = visible.length;
  if (!ordered.length) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🌸</div>Waiting for the first question…</div>';
    return;
  }
  const now = Date.now();
  list.innerHTML = ordered.map(item => {
    const isNew = item.latestAt && (now - item.latestAt.toMillis()) < NEW_SECONDS * 1000;
    return `
    <div class="question-card ${item.answered ? "answered" : ""} ${item.similar ? "similar" : ""}">
      <div class="qtext">
        ${esc(item.text)}
        ${item.count > 1 ? `<span class="dup-badge">Asked × ${item.count}</span>` : ""}
        ${isNew ? '<span class="new-badge">New</span>' : ""}
      </div>
      <div class="meta">
        <span class="name">${item.names.length ? esc(item.names.join(", ")) : "Anonymous"}</span>
        · ${fmtTime(item.latestAt)}${item.count > 1 ? " (latest)" : ""}
      </div>
      <div class="actions">
        ${item.answered
          ? '<span class="chip answered-label">✓ Answered</span>'
          : `<button class="chip answer" data-answer="${item.ids.join(",")}">Mark as answered</button>`}
        <button class="chip hide" data-hide="${item.ids.join(",")}">Hide question</button>
      </div>
    </div>`;
  }).join("");
});

/* ---------------- actions (apply to every duplicate in the group) ---------------- */
async function patchAll(ids, patch) {
  const batch = writeBatch(db);
  ids.forEach(id => batch.update(doc(db, "questions", id), patch));
  await batch.commit();
}
list.addEventListener("click", async (e) => {
  const answerIds = e.target.getAttribute("data-answer");
  const hideIds = e.target.getAttribute("data-hide");
  try {
    if (answerIds) await patchAll(answerIds.split(","), { answered: true });
    if (hideIds) await patchAll(hideIds.split(","), { hidden: true });
  } catch { alert("Action failed — try again."); }
});

$("end-btn").addEventListener("click", async () => {
  if (!confirm("End this session? Participants will no longer be able to send questions.")) return;
  await updateDoc(doc(db, "sessions", code), { ended: true });
  $("end-btn").textContent = "Session ended";
  $("end-btn").disabled = true;
});
