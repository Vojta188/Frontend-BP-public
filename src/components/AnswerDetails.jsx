import React from "react";

export const percentage = (correct, answered) => Number(answered) ? `${Math.round(Number(correct) / Number(answered) * 100)} %` : "—";
export const formatDate = (value) => value ? new Date(value).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" }) : "—";
export const sessionLabel = (status) => ({ lobby: "Čekárna", active: "Probíhá", closed: "Ukončeno" }[status] || status);
export const attemptLabel = (status) => ({ active: "Rozpracováno", completed: "Dokončeno", archived: "Archivováno", not_started: "Nezahájeno", legacy: "Starší odpovědi" }[status] || status);

export default function AnswerDetails({ data, loading, error, onClose }) {
  return <section className="card answerDetail" aria-label="Detail odpovědí">
    <div className="hstack"><h3>Odpovědi{data ? `: ${data.participant.name}` : ""}</h3><button type="button" onClick={onClose}>Zavřít detail</button></div>
    {loading && <p role="status">Načítám odpovědi…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {data && <>
      <p className="subTitle">Zodpovězeno {data.answers.length} z {data.totalQuestions} otázek. Úspěšnost se počítá pouze ze zodpovězených otázek.</p>
      {!data.answers.length && <p>Žák zatím neodeslal žádnou odpověď.</p>}
      <div className="vstack">{data.answers.map((answer, index) => <article className="answerItem" key={answer.id}>
        <div className="hstack"><strong>{index + 1}. {answer.question || "Původní otázka není dostupná"}</strong><span className={`resultBadge ${Number(answer.is_correct) ? "resultCorrect" : "resultWrong"}`}>{Number(answer.is_correct) ? "Správně" : "Chybně"}</span></div>
        <dl className="answerChoices"><div><dt>Odpověď žáka</dt><dd>{answer.answer}) {answer[answer.answer?.toLowerCase()] || ""}</dd></div><div><dt>Správná odpověď</dt><dd>{answer.correct ? `${answer.correct}) ${answer[answer.correct.toLowerCase()] || ""}` : "—"}</dd></div></dl>
        {answer.explanation && <details><summary>Vysvětlení odpovědi</summary><p className="preserveText">{answer.explanation}</p></details>}
      </article>)}</div>
    </>}
  </section>;
}
