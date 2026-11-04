import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getGuestQuestionApi, getGuestStatusApi, getPublicTestSessionApi, joinTestSessionApi, leaveTestSessionApi, sendGuestAnswerApi } from "../../api/endpoints";
import QuestionCard from "../../components/QuestionCard";
import { percentage } from "../../components/AnswerDetails";

const normalizeCode = (value) => value.toUpperCase().replace(/[\s-]/g, "");
const storageKey = (code) => `educreator-qr-${code}`;
function storedToken(code) { try { return sessionStorage.getItem(storageKey(code)) || ""; } catch { return ""; } }
function forgetToken(code) { try { sessionStorage.removeItem(storageKey(code)); } catch { /* Paměť stránky zůstává použitelná i bez úložiště. */ } }

export default function GuestTest() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [enteredCode, setEnteredCode] = useState("");
  if (code) return <GuestSession key={normalizeCode(code)} code={normalizeCode(code)} />;
  return <div className="card guestEntrance"><h2>Připojit se k testu</h2><p>Naskenuj QR kód od učitele nebo zadej připojovací kód. Potom vyplníš své jméno.</p><form className="form" onSubmit={(event) => { event.preventDefault(); navigate(`/pripojit/${encodeURIComponent(normalizeCode(enteredCode))}`); }}>
    <label htmlFor="guest-code">Kód testu</label><input id="guest-code" required minLength={8} maxLength={12} autoCapitalize="characters" autoComplete="off" value={enteredCode} onChange={(event) => setEnteredCode(event.target.value)} placeholder="Například ABCD2345" /><button className="primary">Pokračovat k testu</button>
  </form></div>;
}

function GuestSession({ code }) {
  const [token, setToken] = useState(() => storedToken(code));
  const [info, setInfo] = useState(null);
  const [state, setState] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [question, setQuestion] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [retryChoice, setRetryChoice] = useState(null);
  const [needsNext, setNeedsNext] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [storageWarning, setStorageWarning] = useState(false);
  const status = state?.session.status;
  const completed = Boolean(state?.completed);

  useEffect(() => {
    let cancelled = false, timer;
    async function poll() {
      try {
        if (token) {
          const result = await getGuestStatusApi(token);
          if (result.session.code !== code) throw new Error("Připojení nepatří k tomuto testu.");
          if (!cancelled) { setState(result); setConnectionError(""); }
        } else {
          const result = await getPublicTestSessionApi(code);
          if (!cancelled) { setInfo(result); setConnectionError(""); }
        }
      } catch (caught) {
        if (!cancelled) {
          setConnectionError(caught.message);
          if (caught.status === 401 && token) { forgetToken(code); setToken(""); setState(null); setQuestion(null); setFeedback(null); setNeedsNext(true); }
        }
      } finally { if (!cancelled) timer = window.setTimeout(poll, token ? 2000 : 5000); }
    }
    poll();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [code, token, reloadKey]);

  useEffect(() => {
    if (!token || status !== "active" || completed || !needsNext || busy || feedback || question) return undefined;
    let cancelled = false;
    getGuestQuestionApi(token).then((result) => {
      if (!cancelled) { setState(result); setQuestion(result.question); setNeedsNext(false); setError(""); }
    }).catch((caught) => { if (!cancelled) { setError(caught.message); setNeedsNext(false); } });
    return () => { cancelled = true; };
  }, [token, status, completed, needsNext, busy, feedback, question]);

  async function run(action) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try { await action(); }
    catch (caught) { setError(caught.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function join(event) {
    event.preventDefault();
    run(async () => {
      const result = await joinTestSessionApi(code, name);
      try { sessionStorage.setItem(storageKey(code), result.token); } catch { setStorageWarning(true); }
      setState({ session: result.session, name: result.name, completed: false, progress: { answered: 0, correct: 0, total: result.session.questionCount } });
      setToken(result.token); setConnectionError(""); setNeedsNext(true);
    });
  }
  function answer(letter) {
    if (inFlight.current || !question) return;
    setRetryChoice(letter);
    run(async () => {
      const result = await sendGuestAnswerApi(token, question.id, letter);
      setRetryChoice(null);
      setFeedback(result);
      setState((current) => ({ ...current, progress: result.progress, completed: result.done }));
    });
  }
  function continueTest() { setFeedback(null); setQuestion(null); setRetryChoice(null); setNeedsNext(true); setError(""); }
  const session = state?.session || info;

  return <div className="guestTestPage">
    <div className="card pageHeading"><div><h2>{session?.title || "Připojení k testu"}</h2><p className="subTitle">Kód {code}{state ? ` · ${state.name}` : ""}{session?.groupName ? ` · ${session.groupName}` : ""}</p></div><Link className="linkBtn" to="/pripojit">Hlavní menu</Link></div>
    {connectionError && <div className="error" role="alert">{connectionError}<div className="btnRow"><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Obnovit připojení</button></div></div>}
    {error && <div className="error" role="alert">{error}</div>}
    {storageWarning && <p className="editorNotice">Prohlížeč neumožnil uložit připojení. Během testu ponech tuto stránku otevřenou.</p>}
    {!session && !connectionError && <p role="status">Načítám test…</p>}
    {!token && info && <div className="card guestEntrance">
      {info.status === "lobby" ? <><h3>Jak se jmenuješ?</h3><p>Zadej jméno, podle kterého tě učitel pozná. Potom vyčkáš na společné spuštění testu.</p><form className="form" onSubmit={join}><label htmlFor="guest-name">Jméno a příjmení</label><input id="guest-name" required minLength={2} maxLength={80} autoComplete="name" value={name} disabled={busy} onChange={(event) => setName(event.target.value)} /><button className="primary" disabled={busy}>{busy ? "Připojuji…" : "Připojit se"}</button></form></> : <><h3>Připojování je uzavřené</h3><p>{info.status === "active" ? "Test už byl spuštěn. Pro nové připojení se obrať na učitele." : "Tento test už byl ukončen."}</p></>}
    </div>}
    {token && state && <>
      {status === "lobby" ? <div className="card guestEntrance"><span className="resultBadge status-lobby">Čekárna</span><h3>Jsi připojen(a), {state.name}.</h3><p>Počkej, až učitel spustí test. Otázka se zobrazí automaticky.</p><p className="muted">Test obsahuje {state.progress.total} otázek.</p><button type="button" disabled={busy} onClick={() => run(async () => { await leaveTestSessionApi(token); forgetToken(code); setToken(""); setState(null); setQuestion(null); setFeedback(null); setNeedsNext(true); })}>Změnit jméno / opustit čekárnu</button></div> : <>
        {feedback ? <div className={`card guestFeedback ${feedback.correct ? "feedbackCorrect" : "feedbackWrong"}`} role="status"><h3>{feedback.correct ? "Správná odpověď" : "Odpověď není správná"}</h3><p>Správně je <strong>{feedback.correctAnswer.letter}) {feedback.correctAnswer.text}</strong>.</p>{feedback.explanation && <p className="preserveText">{feedback.explanation}</p>}<p className="muted">Zodpovězeno {feedback.progress.answered} / {feedback.progress.total}</p><button className="primary" type="button" onClick={continueTest}>{feedback.done ? "Zobrazit výsledek" : "Pokračovat"}</button></div> : (completed || status === "closed") && !busy ? <div className="card guestEntrance"><h3>{completed ? "Test je dokončený" : "Učitel test ukončil"}</h3><p>Tvé odpovědi jsou uložené pod jménem <strong>{state.name}</strong>.</p><div className="guestScore"><div><strong>{state.progress.correct}</strong><span>Správně</span></div><div><strong>{state.progress.answered - state.progress.correct}</strong><span>Chybně</span></div><div><strong>{state.progress.total - state.progress.answered}</strong><span>Nezodpovězeno</span></div></div><p>Úspěšnost ze zodpovězených otázek: <strong>{percentage(state.progress.correct, state.progress.answered)}</strong></p><Link className="linkBtn primary" to="/pripojit">Zpět do hlavního menu</Link></div> : <>
          <div className="card hstack"><strong>Otázka {Math.min(state.progress.answered + 1, state.progress.total)} / {state.progress.total}</strong><span className="muted">Odesláno {state.progress.answered}</span></div>
          {question ? <QuestionCard question={question} onAnswer={answer} disabled={busy || retryChoice != null || status !== "active"} /> : <div className="card"><p role="status">{busy ? "Ukládám odpověď…" : "Načítám otázku…"}</p>{!needsNext && <button type="button" disabled={busy} onClick={() => setNeedsNext(true)}>Obnovit otázku</button>}</div>}
          {error && retryChoice != null && !busy && <div className="card"><p>Pokud vypadlo spojení, můžeš bezpečně zopakovat odeslání stejné volby. Odpověď se nezapočítá dvakrát.</p><button type="button" onClick={() => answer(retryChoice)}>Znovu odeslat odpověď {retryChoice}</button></div>}
          {busy && <p role="status">Odpověď se ukládá a připravuje se vysvětlení…</p>}
        </>}
      </>}
    </>}
  </div>;
}
