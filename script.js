/* =============================================================
   SPEAK UP — App Logic
   In-memory state only (no localStorage — session resets on reload)
   ============================================================= */

/* ---------- Data ---------- */
const LESSONS = [
  {
    id: 1,
    title: "Perkenalan Diri",
    desc: "Latih cara memperkenalkan diri dengan percaya diri.",
    sentence: "Hi, my name is Alex and I am happy to meet you."
  },
  {
    id: 2,
    title: "Memesan di Kafe",
    desc: "Latih percakapan santai saat memesan makanan atau minuman.",
    sentence: "Can I have a medium latte with oat milk, please?"
  },
  {
    id: 3,
    title: "Menanyakan Arah",
    desc: "Latih cara bertanya dan memahami arah jalan.",
    sentence: "Excuse me, could you tell me how to get to the train station?"
  },
  {
    id: 4,
    title: "Wawancara Kerja",
    desc: "Latih menjawab pertanyaan dasar wawancara kerja.",
    sentence: "I believe my communication skills make me a great fit for this role."
  },
  {
    id: 5,
    title: "Membicarakan Rencana Akhir Pekan",
    desc: "Latih percakapan ringan seputar aktivitas akhir pekan.",
    sentence: "I usually spend my weekend hiking or reading a good book."
  }
];

const BADGES = [
  { id: "first-step", name: "Langkah Pertama", icon: "🥇", check: s => s.completedLessons.length >= 1 },
  { id: "halfway", name: "Setengah Jalan", icon: "🚀", check: s => s.completedLessons.length >= 3 },
  { id: "all-star", name: "Speaking Master", icon: "🏆", check: s => s.completedLessons.length >= 5 },
  { id: "streak-3", name: "Streak 3 Hari", icon: "🔥", check: s => s.streak >= 3 },
  { id: "quiz-master", name: "Quiz Master", icon: "🧠", check: s => s.quizBestScore >= 8 },
  { id: "perfect-quiz", name: "Nilai Sempurna", icon: "💯", check: s => s.quizBestScore === 10 }
];

const QUIZ_QUESTIONS = [
  { q: "What is the correct greeting in the morning?", options: ["Good night", "Good morning", "Good bye", "Good evening"], answer: 1 },
  { q: "Choose the correct sentence.", options: ["She go to school", "She goes to school", "She going to school", "She gone to school"], answer: 1 },
  { q: "What does \"fluent\" mean?", options: ["Speaking a language easily and accurately", "Speaking very loudly", "Writing quickly", "Reading slowly"], answer: 0 },
  { q: "Complete: \"I ___ a student.\"", options: ["is", "am", "are", "be"], answer: 1 },
  { q: "Which word means \"terima kasih\"?", options: ["Sorry", "Please", "Thank you", "Excuse me"], answer: 2 },
  { q: "Choose the correct question form.", options: ["Where you are from?", "Where are you from?", "From where you are?", "You are from where?"], answer: 1 },
  { q: "What is the opposite of \"expensive\"?", options: ["Cheap", "Costly", "Large", "Heavy"], answer: 0 },
  { q: "Complete: \"They ___ playing football now.\"", options: ["is", "am", "are", "be"], answer: 2 },
  { q: "Which is a polite way to ask for help?", options: ["Give me that!", "Could you help me, please?", "Help now.", "You must help me."], answer: 1 },
  { q: "What does \"weekend\" refer to?", options: ["Monday and Tuesday", "The middle of the week", "Saturday and Sunday", "The first day of the month"], answer: 2 }
];

/* ---------- State ---------- */
const state = {
  user: { name: "Pelajar", email: "" },
  xp: 0,
  streak: 1,
  completedLessons: [],
  quizBestScore: null,
  currentLessonId: 1,
  lastLessonScore: null
};

let quizRuntime = { index: 0, score: 0, answers: [], locked: false };
let recognitionActive = false;

/* ---------- Helpers ---------- */
function levelFromXp(xp){
  const level = Math.floor(xp / 100) + 1;
  const into = xp % 100;
  return { level, into, needed: 100 };
}

function $(sel, root = document){ return root.querySelector(sel); }
function $all(sel, root = document){ return Array.from(root.querySelectorAll(sel)); }

/* ---------- View switching (landing / login / app) ---------- */
function showView(name){
  $all(".view").forEach(v => v.classList.toggle("active", v.dataset.view === name));
  closeMobileMenu();
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

$all("[data-nav]").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    showView(el.dataset.nav);
  });
});

/* Landing mobile menu */
const hamburgerBtn = $("#hamburgerBtn");
const mobileMenu = $("#mobileMenu");
function closeMobileMenu(){ mobileMenu.classList.remove("open"); }
hamburgerBtn.addEventListener("click", () => mobileMenu.classList.toggle("open"));
$all("#mobileMenu a").forEach(a => a.addEventListener("click", closeMobileMenu));

/* Landing smooth-scroll buttons */
$all("[data-scroll]").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

/* ---------- App sidebar (mobile) ---------- */
const sidebar = $("#sidebar");
function closeSidebar(){ sidebar.classList.remove("open"); }
$("#mobileNavBtn").addEventListener("click", () => sidebar.classList.toggle("open"));

/* ---------- Auth ---------- */
let authMode = "login"; // "login" | "signup"
const authForm = $("#authForm");
const authTitle = $("#authTitle");
const authSub = $("#authSub");
const authError = $("#authError");
const fieldName = $("#fieldName");
const authSubmit = $("#authSubmit");
const authSwitchText = $("#authSwitchText");
const authSwitchLink = $("#authSwitchLink");

function setAuthMode(mode){
  authMode = mode;
  authError.textContent = "";
  if (mode === "signup"){
    authTitle.textContent = "Buat akun baru";
    authSub.textContent = "Mulai perjalanan speaking-mu hari ini.";
    fieldName.style.display = "flex";
    authSubmit.textContent = "Daftar";
    authSwitchText.textContent = "Sudah punya akun?";
    authSwitchLink.textContent = "Masuk";
  } else {
    authTitle.textContent = "Selamat datang kembali";
    authSub.textContent = "Masuk untuk lanjutkan progres belajarmu.";
    fieldName.style.display = "none";
    authSubmit.textContent = "Masuk";
    authSwitchText.textContent = "Belum punya akun?";
    authSwitchLink.textContent = "Daftar";
  }
}

$("#authSwitchLink").addEventListener("click", e => {
  e.preventDefault();
  setAuthMode(authMode === "login" ? "signup" : "login");
});

authForm.addEventListener("submit", e => {
  e.preventDefault();
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  const name = $("#authName").value.trim();

  if (!email || !email.includes("@")){
    authError.textContent = "Masukkan alamat email yang valid.";
    return;
  }
  if (password.length < 6){
    authError.textContent = "Kata sandi minimal 6 karakter.";
    return;
  }
  if (authMode === "signup" && !name){
    authError.textContent = "Masukkan nama lengkapmu.";
    return;
  }

  authError.textContent = "";
  state.user.email = email;
  state.user.name = authMode === "signup" ? name : (email.split("@")[0] || "Pelajar");
  enterApp();
});

$("#guestBtn").addEventListener("click", () => {
  state.user.name = "Tamu";
  state.user.email = "tamu@speakup.app";
  enterApp();
});

$("#logoutBtn").addEventListener("click", () => {
  showView("landing");
});

/* ---------- Entering the app ---------- */
function enterApp(){
  showView("app");
  showPage("dashboard");
  renderAll();
}

/* ---------- App page switching ---------- */
const PAGE_TITLES = {
  dashboard: "Dashboard",
  speaking: "Speaking",
  lesson: "Speaking Lesson",
  quiz: "Quiz",
  profile: "Profile"
};

function showPage(name){
  $all(".page-panel").forEach(p => p.classList.toggle("active", p.dataset.page === name));
  $all(".sidebar-link").forEach(l => l.classList.toggle("active", l.dataset.page === name));
  $("#pageTitle").textContent = PAGE_TITLES[name] || "";
  closeSidebar();
  if (name === "quiz") resetQuizView();
  if (name !== "lesson") stopRecognition();
}

$all(".sidebar-link").forEach(link => {
  link.addEventListener("click", () => showPage(link.dataset.page));
});
$all(".link-back").forEach(el => {
  el.addEventListener("click", () => showPage(el.dataset.page));
});

/* ---------- Render: topbar + dashboard + badges ---------- */
function renderAll(){
  renderTopbar();
  renderDashboard();
  renderLessonGrid();
  renderBadges();
  renderProfile();
}

function renderTopbar(){
  $("#topbarStreak").textContent = state.streak;
  $("#topbarXp").textContent = state.xp;
  const initials = (state.user.name || "U").trim().slice(0, 1).toUpperCase();
  $("#topbarAvatar").textContent = initials;
  $("#profileAvatar").textContent = initials;
}

function renderDashboard(){
  $("#dashName").textContent = state.user.name;
  $("#statXp").textContent = state.xp;
  $("#statStreak").textContent = state.streak + " hari";
  $("#statLessons").textContent = state.completedLessons.length + "/5";
  $("#statQuiz").textContent = state.quizBestScore === null ? "–" : state.quizBestScore + "/10";

  const { level, into } = levelFromXp(state.xp);
  $("#levelFill").style.width = into + "%";
  $("#levelNote").textContent = "Level " + level;

  const nextLesson = LESSONS.find(l => !state.completedLessons.includes(l.id));
  if (nextLesson){
    $("#continueTitle").textContent = `Lanjut Lesson ${nextLesson.id}: ${nextLesson.title}`;
    $("#continueDesc").textContent = nextLesson.desc;
    $("#continueBtn").textContent = "Lanjutkan →";
    $("#continueBtn").onclick = () => openLesson(nextLesson.id);
  } else {
    $("#continueTitle").textContent = "Semua lesson selesai! 🎉";
    $("#continueDesc").textContent = "Coba kerjakan kuis untuk menguji pemahamanmu.";
    $("#continueBtn").textContent = "Ke Quiz →";
    $("#continueBtn").onclick = () => showPage("quiz");
  }
}

function renderBadges(){
  const unlocked = BADGES.filter(b => b.check(state)).map(b => b.id);
  [$("#badgeGrid"), $("#profileBadgeGrid")].forEach(grid => {
    grid.innerHTML = BADGES.map(b => `
      <div class="badge ${unlocked.includes(b.id) ? "unlocked" : ""}">
        <span class="badge__icon">${b.icon}</span>
        <span class="badge__name">${b.name}</span>
      </div>
    `).join("");
  });
}

function renderProfile(){
  $("#profileName").value = state.user.name;
  $("#profileEmail").value = state.user.email;
  $("#pStatXp").textContent = state.xp;
  $("#pStatLevel").textContent = levelFromXp(state.xp).level;
  $("#pStatStreak").textContent = state.streak;
  $("#pStatLessons").textContent = state.completedLessons.length + "/5";
  $("#pStatQuiz").textContent = state.quizBestScore === null ? "–" : state.quizBestScore + "/10";
}

$("#saveProfileBtn").addEventListener("click", () => {
  const name = $("#profileName").value.trim();
  if (!name) return;
  state.user.name = name;
  renderTopbar();
  renderDashboard();
  const note = $("#saveNote");
  note.textContent = "Perubahan tersimpan.";
  setTimeout(() => { note.textContent = ""; }, 2500);
});

/* ---------- Speaking: lesson list ---------- */
function renderLessonGrid(){
  const grid = $("#lessonGrid");
  grid.innerHTML = LESSONS.map((l, i) => {
    const done = state.completedLessons.includes(l.id);
    const prevDone = i === 0 || state.completedLessons.includes(LESSONS[i - 1].id);
    const locked = !prevDone && !done;
    return `
      <button class="lesson-tile" data-lesson="${l.id}" ${locked ? "disabled" : ""}>
        <span class="lesson-tile__num">Lesson ${l.id}</span>
        <span class="lesson-tile__title">${l.title}</span>
        <span class="lesson-tile__desc">${l.desc}</span>
        <span class="lesson-tile__status">${done ? "✓ Selesai" : locked ? "🔒 Terkunci" : "Belum dimulai"}</span>
      </button>
    `;
  }).join("");
  $all(".lesson-tile").forEach(tile => {
    tile.addEventListener("click", () => openLesson(Number(tile.dataset.lesson)));
  });
}

/* ---------- Speaking: lesson detail ---------- */
function openLesson(id){
  state.currentLessonId = id;
  const lesson = LESSONS.find(l => l.id === id);
  $("#lessonEyebrow").textContent = "Lesson " + lesson.id;
  $("#lessonTitle").textContent = lesson.title;
  $("#lessonDesc").textContent = lesson.desc;
  $("#lessonSentence").textContent = lesson.sentence;
  $("#lessonResult").style.display = "none";
  $("#lessonTranscript").textContent = "—";
  $("#lessonNote").textContent = "";
  $("#recordBtn").disabled = false;
  $("#recordBtn").textContent = "🎤 Mulai Rekam";
  $("#recordWaveform").classList.remove("is-active");

  const idx = LESSONS.findIndex(l => l.id === id);
  $("#prevLessonBtn").disabled = idx === 0;
  $("#prevLessonBtn").style.visibility = idx === 0 ? "hidden" : "visible";
  $("#nextLessonBtn").textContent = idx === LESSONS.length - 1 ? "Selesai ✓" : "Selesai & Lanjut →";

  showPage("lesson");
}

$("#prevLessonBtn").addEventListener("click", () => {
  const idx = LESSONS.findIndex(l => l.id === state.currentLessonId);
  if (idx > 0) openLesson(LESSONS[idx - 1].id);
});

$("#nextLessonBtn").addEventListener("click", () => {
  const lesson = LESSONS.find(l => l.id === state.currentLessonId);
  if (!state.completedLessons.includes(lesson.id)){
    state.completedLessons.push(lesson.id);
    state.xp += 20;
    renderAll();
  }
  const idx = LESSONS.findIndex(l => l.id === lesson.id);
  if (idx < LESSONS.length - 1){
    openLesson(LESSONS[idx + 1].id);
  } else {
    showPage("speaking");
  }
});

/* Text-to-speech: listen to native pronunciation */
$("#listenBtn").addEventListener("click", () => {
  const sentence = LESSONS.find(l => l.id === state.currentLessonId).sentence;
  if (!("speechSynthesis" in window)){
    $("#lessonNote").textContent = "Browser ini tidak mendukung text-to-speech.";
    return;
  }
  const utter = new SpeechSynthesisUtterance(sentence);
  utter.lang = "en-US";
  utter.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
});

/* Speech recognition: record & score pronunciation */
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null;

function stopRecognition(){
  if (recognizer && recognitionActive){
    recognizer.stop();
  }
}

function scoreTranscript(target, transcript){
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const targetWords = normalize(target);
  const heardWords = normalize(transcript);
  if (targetWords.length === 0) return 0;
  let matched = 0;
  const heardCopy = [...heardWords];
  targetWords.forEach(w => {
    const i = heardCopy.indexOf(w);
    if (i !== -1){ matched++; heardCopy.splice(i, 1); }
  });
  return Math.round((matched / targetWords.length) * 100);
}

function showLessonScore(score, transcript){
  $("#lessonResult").style.display = "flex";
  $("#lessonTranscript").textContent = transcript ? `"${transcript}"` : "(tidak ada suara terdeteksi)";
  $("#scoreValue").textContent = score + "%";
  const deg = Math.round((score / 100) * 360);
  const color = score >= 80 ? "var(--accent)" : score >= 50 ? "var(--gold)" : "var(--danger)";
  $("#scoreRing").style.background = `conic-gradient(${color} ${deg}deg, var(--surface-alt) 0deg)`;
  const feedback = $("#lessonFeedback");
  if (score >= 80){ feedback.textContent = "Pengucapan sangat bagus! 🎉"; }
  else if (score >= 50){ feedback.textContent = "Cukup baik, coba lagi untuk skor lebih tinggi."; }
  else { feedback.textContent = "Terus berlatih, dengarkan contoh lalu coba lagi."; }
}

$("#recordBtn").addEventListener("click", () => {
  const lesson = LESSONS.find(l => l.id === state.currentLessonId);
  const recordBtn = $("#recordBtn");
  const waveform = $("#recordWaveform");

  if (!SpeechRecognitionCtor){
    $("#lessonNote").textContent = "Browser ini tidak mendukung pengenalan suara. Coba gunakan Chrome di desktop/Android.";
    return;
  }

  if (recognitionActive){
    stopRecognition();
    return;
  }

  recognizer = new SpeechRecognitionCtor();
  recognizer.lang = "en-US";
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;

  recognitionActive = true;
  recordBtn.textContent = "⏹ Berhenti Merekam";
  waveform.classList.add("is-active");
  $("#lessonNote").textContent = "Mendengarkan... ucapkan kalimat di atas.";

  recognizer.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const score = scoreTranscript(lesson.sentence, transcript);
    showLessonScore(score, transcript);
  };

  recognizer.onerror = () => {
    $("#lessonNote").textContent = "Tidak dapat mengakses mikrofon atau suara tidak terdeteksi. Coba lagi.";
  };

  recognizer.onend = () => {
    recognitionActive = false;
    recordBtn.textContent = "🎤 Mulai Rekam";
    waveform.classList.remove("is-active");
  };

  try {
    recognizer.start();
  } catch (err) {
    recognitionActive = false;
    recordBtn.textContent = "🎤 Mulai Rekam";
    waveform.classList.remove("is-active");
    $("#lessonNote").textContent = "Gagal memulai perekaman. Coba lagi.";
  }
});

/* ---------- Quiz ---------- */
function resetQuizView(){
  quizRuntime = { index: 0, score: 0, answers: [], locked: false };
  $("#quizIntro").style.display = "block";
  $("#quizPlay").style.display = "none";
  $("#quizResult").style.display = "none";
}

$("#startQuizBtn").addEventListener("click", () => {
  quizRuntime = { index: 0, score: 0, answers: [], locked: false };
  $("#quizIntro").style.display = "none";
  $("#quizResult").style.display = "none";
  $("#quizPlay").style.display = "block";
  renderQuizQuestion();
});

function renderQuizQuestion(){
  const total = QUIZ_QUESTIONS.length;
  const q = QUIZ_QUESTIONS[quizRuntime.index];
  quizRuntime.locked = false;

  $("#quizProgressLabel").textContent = `Soal ${quizRuntime.index + 1}/${total}`;
  $("#quizProgressFill").style.width = `${((quizRuntime.index) / total) * 100}%`;
  $("#quizQuestion").textContent = q.q;

  const optionsWrap = $("#quizOptions");
  optionsWrap.innerHTML = q.options.map((opt, i) => `
    <button class="quiz-option" data-idx="${i}">${opt}</button>
  `).join("");

  $("#quizNextBtn").disabled = true;
  $("#quizNextBtn").textContent = quizRuntime.index === total - 1 ? "Lihat Hasil" : "Soal Berikutnya";

  $all(".quiz-option", optionsWrap).forEach(btn => {
    btn.addEventListener("click", () => {
      if (quizRuntime.locked) return;
      quizRuntime.locked = true;
      const chosen = Number(btn.dataset.idx);
      const correct = q.answer;
      $all(".quiz-option", optionsWrap).forEach(b => {
        b.disabled = true;
        const idx = Number(b.dataset.idx);
        if (idx === correct) b.classList.add("correct");
        else if (idx === chosen) b.classList.add("incorrect");
      });
      if (chosen === correct) quizRuntime.score++;
      quizRuntime.answers.push(chosen);
      $("#quizNextBtn").disabled = false;
    });
  });
}

$("#quizNextBtn").addEventListener("click", () => {
  if (quizRuntime.index < QUIZ_QUESTIONS.length - 1){
    quizRuntime.index++;
    renderQuizQuestion();
  } else {
    finishQuiz();
  }
});

function finishQuiz(){
  $("#quizPlay").style.display = "none";
  $("#quizResult").style.display = "block";

  const score = quizRuntime.score;
  const total = QUIZ_QUESTIONS.length;
  const earnedXp = score * 5;
  state.xp += earnedXp;
  if (state.quizBestScore === null || score > state.quizBestScore){
    state.quizBestScore = score;
  }

  $("#finalScoreValue").textContent = `${score}/${total}`;
  const deg = Math.round((score / total) * 360);
  const color = score >= 8 ? "var(--accent)" : score >= 5 ? "var(--gold)" : "var(--danger)";
  $("#finalScoreRing").style.background = `conic-gradient(${color} ${deg}deg, var(--surface-alt) 0deg)`;

  $("#quizResultTitle").textContent = score >= 8 ? "Luar Biasa! 🎉" : score >= 5 ? "Kerja Bagus!" : "Terus Berlatih!";
  $("#quizResultDesc").textContent = `Kamu menjawab benar ${score} dari ${total} soal dan mendapatkan +${earnedXp} XP.`;

  renderAll();
}

$("#retryQuizBtn").addEventListener("click", () => {
  $("#startQuizBtn").click();
});

$("#backDashBtn").addEventListener("click", () => {
  showPage("dashboard");
});

/* ---------- Init ---------- */
setAuthMode("login");
renderAll();