import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createTestSessionApi, deleteLessonApi, getLessonGroupsApi, getLessonsApi, getTeacherOverviewApi, moveLessonToGroupApi } from "../../api/endpoints";
import { percentage } from "../../components/AnswerDetails";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const groupFilter = searchParams.get("skupina") || "all";
  const [lessons, setLessons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const inFlight = useRef(false);

  const loadDashboardData = useCallback(async () => {
    const [lessonsResponse, overviewResponse, groupsResponse] = await Promise.all([getLessonsApi(), getTeacherOverviewApi(), getLessonGroupsApi()]);
    setLessons(lessonsResponse); setOverview(overviewResponse); setGroups(groupsResponse);
  }, []);
  useEffect(() => {
    loadDashboardData().catch((caught) => setError(caught.message)).finally(() => setLoading(false));
  }, [loadDashboardData]);

  async function mutate(lessonId, action) {
    if (inFlight.current) return;
    inFlight.current = true; setBusyId(lessonId); setError(""); setMessage("");
    try { await action(); }
    catch (caught) { setError(caught.message); }
    finally { inFlight.current = false; setBusyId(null); }
  }
  function handleDelete(lessonId) {
    if (!window.confirm("Opravdu chceš smazat lekci a její otázky? Lekci s pokusy, výsledky nebo QR relacemi nelze smazat.")) return;
    mutate(lessonId, async () => { await deleteLessonApi(lessonId); await loadDashboardData(); setMessage("Lekce smazána."); });
  }
  function move(lessonId, groupId) {
    mutate(lessonId, async () => { await moveLessonToGroupApi(lessonId, groupId || null); await loadDashboardData(); setMessage("Zařazení lekce bylo uloženo."); });
  }
  function createSession(lessonId) {
    mutate(lessonId, async () => { const result = await createTestSessionApi(lessonId); navigate(`/ucitel/qr/${result.sessionId}`); });
  }
  const visibleLessons = lessons.filter((lesson) => groupFilter === "all" || (groupFilter === "none" ? !lesson.group_id : String(lesson.group_id) === groupFilter));
  const newLessonUrl = `/ucitel/vytvorit${/^\d+$/.test(groupFilter) ? `?skupina=${groupFilter}` : ""}`;

  return <div className="teacherDashboard">
    <div className="card pageHeading"><div><h2>Hlavní menu učitele</h2></div><div className="btnRow"><Link className="linkBtn" to="/ucitel/skupiny">Třídy a skupiny</Link><Link className="linkBtn primary" to={newLessonUrl}>+ Vytvořit lekci</Link></div></div>
    {error && <div className="error" role="alert">{error}</div>}
    {message && <div className="ok" role="status">{message}</div>}
    {overview && <div className="resultsSummary">
      <div className="statCard"><div className="statLabel">Odpovědi celkem</div><div className="statValue">{overview.combinedAnswers}</div></div>
      <div className="statCard"><div className="statLabel">Úspěšnost odpovědí</div><div className="statValue">{percentage(Number(overview.correctAnswers) + Number(overview.guestCorrect), overview.combinedAnswers)}</div></div>
      <div className="statCard"><div className="statLabel">Přihlášení žáci</div><div className="statValue">{overview.uniqueStudents}</div></div>
      <div className="statCard"><div className="statLabel">Připojení přes QR</div><div className="statValue">{overview.guestParticipants}</div></div>
    </div>}
    <section className="card">
      <div className="hstack"><div><h3>Moje lekce</h3></div><span className="badge">{visibleLessons.length} / {lessons.length}</span></div>
      <div className="groupFilter"><label htmlFor="dashboard-group">Třída / skupina</label><select id="dashboard-group" value={groupFilter} onChange={(event) => setSearchParams(event.target.value === "all" ? {} : { skupina: event.target.value })}><option value="all">Všechny lekce</option><option value="none">Bez skupiny</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.lesson_count})</option>)}</select></div>
      {loading && <p role="status">Načítám lekce…</p>}
      <div className="tableWrap"><table className="tableModern"><thead><tr><th>Název</th><th>Třída / skupina</th><th>Stav</th><th>Akce</th></tr></thead><tbody>
        {visibleLessons.map((lesson) => <tr key={lesson.id}><td><strong>{lesson.title}</strong></td><td><label className="srOnly" htmlFor={`lesson-group-${lesson.id}`}>Skupina lekce {lesson.title}</label><select id={`lesson-group-${lesson.id}`} value={lesson.group_id ?? ""} disabled={busyId != null} onChange={(event) => move(lesson.id, event.target.value)}><option value="">Bez skupiny</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></td><td><span className={lesson.approved ? "badgeYes" : "badgeNo"}>{lesson.approved ? "Schváleno" : "Návrh"}</span></td><td><div className="actionsModern">
          <Link className="linkBtn" to={`/ucitel/schvalit/${lesson.id}`}>Upravit / detail</Link><Link className="linkBtn" to={`/ucitel/statistiky/${lesson.id}`}>Statistiky</Link>
          {Boolean(lesson.approved) && <button type="button" disabled={busyId != null} onClick={() => createSession(lesson.id)}>{busyId === lesson.id ? "Pracuji…" : "Test přes QR"}</button>}
          <Link className="linkBtn" to={`/ucitel/lekce/${lesson.id}/sprava`}>Správa žáků</Link><button type="button" className="btnDangerSoft" disabled={busyId != null} onClick={() => handleDelete(lesson.id)}>Smazat</button>
        </div></td></tr>)}
        {!loading && !visibleLessons.length && <tr><td colSpan="4">V tomto výběru zatím nejsou žádné lekce. Vytvoř novou nebo změň filtr skupiny.</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
