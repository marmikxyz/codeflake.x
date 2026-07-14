/** Test engine: paper fetch, attempt, submit, review */

const Exam = (() => {
  const state = {
    test: null,
    lang: "english",
    meta: null,
    questions: [],
    answers: {},
    index: 0,
    timerId: null,
    timeLeft: 0,
    result: null,
    phase: null,
    controlsBound: false,
    paletteDelegationBound: false,
  };

  const el = {
    screen: document.getElementById("examScreen"),
    loading: document.getElementById("examLoading"),
    taking: document.getElementById("examTaking"),
    result: document.getElementById("examResult"),
    review: document.getElementById("examReview"),
    title: document.getElementById("examTitle"),
    progress: document.getElementById("examProgress"),
    progressFill: document.getElementById("examProgressFill"),
    timer: document.getElementById("examTimer"),
    question: document.getElementById("examQuestion"),
    options: document.getElementById("examOptions"),
    palette: document.getElementById("examPalette"),
    paletteWrap: document.getElementById("examPaletteWrap"),
    palettePanel: document.getElementById("examPalettePanel"),
    palettePanelGrid: document.getElementById("examPalettePanelGrid"),
    paletteBackdrop: document.getElementById("examPaletteBackdrop"),
    resultCards: document.getElementById("resultCards"),
    reviewList: document.getElementById("reviewList"),
    prev: null,
    next: null,
    paletteBtn: null,
    paletteClose: null,
    submit: null,
  };

  function refreshDomRefs() {
    el.palette = document.getElementById("examPalette");
    el.paletteWrap = document.getElementById("examPaletteWrap");
    el.palettePanel = document.getElementById("examPalettePanel");
    el.palettePanelGrid = document.getElementById("examPalettePanelGrid");
    el.paletteBackdrop = document.getElementById("examPaletteBackdrop");
    el.prev = document.getElementById("examPrev");
    el.next = document.getElementById("examNext");
    el.paletteBtn = document.getElementById("examPaletteBtn");
    el.paletteClose = document.getElementById("examPaletteClose");
    el.submit = document.getElementById("examSubmit");
  }

  function ensurePalettePanel() {
    const screen = el.screen || document.getElementById("examScreen");
    if (!screen) return;

    if (!document.getElementById("examPaletteBackdrop")) {
      const backdrop = document.createElement("div");
      backdrop.id = "examPaletteBackdrop";
      backdrop.className = "exam-palette-backdrop hidden";
      screen.appendChild(backdrop);
    }

    if (!document.getElementById("examPalettePanel")) {
      const panel = document.createElement("div");
      panel.id = "examPalettePanel";
      panel.className = "exam-palette-panel hidden";
      panel.innerHTML = `
        <div class="exam-palette-panel-head">
          <span>Question List</span>
          <button type="button" id="examPaletteClose" class="btn btn-outline btn-sm">Close</button>
        </div>
        <div id="examPalettePanelGrid" class="exam-palette-panel-grid"></div>`;
      screen.appendChild(panel);
    }

    if (!document.getElementById("examPalette") && document.getElementById("examPaletteWrap")) {
      const wrap = document.getElementById("examPaletteWrap");
      if (!wrap.querySelector("#examPalette")) {
        const strip = document.createElement("div");
        strip.id = "examPalette";
        strip.className = "exam-palette";
        wrap.appendChild(strip);
      }
    }

    refreshDomRefs();
  }

  function proxyImageUrl(src) {
    if (!src || src.startsWith("/api/img-proxy")) return src;
    if (src.startsWith("http://") || src.startsWith("https://")) {
      return `/api/img-proxy?url=${encodeURIComponent(src)}`;
    }
    if (src.startsWith("//")) {
      return `/api/img-proxy?url=${encodeURIComponent("https:" + src)}`;
    }
    return src;
  }

  function fixMediaIn(root) {
    if (!root) return;
    root.querySelectorAll("img").forEach((img) => {
      const raw = img.getAttribute("src") || "";
      if (!raw) return;
      img.referrerPolicy = "no-referrer";
      img.loading = "lazy";
      img.decoding = "async";
      img.removeAttribute("width");
      img.removeAttribute("height");
      const proxied = proxyImageUrl(raw);
      if (proxied !== raw) img.src = proxied;
      img.onerror = () => {
        if (img.dataset.fallback === "1" && img.src === raw) {
          img.classList.add("img-broken");
          img.alt = img.alt || "Image not available";
          return;
        }
        if (!img.dataset.fallback) {
          img.dataset.fallback = "1";
          if (img.src !== raw) img.src = raw;
          return;
        }
        img.classList.add("img-broken");
        img.alt = img.alt || "Image not available";
      };
    });
  }

  function isActive() {
    return el.screen && !el.screen.classList.contains("hidden");
  }

  function phase(name) {
    state.phase = name;
    el.loading.classList.toggle("hidden", name !== "loading");
    el.taking.classList.toggle("hidden", name !== "taking");
    el.result.classList.toggle("hidden", name !== "result");
    el.review.classList.toggle("hidden", name !== "review");
    el.paletteWrap?.classList.toggle("hidden", name !== "taking");
    el.screen.classList.remove("hidden");
    document.getElementById("appShell")?.classList.add("hidden");
    closePalettePanel();
  }

  function hide() {
    el.screen.classList.add("hidden");
    document.getElementById("appShell")?.classList.remove("hidden");
    stopTimer();
    closePalettePanel();
    state.phase = null;
    state.controlsBound = false;
    if (window.AppNav?.syncHistoryAfterExamExit) {
      window.AppNav.syncHistoryAfterExamExit();
    }
  }

  function forceHide() {
    stopTimer();
    closePalettePanel();
    el.screen.classList.add("hidden");
    document.getElementById("appShell")?.classList.remove("hidden");
    state.phase = null;
    state.controlsBound = false;
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function startTimer(minutes) {
    state.timeLeft = parseInt(minutes, 10) * 60 || 3600;
    const tick = () => {
      el.timer.textContent = formatTime(state.timeLeft);
      el.timer.classList.toggle("danger", state.timeLeft <= 300);
      if (state.timeLeft <= 0) {
        stopTimer();
        submit(true);
        return;
      }
      state.timeLeft -= 1;
    };
    tick();
    state.timerId = setInterval(tick, 1000);
  }

  function openPalettePanel() {
    ensurePalettePanel();
    fillPalettes();
    if (!el.palettePanel || !el.palettePanelGrid) return;
    el.palettePanel.classList.remove("hidden");
    el.paletteBackdrop?.classList.remove("hidden");
    scrollPaletteToCurrent(el.palettePanelGrid);
  }

  function closePalettePanel() {
    refreshDomRefs();
    el.palettePanel?.classList.add("hidden");
    el.paletteBackdrop?.classList.add("hidden");
  }

  function goToQuestion(i, fromHistory = false) {
    if (i < 0 || i >= state.questions.length || i === state.index) return;
    state.index = i;
    renderQuestion();
    if (!fromHistory && state.phase === "taking") {
      window.AppNav?.pushExamQuestion?.(i);
    }
  }

  function onPaletteClick(e) {
    const btn = e.target.closest(".palette-item");
    if (!btn) return;
    const i = parseInt(btn.dataset.qIndex, 10);
    if (Number.isNaN(i)) return;
    goToQuestion(i);
    closePalettePanel();
  }

  function bindPaletteDelegation() {
    if (state.paletteDelegationBound) return;
    const screen = el.screen || document.getElementById("examScreen");
    if (!screen) return;
    state.paletteDelegationBound = true;
    screen.addEventListener("click", (e) => {
      const paletteItem = e.target.closest(".palette-item");
      if (paletteItem && screen.contains(paletteItem)) {
        onPaletteClick(e);
        return;
      }
      if (e.target.closest("#examPaletteClose")) {
        closePalettePanel();
        return;
      }
      if (e.target.id === "examPaletteBackdrop") closePalettePanel();
    });
  }

  function scrollPaletteToCurrent(container) {
    const root = container || el.palettePanelGrid || el.palette;
    const cur = root?.querySelector(".palette-item.current");
    if (cur) {
      cur.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }

  function buildPaletteButtons(container) {
    if (!container) return;
    container.innerHTML = "";
    state.questions.forEach((item, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "palette-item";
      b.dataset.qIndex = String(i);
      if (state.answers[item.id]) b.classList.add("answered");
      if (i === state.index) b.classList.add("current");
      b.textContent = item.index;
      container.appendChild(b);
    });
  }

  function fillPalettes() {
    buildPaletteButtons(el.palette);
    buildPaletteButtons(el.palettePanelGrid);
    scrollPaletteToCurrent(el.palette);
  }

  function renderQuestion() {
    const q = state.questions[state.index];
    const total = state.questions.length;
    const answered = Object.keys(state.answers).length;

    el.progress.textContent = `Question ${q.index} of ${total} · ${answered} answered`;
    if (el.progressFill) {
      el.progressFill.style.width = `${((state.index + 1) / total) * 100}%`;
    }

    el.question.innerHTML = `<span class="q-badge">Q ${q.index}</span><div>${q.question}</div>`;
    fixMediaIn(el.question);
    el.options.innerHTML = "";

    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt-btn" + (state.answers[q.id] == opt.key ? " selected" : "");
      btn.innerHTML = `<span class="opt-key">${opt.key}</span><span class="opt-text">${opt.text}</span>`;
      fixMediaIn(btn);
      btn.onclick = () => {
        state.answers[q.id] = opt.key;
        renderQuestion();
      };
      el.options.appendChild(btn);
    });

    fillPalettes();

    if (el.prev) el.prev.disabled = state.index === 0;
    if (el.next) el.next.disabled = state.index === total - 1;
  }

  function bindControls() {
    refreshDomRefs();
    if (state.controlsBound) return;

    const missing = [];
    if (!el.prev) missing.push("examPrev");
    if (!el.next) missing.push("examNext");
    if (!el.paletteBtn) missing.push("examPaletteBtn");
    if (!el.submit) missing.push("examSubmit");
    if (missing.length) {
      throw new Error("Exam controls missing: " + missing.join(", "));
    }

    el.prev.onclick = () => {
      if (state.index > 0) goToQuestion(state.index - 1);
    };
    el.next.onclick = () => {
      if (state.index < state.questions.length - 1) goToQuestion(state.index + 1);
    };
    el.paletteBtn.onclick = () => openPalettePanel();
    if (el.paletteClose) {
      el.paletteClose.onclick = () => closePalettePanel();
    }
    el.submit.onclick = () => {
      if (confirm("Test submit karna hai?")) submit(false);
    };

    state.controlsBound = true;
  }

  function getPhase() {
    return state.phase;
  }

  function confirmLeave() {
    if (state.phase === "review") return true;
    if (state.phase === "result") {
      return confirm("Test list par wapas jana hai?");
    }
    if (state.phase === "taking") {
      return confirm("Test chhodna hai? Progress save nahi hogi.");
    }
    return true;
  }

  function restorePhase(phase, questionIndex) {
    closePalettePanel();
    state.phase = phase;
    el.loading.classList.add("hidden");
    el.taking.classList.toggle("hidden", phase !== "taking");
    el.result.classList.toggle("hidden", phase !== "result");
    el.review.classList.toggle("hidden", phase !== "review");
    el.paletteWrap?.classList.toggle("hidden", phase !== "taking");
    if (phase === "taking") {
      if (typeof questionIndex === "number" && questionIndex >= 0 && questionIndex < state.questions.length) {
        state.index = questionIndex;
      }
      renderQuestion();
    }
  }

  function handleBrowserBack() {
    return confirmLeave();
  }

  async function submit(auto) {
    stopTimer();
    if (!auto && !Object.keys(state.answers).length && !confirm("Koi answer nahi diya. Submit?")) return;

    phase("loading");
    el.loading.querySelector("p").textContent = "Result calculate ho raha hai...";

    try {
      const res = await fetch(`/api/tests/${state.test.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: state.lang, answers: state.answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Submit failed");
      state.result = json.data;
      showResult();
      window.AppNav?.replaceExamPhase("result");
    } catch (err) {
      alert("Submit error: " + err.message);
      phase("taking");
      startTimer(Math.ceil(state.timeLeft / 60));
      window.AppNav?.replaceExamPhase("taking");
    } finally {
      el.loading.querySelector("p").textContent = "Paper load ho raha hai...";
    }
  }

  function showResult() {
    const r = state.result;
    const ring = document.getElementById("resultScoreRing");
    if (ring) ring.textContent = `${r.accuracy}%`;
    el.resultCards.innerHTML = `
      <div class="result-card gold"><div class="val">${r.score}/${r.max_score}</div><div class="lbl">Score</div></div>
      <div class="result-card blue"><div class="val">${r.accuracy}%</div><div class="lbl">Accuracy</div></div>
      <div class="result-card green"><div class="val">${r.correct}</div><div class="lbl">Sahi</div></div>
      <div class="result-card red"><div class="val">${r.wrong}</div><div class="lbl">Galat</div></div>
      <div class="result-card"><div class="val">${r.attempted}</div><div class="lbl">Attempted</div></div>
      <div class="result-card"><div class="val">${r.unattempted}</div><div class="lbl">Skipped</div></div>
    `;
    phase("result");
    document.getElementById("reviewBtn").onclick = () => {
      showReview();
      window.AppNav?.pushExamPhase("review");
    };
    document.getElementById("exitExamBtn").onclick = () => hide();
  }

  function showReview() {
    el.reviewList.innerHTML = "";
    const labels = { correct: "Sahi", wrong: "Galat", unattempted: "Skipped" };

    state.result.details.forEach((d) => {
      const div = document.createElement("div");
      div.className = `review-item ${d.status}`;
      div.innerHTML = `
        <div class="review-status ${d.status}">Q${d.index} — ${labels[d.status]}</div>
        <div class="review-q">${d.question}</div>
        <div class="review-ans"><span>Aapka jawab: </span>${d.user_answer_text || "—"}</div>
        <div class="review-ans"><span>Sahi jawab: </span>${d.correct_answer_text || "—"}</div>
        ${d.solution_text ? `<div class="review-solution"><strong>Solution:</strong><br>${d.solution_text}</div>` : ""}
      `;
      fixMediaIn(div);
      el.reviewList.appendChild(div);
    });

    phase("review");
    document.getElementById("closeReviewBtn").onclick = showResult;
  }

  async function start(test, lang) {
    stopTimer();
    ensurePalettePanel();
    state.test = test;
    state.lang = lang;
    state.answers = {};
    state.index = 0;
    state.result = null;
    state.controlsBound = false;
    phase("loading");

    try {
      const res = await fetch(`/api/tests/${test.id}/paper?lang=${lang}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Paper load failed");

      state.meta = json.data?.test;
      state.questions = json.data?.questions || [];
      if (!state.meta || !state.questions.length) {
        throw new Error("Paper me koi question nahi mila");
      }

      el.title.textContent = state.meta.title + (lang === "hindi" ? " (Hindi)" : " (English)");
      phase("taking");
      startTimer(state.meta.time);
      bindPaletteDelegation();
      renderQuestion();
      bindControls();
      window.AppNav?.pushExamState("taking", 0);
    } catch (err) {
      alert("Paper load nahi hua: " + err.message);
      hide();
    }
  }

  function getQuestionIndex() {
    return state.index;
  }

  return { start, isActive, forceHide, handleBrowserBack, getPhase, getQuestionIndex, confirmLeave, restorePhase };
})();
