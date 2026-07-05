// Participant page — submits questions to Firestore.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById("question-form");
const nameInput = document.getElementById("name");
const questionInput = document.getElementById("question");
const submitBtn = document.getElementById("submit-btn");
const successBox = document.getElementById("success");
const errorMsg = document.getElementById("error-msg");
const chars = document.getElementById("chars");
const askAgain = document.getElementById("ask-again");

questionInput.addEventListener("input", () => {
  chars.textContent = questionInput.value.length;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.classList.remove("visible");

  const question = questionInput.value.trim();
  const name = nameInput.value.trim();

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

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";

  try {
    await addDoc(collection(db, "questions"), {
      name: name.slice(0, 60),
      question,
      createdAt: serverTimestamp(),
      answered: false,
      hidden: false
    });
    form.style.display = "none";
    successBox.classList.add("visible");
  } catch (err) {
    errorMsg.textContent = "Something went wrong — please try again.";
    errorMsg.classList.add("visible");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send question";
  }
});

askAgain.addEventListener("click", () => {
  questionInput.value = "";
  chars.textContent = "0";
  successBox.classList.remove("visible");
  form.style.display = "";
  questionInput.focus();
});
