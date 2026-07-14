import { useState, useEffect, useCallback } from "react";

const CAT_SHADES = ["#ff7a1a", "#e8690f", "#cc6215", "#b35418", "#99461b", "#80381e", "#662a21", "#4d1c24"];
const CAT_FG = ["#0a0a0a", "#0a0a0a", "#fff", "#fff", "#fff", "#fff", "#fff", "#fff"];

export default function AppShell({ onStartExam }) {
  const [view, setView] = useState("categories");
  const [category, setCategory] = useState(null);
  const [series, setSeries] = useState(null);
  const [subject, setSubject] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchTimer, setSearchTimer] = useState(null);
  const [seriesHero, setSeriesHero] = useState(null);

  const fetchJSON = async (url) => {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Request failed");
    return json;
  };

  const loadCategories = useCallback(async (searchVal = "") => {
    setView("categories");
    setCategory(null);
    setSeries(null);
    setSubject(null);
    setSeriesHero(null);
    setLoading(true);
    try {
      const q = searchVal ? `?search=${encodeURIComponent(searchVal)}` : "";
      const json = await fetchJSON(`/api/exam-categories${q}`);
      setItems(json.data || []);
    } catch (err) {
      setItems([]);
    }
    setLoading(false);
  }, []);

  const loadSeries = useCallback(async (cat) => {
    setView("series");
    setCategory(cat);
    setSeries(null);
    setSubject(null);
    setSeriesHero(null);
    setLoading(true);
    try {
      const json = await fetchJSON(`/api/exam-categories/${cat.exam_id}/test-series`);
      setItems(json.data || []);
    } catch (err) {
      setItems([]);
    }
    setLoading(false);
  }, []);

  const loadSubjects = useCallback(async (s) => {
    setView("subjects");
    setSeries(s);
    setSubject(null);
    setSeriesHero(s);
    setLoading(true);
    try {
      const json = await fetchJSON(`/api/test-series/${s.id}/subjects`);
      setItems(json.data || []);
    } catch (err) {
      setItems([]);
    }
    setLoading(false);
  }, []);

  const loadTests = useCallback(async (sub) => {
    setView("tests");
    setSubject(sub);
    setLoading(true);
    try {
      const json = await fetchJSON(
        `/api/test-series/${series.id}/subjects/${sub.subject_id}/tests`
      );
      setItems(json.data || []);
    } catch (err) {
      setItems([]);
    }
    setLoading(false);
  }, [series]);

  useEffect(() => {
    loadCategories("");
  }, [loadCategories]);

  const goBack = () => {
    if (view === "categories") return;
    if (view === "series") loadCategories("");
    else if (view === "subjects") loadSeries(category);
    else if (view === "tests") loadSubjects(series);
  };

  const handleSearch = (val) => {
    setSearch(val);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => loadCategories(val.trim()), 300);
    setSearchTimer(t);
  };

  const crumbs = {
    categories: "Explore Categories",
    series: category?.exam_name || "Test Series",
    subjects: series?.title || "Subjects",
    tests: subject?.subject_name || "Mock Tests",
  };

  const labels = {
    categories: "All Exam Categories",
    series: "Choose Test Series",
    subjects: "Choose Subject",
    tests: "Choose Mock Test",
  };

  const isGrid2 = view === "subjects" || view === "tests";

  const renderCard = (item, idx) => {
    if (view === "categories") {
      const bg = CAT_SHADES[idx % CAT_SHADES.length];
      const fg = CAT_FG[idx % CAT_FG.length];
      const initial = (item.exam_name || "?").charAt(0).toUpperCase();
      return (
        <button key={idx} className="nav-card" onClick={() => loadSeries(item)}>
          <div className="nav-card-icon" style={{ background: bg, color: fg }}>{initial}</div>
          <div className="nav-card-body">
            <div className="nav-card-title">{item.exam_name || "Unnamed"}</div>
            <div className="nav-card-meta">{item.series_count || 0} test series available</div>
          </div>
          <span className="nav-card-chevron">›</span>
        </button>
      );
    }

    if (view === "series") {
      return (
        <button key={idx} className="series-card" onClick={() => loadSubjects(item)}>
          {item.banner ? (
            <img className="series-card-cover" src={item.banner} alt="" loading="lazy"
              onError={(e) => e.target.classList.add("hidden")} />
          ) : (
            <div className="series-card-cover series-card-cover-fallback" />
          )}
          <div className="series-card-body">
            <div className={`series-card-logo-wrap${item.logo ? "" : " fallback"}`}>
              {item.logo && (
                <img className="series-card-logo" src={item.logo} alt="" loading="lazy"
                  onError={(e) => e.target.closest(".series-card-logo-wrap").classList.add("fallback")} />
              )}
              <div className="series-card-logo-fb">📚</div>
            </div>
            <div className="series-card-info">
              <div className="series-card-title">{item.title}</div>
              <div className="series-card-badges">
                {item.exam_name && <span className="badge">{item.exam_name}</span>}
                {item.free_flag === "1" && <span className="badge badge-free">FREE</span>}
              </div>
            </div>
          </div>
        </button>
      );
    }

    if (view === "subjects") {
      return (
        <button key={idx} className="nav-card" onClick={() => loadTests(item)}>
          {item.logo ? (
            <img className="nav-card-thumb" src={item.logo} alt="" loading="lazy"
              onError={(e) => { e.target.outerHTML = '<div class="nav-card-icon subject">📖</div>'; }} />
          ) : (
            <div className="nav-card-icon subject">📖</div>
          )}
          <div className="nav-card-body">
            <div className="nav-card-title">{item.subject_name}</div>
            <div className="nav-card-meta">View mock tests →</div>
          </div>
          <span className="nav-card-chevron">›</span>
        </button>
      );
    }

    if (view === "tests") {
      const en = item.question_url_english;
      const hi = item.question_url_hindi;
      return (
        <div key={idx} className="mock-card">
          <div className="mock-card-top">
            <div className="mock-card-icon">📝</div>
            <div className="mock-card-info">
              <div className="mock-card-title">{item.title}</div>
              <div className="mock-card-stats">
                {item.free_flag === "1" && <span className="stat-chip free">FREE</span>}
                <span className="stat-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                  {item.time || "?"} min
                </span>
                <span className="stat-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                  {item.questions || "?"} Q
                </span>
                <span className="stat-chip">{item.marks || "?"} marks</span>
              </div>
            </div>
          </div>
          <div className="mock-card-actions">
            <button className="btn-lang btn-lang-en" disabled={!en}
              onClick={(e) => { e.stopPropagation(); onStartExam(item, "english"); }}>
              <span className="lang-flag">🇬🇧</span> English Start
            </button>
            <button className="btn-lang btn-lang-hi" disabled={!hi}
              onClick={(e) => { e.stopPropagation(); onStartExam(item, "hindi"); }}>
              <span className="lang-flag">🇮🇳</span> हिंदी Start
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-row">
          {view !== "categories" && (
            <button className="icon-btn" onClick={goBack} aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div className="header-text">
            <h1 className="app-logo">CodeFlake</h1>
            <p className="breadcrumb">{crumbs[view]}</p>
          </div>
        </div>
        {view === "categories" && (
          <div className="search-box">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder="Search exam category..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
      </header>

      <main className="app-main">
        {seriesHero && (view === "subjects" || view === "tests") && (
          <div className="series-hero">
            {seriesHero.banner ? (
              <img className="series-hero-banner" src={seriesHero.banner} alt="" loading="lazy"
                onError={(e) => e.target.remove()} />
            ) : (
              <div className="series-hero-banner series-hero-banner-fallback" />
            )}
            <div className="series-hero-body">
              {seriesHero.logo ? (
                <img className="series-hero-logo" src={seriesHero.logo} alt="" loading="lazy"
                  onError={(e) => { e.target.outerHTML = '<div class="series-hero-logo-fallback">📚</div>'; }} />
              ) : (
                <div className="series-hero-logo-fallback">📚</div>
              )}
              <div>
                <div className="series-hero-title">{seriesHero.title}</div>
                <div className="series-hero-meta">
                  {seriesHero.exam_name || category?.exam_name || ""}
                </div>
              </div>
            </div>
          </div>
        )}

        {labels[view] && <p className="section-label">{labels[view]}</p>}

        <div className={`card-grid${isGrid2 ? " grid-2" : ""}`}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="sk-block sk-avatar" />
                  <div style={{ flex: 1 }}>
                    <div className="sk-block sk-line lg" />
                    <div className="sk-block sk-line sm" />
                  </div>
                </div>
              ))
            : items.length === 0
            ? null
            : items.map((item, i) => renderCard(item, i))}
        </div>

        {!loading && items.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No data found</p>
          </div>
        )}
      </main>
    </div>
  );
}
