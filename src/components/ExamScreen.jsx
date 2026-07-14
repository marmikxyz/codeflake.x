import { useState, useEffect, useCallback, useRef } from "react";

export default function ExamScreen({ exam, onExit }) {
  const { test, lang } = exam;
  const [phase, setPhase] = useState("loading");
  const [meta, setMeta] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const timerRef = useRef(null);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const startTimer = useCallback((minutes) => {
    const total = parseInt(minutes, 10) * 60 || 3600;
    setTimeLeft(total);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/tests/${test.id}/paper?lang=${lang}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Paper load failed");
        if (!mounted) return;
        const m = json.data?.test;
        const qs = json.data?.questions || [];
        if (!m || !qs.length) throw new Error("No questions found");
        setMeta(m);
        setQuestions(qs);
        setPhase("taking");
        startTimer(m.time);
      } catch (err) {
        alert("Failed to load paper: " + err.message);
        onExit();
      }
    })();
    return () => { mounted = false; stopTimer(); };
  }, [test, lang]);

  useEffect(() => {
    if (timeLeft === 0 && phase === "taking" && meta) {
      submit(true);
    }
  }, [timeLeft]);

  const currentQ = questions[index];

  const selectAnswer = (qId, key) => {
    setAnswers((prev) => ({ ...prev, [qId]: key }));
  };

  const goToQuestion = (i) => {
    if (i < 0 || i >= questions.length) return;
    setIndex(i);
    setPaletteOpen(false);
  };

  const submit = async (auto) => {
    stopTimer();
    if (!auto && Object.keys(answers).length === 0) {
      if (!confirm("No answers given. Submit?")) return;
    }
    setPhase("loading");
    try {
      const res = await fetch(`/api/tests/${test.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Submit failed");
      setResult(json.data);
      setPhase("result");
    } catch (err) {
      alert("Submit error: " + err.message);
      setPhase("taking");
      startTimer(Math.ceil(timeLeft / 60));
    }
  };

  const showReview = async () => {
    if (!result) return;
    setReviewData(result.details);
    setPhase("review");
  };

  const handleExit = () => {
    if (phase === "taking") {
      if (!confirm("Leave the test? Progress will not be saved.")) return;
    } else if (phase === "result") {
      if (!confirm("Go back to tests?")) return;
    }
    stopTimer();
    onExit();
  };

  if (phase === "loading") {
    return (
      <div className="exam-screen">
        <button className="exam-exit-btn" onClick={handleExit} title="Exit">✕</button>
        <div className="exam-loading">
          <div className="loader-ring" />
          <p>{result ? "Calculating result..." : "Loading paper..."}</p>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="exam-screen">
        <button className="exam-exit-btn" onClick={handleExit} title="Exit">✕</button>
        <div className="exam-result-wrap">
          <div className="result-header">
            <div className="result-score-ring">{result.accuracy}%</div>
            <h2>Test Complete!</h2>
            <p className="result-sub">Your performance summary</p>
          </div>
          <div className="result-grid">
            <div className="result-card gold"><div className="val">{result.score}/{result.max_score}</div><div className="lbl">Score</div></div>
            <div className="result-card blue"><div className="val">{result.accuracy}%</div><div className="lbl">Accuracy</div></div>
            <div className="result-card green"><div className="val">{result.correct}</div><div className="lbl">Correct</div></div>
            <div className="result-card red"><div className="val">{result.wrong}</div><div className="lbl">Wrong</div></div>
            <div className="result-card"><div className="val">{result.attempted}</div><div className="lbl">Attempted</div></div>
            <div className="result-card"><div className="val">{result.unattempted}</div><div className="lbl">Skipped</div></div>
          </div>
          <div className="result-actions">
            <button className="btn btn-primary btn-block" onClick={showReview}>Review Answers</button>
            <button className="btn btn-outline btn-block" onClick={handleExit}>Back to Tests</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "review" && reviewData) {
    const labels = { correct: "Correct", wrong: "Wrong", unattempted: "Skipped" };
    return (
      <div className="exam-screen">
        <button className="exam-exit-btn" onClick={handleExit} title="Exit">✕</button>
        <div className="review-top">
          <h2>Answer Review</h2>
          <button className="btn btn-outline btn-sm" onClick={() => setPhase("result")}>Back</button>
        </div>
        <div className="review-list">
          {reviewData.map((d, i) => (
            <div key={i} className={`review-item ${d.status}`}>
              <div className={`review-status ${d.status}`}>Q{d.index} — {labels[d.status]}</div>
              <div className="review-q" dangerouslySetInnerHTML={{ __html: d.question }} />
              <div className="review-ans"><span>Your answer: </span>{d.user_answer_text || "—"}</div>
              <div className="review-ans"><span>Correct answer: </span>{d.correct_answer_text || "—"}</div>
              {d.solution_text && (
                <div className="review-solution">
                  <strong>Solution:</strong><br />
                  <span dangerouslySetInnerHTML={{ __html: d.solution_text }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "taking" && currentQ) {
    const total = questions.length;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="exam-screen">
        <button className="exam-exit-btn" onClick={handleExit} title="Exit">✕</button>
        <div className="exam-top-sticky">
          <div className="exam-header">
            <div className="exam-header-info">
              <div className="exam-title">
                {meta.title}{lang === "hindi" ? " (Hindi)" : " (English)"}
              </div>
              <div className="exam-progress">
                Question {currentQ.index} of {total} · {answeredCount} answered
              </div>
            </div>
            <div className={`exam-timer${timeLeft <= 300 ? " danger" : ""}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
          <div className="exam-progress-bar">
            <div className="exam-progress-fill" style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>
          <div className="exam-palette-wrap">
            <p className="exam-palette-label">Questions</p>
            <div className="exam-palette">
              {questions.map((item, i) => (
                <button
                  key={item.id}
                  className={`palette-item${answers[item.id] ? " answered" : ""}${i === index ? " current" : ""}`}
                  onClick={() => goToQuestion(i)}
                >
                  {item.index}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="exam-question">
          <span className="q-badge">Q {currentQ.index}</span>
          <div dangerouslySetInnerHTML={{ __html: currentQ.question }} />
        </div>

        <div className="exam-options">
          {currentQ.options.map((opt) => (
            <button
              key={opt.key}
              className={`opt-btn${answers[currentQ.id] === opt.key ? " selected" : ""}`}
              onClick={() => selectAnswer(currentQ.id, opt.key)}
            >
              <span className="opt-key">{opt.key}</span>
              <span className="opt-text" dangerouslySetInnerHTML={{ __html: opt.text }} />
            </button>
          ))}
        </div>

        <div className="exam-footer">
          <button className="btn btn-outline btn-sm" disabled={index === 0}
            onClick={() => goToQuestion(index - 1)}>← Prev</button>
          <button className="btn btn-outline btn-sm" onClick={() => setPaletteOpen(true)}>Q List</button>
          <button className="btn btn-primary btn-sm" disabled={index === total - 1}
            onClick={() => goToQuestion(index + 1)}>Next →</button>
          <button className="btn btn-danger btn-block"
            onClick={() => { if (confirm("Submit test?")) submit(false); }}>Submit Test</button>
        </div>

        {paletteOpen && (
          <>
            <div className="exam-palette-backdrop" onClick={() => setPaletteOpen(false)} />
            <div className="exam-palette-panel">
              <div className="exam-palette-panel-head">
                <span>Question List</span>
                <button className="btn btn-outline btn-sm" onClick={() => setPaletteOpen(false)}>Close</button>
              </div>
              <div className="exam-palette-panel-grid">
                {questions.map((item, i) => (
                  <button
                    key={item.id}
                    className={`palette-item${answers[item.id] ? " answered" : ""}${i === index ? " current" : ""}`}
                    onClick={() => goToQuestion(i)}
                  >
                    {item.index}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
