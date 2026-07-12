// Creator admin — monitor every session and every question, live.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

/* --- passcode gate: only the app creator --- */
const ADMIN_PIN_HASH = "3149445257c74613d52f427610652e64f57299006bef4c000565f8042de76175";
async function requireAdmin() {
  if (sessionStorage.getItem("Sheela Li-admin-ok") === "1") return true;
  const pin = prompt("Admin passcode:");
  if (pin === null) return false;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin.trim()));
  const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  if (hex === ADMIN_PIN_HASH) { sessionStorage.setItem("Sheela Li-admin-ok", "1"); return true; }
  alert("Wrong passcode.");
  return false;
}
if (!(await requireAdmin())) {
  document.body.innerHTML = '<div class="container"><div class="empty-state">Access denied.</div></div>';
  throw new Error("not authorized");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function esc(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmt(ts) {
  if (!ts) return "—";
  const d = ts.toDate();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · " + d.toLocaleDateString();
}

let sessions = [];
let questions = [];

function renderAll() {
  document.getElementById("session-count").textContent = sessions.length;
  document.getElementById("question-count").textContent = questions.length;

  const listEl = document.getElementById("session-list");
  if (!sessions.length) {
    listEl.innerHTML = '<div class="empty-state"><div class="icon">🌸</div>No sessions yet.</div>';
    return;
  }

  listEl.innerHTML = sessions.map(s => {
    const qs = questions
      .filter(q => q.sessionCode === s.code)
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    return `
    <div class="card session-block">
      <div class="session-head">
        <div>
          <strong>${esc(s.title)}</strong>
          <div class="meta">${s.code} · ${esc(s.speaker) || "No speaker name"} · started ${fmt(s.createdAt)}</div>
        </div>
        <div>
          <span class="pill-tag ${s.ended ? "ended" : "live"}">${s.ended ? "Ended" : "Live"}</span>
          <span class="pill-tag">${qs.length} q</span>
        </div>
      </div>
      ${qs.map(item => `
        <div class="question-card compact ${item.answered ? "answered" : ""} ${item.hidden ? "hidden-q" : ""}">
          <div class="qtext">${esc(item.question)}</div>
          <div class="meta">
            <span class="name">${esc(item.name) || "Anonymous"}</span> · ${fmt(item.createdAt)}
            ${item.answered ? " · ✓ answered" : ""}${item.hidden ? " · hidden by speaker" : ""}
          </div>
        </div>`).join("") || '<div class="meta" style="padding:6px 2px">No questions in this session.</div>'}
    </div>`;
  }).join("");
}

onSnapshot(query(collection(db, "sessions"), orderBy("createdAt", "desc")), (snap) => {
  sessions = [];
  snap.forEach(d => sessions.push({ id: d.id, ...d.data() }));
  renderAll();
});
onSnapshot(collection(db, "questions"), (snap) => {
  questions = [];
  snap.forEach(d => questions.push({ id: d.id, ...d.data() }));
  renderAll();
});
