// Speaker admin page — live question list via Firestore realtime listener.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

/* --- simple passcode gate (SHA-256 hash of the speaker passcode) --- */
const ADMIN_PIN_HASH = "3149445257c74613d52f427610652e64f57299006bef4c000565f8042de76175";
async function requireAdmin() {
  if (sessionStorage.getItem("sheela-admin-ok") === "1") return true;
  const pin = prompt("Speaker passcode:");
  if (pin === null) return false;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin.trim()));
  const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  if (hex === ADMIN_PIN_HASH) { sessionStorage.setItem("sheela-admin-ok", "1"); return true; }
  alert("Wrong passcode.");
  return false;
}

if (!(await requireAdmin())) {
  document.body.innerHTML = '<div class="container"><div class="empty-state">Access denied.</div></div>';
  throw new Error("not authorized");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* --- QR code pointing to the participant page --- */
new QRCode(document.getElementById("qrcode"), {
  text: "https://havtamdigital-gif.github.io/sheela/",
  width: 220,
  height: 220,
  colorDark: "#3d3238",
  colorLight: "#ffffff"
});

const list = document.getElementById("question-list");
const countEl = document.getElementById("count");

function esc(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtTime(ts) {
  if (!ts) return "just now";
  const d = ts.toDate();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · " + d.toLocaleDateString();
}

/* --- realtime listener, newest first --- */
const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
onSnapshot(q, (snap) => {
  const items = [];
  snap.forEach(d => { const data = d.data(); if (!data.hidden) items.push({ id: d.id, ...data }); });

  countEl.textContent = items.length;

  if (!items.length) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🌸</div>Waiting for the first question…</div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="question-card ${item.answered ? "answered" : ""}">
      <div class="qtext">${esc(item.question)}</div>
      <div class="meta"><span class="name">${esc(item.name) || "Anonymous"}</span> · ${fmtTime(item.createdAt)}</div>
      <div class="actions">
        ${item.answered
          ? '<span class="chip answered-label">✓ Answered</span>'
          : `<button class="chip answer" data-answer="${item.id}">Mark as answered</button>`}
        <button class="chip hide" data-hide="${item.id}">Hide question</button>
      </div>
    </div>`).join("");
});

/* --- actions --- */
list.addEventListener("click", async (e) => {
  const answerId = e.target.getAttribute("data-answer");
  const hideId = e.target.getAttribute("data-hide");
  try {
    if (answerId) await updateDoc(doc(db, "questions", answerId), { answered: true });
    if (hideId) await updateDoc(doc(db, "questions", hideId), { hidden: true });
  } catch (err) {
    alert("Action failed — check your connection and try again.");
  }
});
