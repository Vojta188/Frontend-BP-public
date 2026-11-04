import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createTestSessionApi, getAttemptAnswersApi, getTeacherLessonStatsApi, getTestSessionsApi } from "../../api/endpoints";
import AnswerDetails, { attemptLabel, formatDate, percentage, sessionLabel } from "../../components/AnswerDetails";

export default function LessonStats() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qrTab = searchParams.get("cast") === "qr";
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [history, setHistory] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    Promise.all([getTeacherLessonStatsApi(lessonId), getTestSessionsApi(lessonId)])
      .then(([result, qrSessions]) => { if (!cancelled) { setStats(result); setSessions(qrSessions); } })
      .catch((caught) => { if (!cancelled) setError(caught.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lessonId, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setDetail(null); setDetailError(""); setDetailLoading(Boolean(selectedAttempt));
    if (selectedAttempt) getAttemptAnswersApi(lessonId, selectedAttempt)
      .then((result) => { if (!cancelled) setDetail(result); })
      .catch((caught) => { if (!cancelled) setDetailError(caught.message); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [lessonId, selectedAttempt, reloadKey]);

  const rows = useMemo(() => {
    if (!stats) return [];
    return stats.students.flatMap((student) => {
      const attempts = stats.attempts.filter((attempt) => Number(attempt.studentId) === Number(student.id))
        .sort((a, b) => b.attempt_no - a.attempt_no || b.id - a.id);
      const legacy = stats.legacyAnswers.find((item) => Number(item.studentId) === Number(student.id));
      const notStarted = { studentId: student.id, studentName: student.name, status: "not_started", answered: 0, correct: 0 };
      if (history) return [...attempts, ...(legacy ? [legacy] : []), ...(!attempts.length && !legacy ? [notStarted] : [])];
      return [attempts[0] || legacy || notStarted];
    }).filter((row) => row.studentName.toLocaleLowerCase("cs").includes(query.trim().toLocaleLowerCase("cs")) && (status === "all" || row.status === status));
  }, [stats, history, query, status]);
  const answered = rows.reduce((sum, row) => sum + row.answered, 0);
  const correct = rows.reduce((sum, row) => sum + row.correct, 0);

  async function createSession() {
    if (creatingRef.current) return;
    creatingRef.current = true; setCreating(true); setError("");
    try { const result = await createTestSessionApi(lessonId); navigate(`/ucitel/qr/${result.sessionId}`); }
    catch (caught) { setError(caught.message); }
    finally { creatingRef.current = false; setCreating(false); }
  }

  return <div className="statisticsPage">
    <div className="card pageHeading">
      <div><h2>Statistiky lekce</h2><p className="subTitle">{stats ? `${stats.lesson.title}${stats.lesson.groupName ? ` · ${stats.lesson.groupName}` : ""}` : "Výsledky žáků a jednotlivých testování"}</p></div>
      <div className="btnRow"><Link className="linkBtn primary" to="/ucitel">Hlavní menu</Link><button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={loading}>Obnovit výsledky</button></div>
    </div>
    {error && <div className="error" role="alert">{error}</div>}
    {loading && <p role="status">Načítám statistiky…</p>}
    {stats && <>
      <div className="resultTabs" aria-label="Typ výsledků">
        <button type="button" aria-pressed={!qrTab} onClick={() => setSearchParams({})}>Přihlášení žáci</button>
        <button type="button" aria-pressed={qrTab} onClick={() => setSearchParams({ cast: "qr" })}>Testy přes QR <span className="badge">{sessions.length}</span></button>
      </div>
      {qrTab ? <section className="card">
        <div className="hstack"><div><h3>Jednotlivá spuštění přes QR</h3></div><button type="button" className="primary" disabled={creating || !stats.lesson.approved} onClick={createSession}>{creating ? "Připravuji…" : "Nový test přes QR"}</button></div>
        {!stats.lesson.approved && <p className="fieldHint">Pro nové QR testování nejprve <Link to={`/ucitel/schvalit/${lessonId}`}><u>otevři a schval lekci</u></Link>.</p>}
        <div className="tableWrap"><table className="tableModern"><thead><tr><th>Vytvořeno / kód</th><th>Stav</th><th>Připojeno</th><th>Dokončeno</th><th>Úspěšnost</th><th>Akce</th></tr></thead><tbody>
          {sessions.map((session) => <tr key={session.id}><td><strong>{formatDate(session.created_at)}</strong><div className="muted">{session.code} · {session.question_count} otázek{session.group_name ? ` · ${session.group_name}` : ""}</div></td><td><span className={`resultBadge status-${session.status}`}>{sessionLabel(session.status)}</span></td><td>{session.participant_count}</td><td>{session.completed_count} / {session.participant_count}</td><td>{percentage(session.correct_count, session.answer_count)}<div className="muted">ze {session.answer_count} odpovědí</div></td><td><Link className="linkBtn" to={`/ucitel/qr/${session.id}`}>{session.status === "lobby" ? "Otevřít čekárnu" : "Zobrazit výsledky"}</Link></td></tr>)}
          {!sessions.length && <tr><td colSpan="6">Zatím nemáš žádný QR test této lekce. Před vytvořením nové relace musí být lekce schválená.</td></tr>}
        </tbody></table></div>
      </section> : <>
        <section className="card statsFilters">
          <div className="filterFields"><div><label htmlFor="stats-name">Hledat žáka</label><input id="stats-name" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Jméno žáka" /></div><div><label htmlFor="stats-status">Stav pokusu</label><select id="stats-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Všechny stavy</option>{["not_started", "active", "completed", "archived", "legacy"].map((value) => <option key={value} value={value}>{attemptLabel(value)}</option>)}</select></div></div>
          <label className="checkLine" htmlFor="stats-history"><span>Zobrazit starší pokusy</span><input id="stats-history" type="checkbox" checked={history} onChange={(event) => setHistory(event.target.checked)} /></label>
          <p className="fieldHint">{history ? "Zobrazuješ historii všech pokusů. Každý pokus má samostatný řádek." : "Zobrazuješ poslední pokus každého žáka včetně žáků, kteří test ještě nezahájili."} Filtry se vztahují i na souhrn níže.</p>
        </section>
        <div className="resultsSummary">
          <div className="statCard"><div className="statLabel">Žáci ve výběru</div><div className="statValue">{new Set(rows.map((row) => row.studentId)).size}</div></div>
          <div className="statCard"><div className="statLabel">Dokončené pokusy</div><div className="statValue">{rows.filter((row) => row.completed_at).length}</div></div>
          <div className="statCard"><div className="statLabel">Odeslané odpovědi</div><div className="statValue">{answered}</div><div className="statHint">Správně {correct} · chybně {answered - correct}</div></div>
          <div className="statCard"><div className="statLabel">Úspěšnost odpovědí</div><div className="statValue">{percentage(correct, answered)}</div></div>
        </div>
        <section className="card">
          <h3>{history ? "Pokusy žáků" : "Poslední pokus každého žáka"}</h3>
          <div className="tableWrap"><table className="tableModern statsTable"><thead><tr><th>Žák / pokus</th><th>Stav</th><th>Průběh</th><th>Správně / chybně</th><th>Úspěšnost</th><th>Detail</th></tr></thead><tbody>
            {rows.map((row) => <tr key={`${row.studentId}-${row.id || row.status}`}><td><strong>{row.studentName}</strong><div className="muted">{row.attempt_no ? `Pokus ${row.attempt_no} · ${formatDate(row.started_at)}` : row.status === "legacy" ? "Bez vazby na konkrétní pokus" : "Čeká na zahájení"}</div></td><td><span className={`resultBadge status-${row.status}`}>{attemptLabel(row.status)}</span>{row.status === "archived" && <div className="muted">Opakování povoleno</div>}</td><td>{row.status === "legacy" ? `${row.answered} odpovědí` : <><strong>{row.answered} / {stats.lesson.questionCount}</strong><div className="muted">Zbývá {Math.max(0, stats.lesson.questionCount - row.answered)}</div></>}</td><td>{row.correct} / {row.answered - row.correct}</td><td>{percentage(row.correct, row.answered)}</td><td>{row.id ? <button type="button" onClick={() => setSelectedAttempt(row.id)} aria-expanded={selectedAttempt === row.id}>Odpovědi</button> : "—"}</td></tr>)}
            {!rows.length && <tr><td colSpan="6">{stats.students.length ? "Zadaným filtrům neodpovídá žádný žák." : "K lekci zatím nejsou přiřazeni žádní žáci. Výsledky připojení bez registrace najdeš na kartě Testy přes QR."}</td></tr>}
          </tbody></table></div>
        </section>
        {selectedAttempt && <AnswerDetails data={detail} loading={detailLoading} error={detailError} onClose={() => setSelectedAttempt(null)} />}
        <details className="card"><summary>Souhrn všech pokusů podle obtížnosti</summary><div className="tableWrap"><table className="tableModern"><thead><tr><th>Obtížnost</th><th>Správně</th><th>Chybně</th><th>Odpovědí</th><th>Úspěšnost</th></tr></thead><tbody>{stats.byDifficulty.map((row) => <tr key={row.difficulty || "unknown"}><td>{row.difficulty === "easy" ? "Základní" : row.difficulty === "hard" ? "Náročnější" : "Neurčeno"}</td><td>{row.correct}</td><td>{row.total - row.correct}</td><td>{row.total}</td><td>{percentage(row.correct, row.total)}</td></tr>)}</tbody></table></div></details>
      </>}
    </>}
  </div>;
}
