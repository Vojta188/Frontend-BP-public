import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { closeTestSessionApi, deleteTestSessionApi, getTestParticipantAnswersApi, getTestSessionApi, getTestSessionQrApi, removeTestParticipantApi, startTestSessionApi } from "../../api/endpoints";
import AnswerDetails, { formatDate, percentage, sessionLabel } from "../../components/AnswerDetails";

export default function TestSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [pollError, setPollError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const inFlight = useRef(false);
  const [qrUrl, setQrUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let cancelled = false, timer;
    async function load() {
      try { const result = await getTestSessionApi(sessionId); if (!cancelled) { setData(result); setPollError(""); } }
      catch (caught) { if (!cancelled) setPollError(caught.message); }
      finally { if (!cancelled) timer = window.setTimeout(load, 2500); }
    }
    load();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [sessionId, reloadKey]);

  useEffect(() => {
    let cancelled = false, objectUrl;
    setQrUrl(""); setQrError("");
    getTestSessionQrApi(sessionId, window.location.origin).then((blob) => {
      if (!cancelled) { objectUrl = URL.createObjectURL(blob); setQrUrl(objectUrl); }
    }).catch((caught) => { if (!cancelled) setQrError(caught.message); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    setDetail(null); setDetailError(""); setDetailLoading(Boolean(selected));
    if (selected) getTestParticipantAnswersApi(sessionId, selected)
      .then((result) => { if (!cancelled) setDetail(result); })
      .catch((caught) => { if (!cancelled) setDetailError(caught.message); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [sessionId, selected, reloadKey]);

  async function run(action) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setMessage("");
    try { await action(); }
    catch (caught) { setError(caught.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function refresh() { setData(await getTestSessionApi(sessionId)); setReloadKey((key) => key + 1); }
  function close() {
    if (!window.confirm("Ukončit test všem připojeným žákům? Další odpovědi už nebude možné odeslat, dosavadní výsledky zůstanou uložené.")) return;
    run(async () => { const result = await closeTestSessionApi(sessionId); setMessage(result.message); await refresh(); });
  }

  const session = data?.session;
  const participants = data?.participants || [];
  const answered = participants.reduce((sum, participant) => sum + participant.answered, 0);
  const correct = participants.reduce((sum, participant) => sum + participant.correct, 0);
  const joinUrl = session ? `${window.location.origin}/pripojit/${session.code}` : "";

  return <div className="testSessionPage">
    <div className="card pageHeading"><div><h2>Test přes QR kod</h2><p className="subTitle">{session?.title || "Čekárna a výsledky testování"}</p></div><div className="btnRow"><Link className="linkBtn primary" to="/ucitel">Hlavní menu</Link>{session && <Link className="linkBtn" to={`/ucitel/statistiky/${session.lesson_id}?cast=qr`}>Statistiky lekce</Link>}<button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={busy}>Obnovit</button></div></div>
    {error && <div className="error" role="alert">{error}</div>}
    {pollError && <div className="error" role="alert">{pollError}</div>}
    {message && <div className="ok" role="status">{message}</div>}
    {!data && !error && !pollError && <p role="status">Načítám test…</p>}
    {session && <>
      <div className="card"><div className="hstack"><div><span className={`resultBadge status-${session.status}`}>{sessionLabel(session.status)}</span><p className="fieldHint">{session.group_name ? `${session.group_name} · ` : ""}{session.question_count} otázek · vytvořeno {formatDate(session.created_at)}{session.started_at ? ` · spuštěno ${formatDate(session.started_at)}` : ""}</p></div><strong>Kód: {session.code}</strong></div>
        {session.status === "lobby" ? <p>Nech žáky naskenovat QR kód a zadat jméno. Až uvidíš všechna jména, spusť test.</p> : <p>{session.status === "active" ? "Test běží. Každý žák vyplňuje vlastním tempem. Přehled se průběžně obnovuje." : "Test je ukončený. Uložená jména a výsledky zůstávají dostupné."}</p>}
      </div>
      {session.status === "lobby" && <section className="card qrInvite"><div className="qrImageArea">{qrUrl ? <img className="qrImage" src={qrUrl} width="360" height="360" alt="QR kód pro připojení žáků k testu" /> : <p>{qrError || "Připravuji QR kód…"}</p>}</div><div>
        <h3>Připojení žáků</h3><div className="joinCode" aria-label="Připojovací kód">{session.code}</div>
        <label htmlFor="join-url">Odkaz pro připojení</label><input id="join-url" readOnly value={joinUrl} onFocus={(event) => event.target.select()} />
      </div></section>}
      <div className="resultsSummary"><div className="statCard"><div className="statLabel">Připojení žáci</div><div className="statValue">{participants.length}</div></div><div className="statCard"><div className="statLabel">Dokončeno</div><div className="statValue">{participants.filter((participant) => participant.completed_at).length}</div></div><div className="statCard"><div className="statLabel">Odeslané odpovědi</div><div className="statValue">{answered}</div><div className="statHint">Správně {correct} · chybně {answered - correct}</div></div><div className="statCard"><div className="statLabel">Úspěšnost odpovědí</div><div className="statValue">{percentage(correct, answered)}</div><div className="statHint">Ze zodpovězených otázek</div></div></div>
      <section className="card"><div className="hstack"><h3>{session.status === "lobby" ? "Žáci v čekárně" : "Výsledky žáků"}</h3><div className="btnRow">{session.status === "lobby" && <button className="primary" type="button" disabled={busy || !participants.length} onClick={() => run(async () => { const result = await startTestSessionApi(sessionId); setMessage(result.message); await refresh(); })}>Spustit test</button>}{session.status !== "closed" && <button type="button" className="danger" disabled={busy} onClick={close}>Ukončit test</button>}{session.status === "lobby" && !participants.length && <button type="button" disabled={busy} onClick={() => { if (window.confirm("Odstranit tuto prázdnou čekárnu?")) run(async () => { await deleteTestSessionApi(sessionId); navigate(`/ucitel/statistiky/${session.lesson_id}?cast=qr`); }); }}>Odstranit prázdnou čekárnu</button>}</div></div>
        <div className="tableWrap"><table className="tableModern"><thead><tr><th>Jméno</th><th>Stav</th><th>Průběh</th><th>Správně / chybně</th><th>Úspěšnost</th><th>Akce</th></tr></thead><tbody>{participants.map((participant) => <tr key={participant.id}>
          <td><strong>{participant.name}</strong></td><td>{participant.completed_at ? "Dokončeno" : session.status === "lobby" ? "Čeká na spuštění" : session.status === "closed" ? "Nedokončeno" : participant.answered ? "Vyplňuje" : "Čeká na odpověď"}</td><td><strong>{participant.answered} / {session.question_count}</strong><div className="muted">Nezodpovězeno {session.question_count - participant.answered}</div></td><td>{participant.correct} / {participant.answered - participant.correct}</td><td>{percentage(participant.correct, participant.answered)}</td><td>{session.status === "lobby" ? <button type="button" disabled={busy} onClick={() => run(async () => { await removeTestParticipantApi(sessionId, participant.id); setMessage(`${participant.name} byl(a) odebrán(a) z čekárny.`); await refresh(); })}>Odebrat z čekárny</button> : <button type="button" onClick={() => setSelected(participant.id)} aria-expanded={selected === participant.id}>Odpovědi</button>}</td>
        </tr>)}{!participants.length && <tr><td colSpan="6">{session.status === "lobby" ? "Zatím se nikdo nepřipojil." : "V tomto testování nejsou připojení žáci."}</td></tr>}</tbody></table></div>
        <p className="fieldHint">Před spuštěním ověř jména. Výsledky jsou řazené abecedně a průběh testu se hodnotí podle správnosti odpovědí.</p>
      </section>
      {selected && <AnswerDetails data={detail} loading={detailLoading} error={detailError} onClose={() => setSelected(null)} />}
    </>}
  </div>;
}
