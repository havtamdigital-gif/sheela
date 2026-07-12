// Public page — role chooser, session creation (speaker), question form (participant).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, setDoc, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const show = (id) => {
  ["home", "create", "ask", "not-found"].forEach(v => $(v).style.display = v === id ? "" : "none");
};

/* ---------- routing ---------- */
const sessionCode = (new URLSearchParams(location.search).get("s") || "").toUpperCase();

if (sessionCode) {
  const snap = await getDoc(doc(db, "sessions", sessionCode));
  if (snap.exists() && !snap.data().ended) {
    const s = snap.data();
    $("session-title").innerHTML =
      `<strong>${escHtml(s.title)}</strong>${s.speaker ? "<br><span>with " + escHtml(s.speaker) + "</span>" : ""}`;
    show("ask");
  } else {
    show("not-found");
  }
} else {
  show("home");
}

function escHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- home: role choice ---------- */
$("role-speaker").addEventListener("click", () => show("create"));
$("create-back").addEventListener("click", () => show("home"));

$("role-join").addEventListener("click", () => {
  const row = $("role-join").querySelector(".join-row");
  row.style.display = "";
  $("join-code").focus();
});
async function joinByCode() {
  const code = $("join-code").value.trim().toUpperCase();
  if (code.length !== 4) return;
  location.href = "./?s=" + code;
}
$("join-btn").addEventListener("click", joinByCode);
$("join-code").addEventListener("keydown", e => { if (e.key === "Enter") joinByCode(); });

/* ---------- speaker: create session ---------- */
$("create-btn").addEventListener("click", async () => {
  const title = $("talk-title").value.trim();
  const err = $("create-error");
  err.classList.remove("visible");
  if (!title) {
    err.textContent = "Please give your talk a title.";
    err.classList.add("visible");
    return;
  }
  $("create-btn").disabled = true;
  $("create-btn").textContent = "Creating…";
  try {
    let code, exists;
    do {
      code = Array.from({ length: 4 }, () =>
        "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join("");
      exists = (await getDoc(doc(db, "sessions", code))).exists();
    } while (exists);

    await setDoc(doc(db, "sessions", code), {
      code,
      title: title.slice(0, 120),
      speaker: $("speaker-name").value.trim().slice(0, 60),
      createdAt: serverTimestamp(),
      ended: false
    });
    // remember my sessions on this device
    const mine = JSON.parse(localStorage.getItem("Sheela Li Li-my-sessions") || "[]");
    mine.push(code);
    localStorage.setItem("Sheela Li Li-my-sessions", JSON.stringify(mine));
    location.href = "speaker.html?c=" + code;
  } catch (e) {
    err.textContent = "Could not create the session — please try again.";
    err.classList.add("visible");
    $("create-btn").disabled = false;
    $("create-btn").textContent = "Create session";
  }
});

/* ---------- participant: ask ---------- */
const form = $("question-form");
const questionInput = $("question");
questionInput.addEventListener("input", () => { $("chars").textContent = questionInput.value.length; });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorMsg = $("error-msg");
  errorMsg.classList.remove("visible");

  const question = questionInput.value.trim();
  if (!question) {
    errorMsg.textContent = "Please write a question before sending.";
    errorMsg.classList.add("visible");
    return;
  }
  if (question.length > 500) {
    errorMsg.textContent = "Please keep your question under 500 characters.";
    errorMsg.classList.add("visible");
    return;
  }

  const btn = $("submit-btn");
  btn.disabled = true;
  btn.textContent = "Sending…";
  try {
    await addDoc(collection(db, "questions"), {
      sessionCode,
      name: $("name").value.trim().slice(0, 60),
      question,
      createdAt: serverTimestamp(),
      answered: false,
      hidden: false
    });
    form.style.display = "none";
    $("success").classList.add("visible");
  } catch (err) {
    errorMsg.textContent = "Something went wrong — please try again.";
    errorMsg.classList.add("visible");
  } finally {
    btn.disabled = false;
    btn.textContent = "Send question";
  }
});

$("ask-again").addEventListener("click", () => {
  questionInput.value = "";
  $("chars").textContent = "0";
  $("success").classList.remove("visible");
  form.style.display = "";
  questionInput.focus();
});
