import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AssignStudents from "../../components/AssignStudents";
import LessonEditorHelp from "../../components/LessonEditorHelp";
import {
  copyLessonApi, createTestSessionApi, getLessonEditorApi, getLessonEditorOptionsApi, getLessonPdfApi, getLessonGroupsApi,
  proposeLessonQuestionsApi, reopenLessonApi, saveLessonDraftApi,
} from "../../api/endpoints";

let localQuestionId = 0;
function prepareQuestion(question) {
  return { ...question, clientKey: question.id != null ? `db-${question.id}` : `local-${++localQuestionId}` };
}
function prepareData(data) { return { ...data, questions: data.questions.map(prepareQuestion) }; }
function draftPayload(data) {
  return {
    version: Number(data.lesson.edit_version),
    lesson: {
      title: data.lesson.title,
      content_easy: data.lesson.content_easy ?? "",
      content_hard: data.lesson.content_hard ?? "",
      education_level: data.lesson.education_level ?? "unspecified",
      group_id: data.lesson.group_id ?? null,
    },
    questions: data.questions.map(({ clientKey, ...question }) => question),
  };
}

export default function ApproveLesson() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [options, setOptions] = useState(null);
  const [groups, setGroups] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [operation, setOperation] = useState("");
  const inFlight = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [openKey, setOpenKey] = useState(null);
  const [additionalCount, setAdditionalCount] = useState(1);
  const [additionalDifficulty, setAdditionalDifficulty] = useState("mixed");
  const [previousQuestions, setPreviousQuestions] = useState({});
  const [pdfMaterial, setPdfMaterial] = useState("none");

  useEffect(() => {
    let cancelled = false;
    setData(null); setError(""); setMessage(""); setDirty(false); setPreviousQuestions({});
    Promise.all([getLessonEditorApi(lessonId), getLessonEditorOptionsApi(), getLessonGroupsApi()])
      .then(([lessonData, settings, availableGroups]) => {
        if (!cancelled) { setData(prepareData(lessonData)); setOptions(settings); setGroups(availableGroups); }
      }).catch((caughtError) => { if (!cancelled) setError(caughtError.message); });
    return () => { cancelled = true; };
  }, [lessonId, reloadKey]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warnBeforeLeaving = (event) => { event.preventDefault(); event.returnValue = ""; };
    const guardLink = (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      if (!window.confirm("V lekci jsou neuložené změny. Opravdu chceš odejít?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    document.addEventListener("click", guardLink, true);
    return () => { window.removeEventListener("beforeunload", warnBeforeLeaving); document.removeEventListener("click", guardLink, true); };
  }, [dirty]);

  async function run(label, action) {
    if (inFlight.current) return;
    inFlight.current = true;
    setOperation(label); setError(""); setMessage("");
    try { await action(); }
    catch (caughtError) { setError(caughtError.message); }
    finally { inFlight.current = false; setOperation(""); }
  }
  function updateLesson(field, value) {
    setData((current) => ({ ...current, lesson: { ...current.lesson, [field]: value } }));
    setDirty(true); setMessage("");
  }
  function updateQuestion(key, field, value) {
    setData((current) => ({ ...current, questions: current.questions.map((q) => q.clientKey === key ? { ...q, [field]: value } : q) }));
    setDirty(true); setMessage("");
  }
  function save(approve = false) {
    run(approve ? "Ukládám a schvaluji lekci…" : "Ukládám všechny změny…", async () => {
      const result = await saveLessonDraftApi(lessonId, { ...draftPayload(data), approve });
      setData(prepareData(result)); setDirty(false); setPreviousQuestions({});
      setMessage(approve ? "Lekce je uložená a schválená. Je dostupná přiřazeným žákům." : "Rozpracovaná lekce i všechny otázky jsou uložené. Později je otevřeš z přehledu lekcí.");
    });
  }
  function reopen() {
    if (!window.confirm("Vrátit lekci k úpravám? Do dalšího schválení bude žákům skryta.")) return;
    run("Vracím lekci k úpravám…", async () => {
      try {
        const result = await reopenLessonApi(lessonId, Number(data.lesson.edit_version));
        setData(prepareData(result)); setDirty(false);
        setMessage("Lekce je připravená k úpravám. Po dokončení ji znovu schval.");
      } catch (caughtError) {
        if (caughtError.status === 409) {
          // Stav pokusů se mohl změnit od otevření schválené lekce.
          const latest = await getLessonEditorApi(lessonId);
          setData(prepareData(latest));
        }
        throw caughtError;
      }
    });
  }
  function copy() {
    run("Vytvářím upravitelnou kopii…", async () => {
      const result = await copyLessonApi(lessonId);
      navigate(`/ucitel/schvalit/${result.lessonId}`);
    });
  }
  function generateAdditional() {
    run("Generuji další otázky…", async () => {
      const result = await proposeLessonQuestionsApi(lessonId, { ...draftPayload(data), count: Number(additionalCount), difficulty: additionalDifficulty });
      const extra = result.questions.map(prepareQuestion);
      setData((current) => ({ ...current, questions: [...current.questions, ...extra] }));
      setOpenKey(extra[0]?.clientKey); setDirty(true);
      setMessage("Nové otázky jsou přidané do návrhu. Zkontroluj je a potvrď uložením.");
    });
  }
  function replaceQuestion(index) {
    run(`Generuji náhradu otázky ${index + 1}…`, async () => {
      const original = data.questions[index];
      const result = await proposeLessonQuestionsApi(lessonId, { ...draftPayload(data), replaceIndex: index });
      setPreviousQuestions((previous) => ({ ...previous, [original.clientKey]: original }));
      setData((current) => ({ ...current, questions: current.questions.map((q) => q.clientKey === original.clientKey ? { ...result.questions[0], id: original.id, clientKey: original.clientKey } : q) }));
      setOpenKey(original.clientKey); setDirty(true);
      setMessage("Náhradní otázka je připravená ke kontrole. Změnu potvrď uložením, nebo vrať předchozí otázku.");
    });
  }
  function restoreQuestion(key) {
    const original = previousQuestions[key];
    setData((current) => ({ ...current, questions: current.questions.map((q) => q.clientKey === key ? original : q) }));
    setPreviousQuestions((previous) => { const next = { ...previous }; delete next[key]; return next; });
    setDirty(true); setMessage("Předchozí otázka je zpět v návrhu.");
  }
  function removeQuestion(key) {
    setData((current) => ({ ...current, questions: current.questions.filter((q) => q.clientKey !== key) }));
    setDirty(true); setMessage("Otázka je odebraná z návrhu. Změnu potvrď uložením.");
  }
  function downloadPdf(solution) {
    run("Připravuji PDF…", async () => {
      const blob = await getLessonPdfApi(lessonId, { solution, material: solution ? "none" : pdfMaterial });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `lekce-${lessonId}-${solution ? "reseni" : "test"}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMessage(solution ? "Řešení pro učitele je připravené ke stažení." : "Test bez správných odpovědí je připravený ke stažení.");
    });
  }
  function goBack() {
    if (!dirty || window.confirm("V lekci jsou neuložené změny. Opravdu chceš odejít?")) navigate("/ucitel");
  }
  function reload() {
    if (!dirty || window.confirm("Načtením uložené verze zahodíš neuložené změny. Pokračovat?")) setReloadKey((value) => value + 1);
  }

  if (!data || !options) return <div className="card">{error ? <><div role="alert" className="error">{error}</div><button type="button" onClick={reload}>Zkusit načíst znovu</button></> : "Načítám lekci…"}</div>;
  const { lesson, questions, hasActivity, canReopen } = data;
  const busy = Boolean(operation);
  const readOnly = Boolean(lesson.approved || hasActivity);
  const maxQuestions = options.maxQuestions;
  const remaining = maxQuestions - questions.length;
  const validExtraCount = Number.isInteger(Number(additionalCount)) && Number(additionalCount) > 0 && Number(additionalCount) <= remaining;

  return (
    <div className="lessonEditor">
      <div className="card">
        <div className="hstack editorHeading">
          <div><h2>Kontrola a úpravy lekce</h2></div>
          <button type="button" className="btn" onClick={goBack} disabled={busy}>Hlavní menu</button>
        </div>
        <div className="editorState" role="status">
          <span className="badge">{lesson.approved ? "Schválená lekce" : "Rozpracovaná lekce"}</span>
          <span>{dirty ? "Neuložené změny" : "Změny jsou uložené"}</span>
        </div>
        {error && <div className="error" role="alert">{error}<div className="btnRow"><button type="button" onClick={reload} disabled={busy}>Načíst uloženou verzi</button></div></div>}
        {message && <div className="ok" role="status">{message}</div>}
        {operation && <div className="editorProgress" role="status" aria-live="polite">{operation}</div>}
        <LessonEditorHelp />

        {readOnly && <div className="editorNotice">
          <p>{hasActivity ? "K lekci už existují pokusy žáků nebo QR relace. Pro úpravy vytvoř kopii; původní otázky a výsledky zůstanou zachované. Prázdnou QR čekárnu lze odstranit na stránce relace." : "Lekce je schválená. Dokud ji nikdo nezačal vyplňovat a nemá QR relaci, můžeš ji vrátit k úpravám."}</p>
          <div className="btnRow">
            {canReopen && <button type="button" onClick={reopen} disabled={busy}>Vrátit lekci k úpravám</button>}
            <button type="button" onClick={copy} disabled={busy || dirty}>Vytvořit upravitelnou kopii</button>
            {Boolean(lesson.approved) && <button type="button" className="primary" disabled={busy} onClick={() => run("Připravuji test přes QR…", async () => { const result = await createTestSessionApi(lessonId); navigate(`/ucitel/qr/${result.sessionId}`); })}>Připravit test přes QR</button>}
          </div>
        </div>}

        <fieldset className="editorFields" disabled={busy || readOnly}>
          <label htmlFor="edit-title">Název lekce</label>
          <input id="edit-title" maxLength={200} value={lesson.title ?? ""} onChange={(event) => updateLesson("title", event.target.value)} />
          <label htmlFor="edit-group">Třída / skupina</label>
          <select id="edit-group" value={lesson.group_id ?? ""} onChange={(event) => updateLesson("group_id", event.target.value || null)}><option value="">Bez skupiny</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}{group.grade ? ` · ${group.grade}. ročník` : ""}</option>)}</select>
          <label htmlFor="edit-education">Věková skupina / stupeň vzdělávání</label>
          <select id="edit-education" value={lesson.education_level ?? "unspecified"} onChange={(event) => updateLesson("education_level", event.target.value)}>
            {options.educationLevels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}
          </select>
          <div className="grid2">
            <div><label htmlFor="edit-easy">Výklad – základní</label><textarea id="edit-easy" value={lesson.content_easy ?? ""} onChange={(event) => updateLesson("content_easy", event.target.value)} /></div>
            <div><label htmlFor="edit-hard">Výklad – náročnější</label><textarea id="edit-hard" value={lesson.content_hard ?? ""} onChange={(event) => updateLesson("content_hard", event.target.value)} /></div>
          </div>
        </fieldset>
      </div>

      <div className="card">
        <div className="hstack"><h3>Otázky</h3><span className="badge">Celkem {questions.length} / {maxQuestions}</span></div>
 {!readOnly && <fieldset className="editorFields addQuestions" disabled={busy}>
          <div><label htmlFor="additional-count">Počet otázek</label><input id="additional-count" type="number" min="1" max={Math.max(1, remaining)} value={additionalCount} onChange={(event) => setAdditionalCount(event.target.value)} disabled={!remaining} /></div>
          <div><label htmlFor="additional-difficulty">Obtížnost otázek</label><select id="additional-difficulty" value={additionalDifficulty} onChange={(event) => setAdditionalDifficulty(event.target.value)}><option value="mixed">Obě úrovně</option><option value="easy">Základní</option><option value="hard">Náročnější</option></select></div>
          <button type="button" onClick={generateAdditional} disabled={busy || !validExtraCount}>Vygenerovat a přidat otázky</button>
          <p className="fieldHint">{remaining > 0 ? `Můžeš přidat ještě ${remaining} otázek.` : "Dosažen maximální počet otázek."}</p>
        </fieldset>}
        {!questions.length && <p>Test zatím nemá otázky. Před schválením alespoň jednu přidej.</p>}
        <div className="vstack">
          {questions.map((question, index) => {
            const key = question.clientKey;
            const isOpen = openKey === key;
            return <div key={key} className={`qItem ${isOpen ? "open" : ""}`}>
              <button type="button" className="qHeader editorQuestionToggle" onClick={() => setOpenKey(isOpen ? null : key)} aria-expanded={isOpen} aria-controls={`body-${key}`}>
                <span><strong>{index + 1}. {question.question || "(bez textu)"}</strong><span className="qMeta">{question.difficulty === "hard" ? "Náročnější" : "Základní"} · Správně: {question.correct}</span></span>
                <span className="badge">{isOpen ? "Skrýt" : readOnly ? "Zobrazit" : "Upravit"}</span>
              </button>
              <div className="qBody" id={`body-${key}`}>
                <fieldset className="editorFields" disabled={busy || readOnly}>
                  <label htmlFor={`question-${key}`}>Text otázky {index + 1}</label>
                  <textarea id={`question-${key}`} value={question.question ?? ""} onChange={(event) => updateQuestion(key, "question", event.target.value)} />
                  <div className="grid2">{["a", "b", "c", "d"].map((letter) => <div key={letter}>
                    <label htmlFor={`${letter}-${key}`}>Odpověď {letter.toUpperCase()}</label>
                    <input id={`${letter}-${key}`} value={question[letter] ?? ""} onChange={(event) => updateQuestion(key, letter, event.target.value)} />
                  </div>)}</div>
                  <div className="grid2">
                    <div><label htmlFor={`correct-${key}`}>Správná odpověď</label><select id={`correct-${key}`} value={question.correct} onChange={(event) => updateQuestion(key, "correct", event.target.value)}>{["A", "B", "C", "D"].map((letter) => <option key={letter} value={letter}>{letter}) {question[letter.toLowerCase()]}</option>)}</select></div>
                    <div><label htmlFor={`difficulty-${key}`}>Obtížnost otázky</label><select id={`difficulty-${key}`} value={question.difficulty} onChange={(event) => updateQuestion(key, "difficulty", event.target.value)}><option value="easy">Základní</option><option value="hard">Náročnější</option></select></div>
                  </div>
                  <label htmlFor={`explanation-${key}`}>Vysvětlení správné odpovědi</label><textarea id={`explanation-${key}`} value={question.explanation ?? ""} onChange={(event) => updateQuestion(key, "explanation", event.target.value)} />
                  <div className="btnRow">
                    <button type="button" onClick={() => replaceQuestion(index)}>Vygenerovat náhradu otázky</button>
                    {previousQuestions[key] && <button type="button" onClick={() => restoreQuestion(key)}>Vrátit předchozí otázku</button>}
                    <button type="button" className="danger" onClick={() => removeQuestion(key)}>Odebrat otázku z návrhu</button>
                  </div>
                </fieldset>
              </div>
            </div>;
          })}
        </div>
      </div>

      {!readOnly && <div className="card editorSaveBar">
        <div><strong>{dirty ? "V návrhu jsou neuložené změny." : "Návrh je uložený."}</strong></div>
        <div className="btnRow"><button type="button" onClick={() => save(false)} disabled={busy || !dirty}>Uložit rozpracovanou lekci</button><button type="button" className="primary" onClick={() => save(true)} disabled={busy || !questions.length}>Uložit a schválit lekci</button></div>
      </div>}

      <AssignStudents lessonId={lessonId} disabled={busy || Boolean(lesson.approved)} />

      <div className="card">
        <h3>PDF pro tisk</h3>
        <select id="pdf-material" value={pdfMaterial} onChange={(event) => setPdfMaterial(event.target.value)} disabled={busy}>
          <option value="none">Pouze test, bez výkladu</option><option value="easy">Přiložit základní výklad</option><option value="hard">Přiložit náročnější výklad</option>
        </select>
        {dirty && <p className="fieldHint">Před stažením PDF ulož změny, aby tištěný test odpovídal uložené lekci.</p>}
        <div className="btnRow"><button type="button" onClick={() => downloadPdf(false)} disabled={busy || dirty || !questions.length}>Stáhnout test v PDF</button><button type="button" onClick={() => downloadPdf(true)} disabled={busy || dirty || !questions.length}>Stáhnout řešení pro učitele</button></div>
      </div>
    </div>
  );
}
