import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createLessonApi, getLessonEditorOptionsApi, getLessonGroupsApi } from "../../api/endpoints";
import LessonEditorHelp from "../../components/LessonEditorHelp";

export default function CreateLesson() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedGroup = searchParams.get("skupina") || "";
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(8);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [educationLevel, setEducationLevel] = useState("");
  const [options, setOptions] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getLessonEditorOptionsApi(), getLessonGroupsApi()]).then(([result, availableGroups]) => {
      if (!cancelled) {
        setOptions(result); setGroups(availableGroups);
        const selected = availableGroups.find((group) => String(group.id) === requestedGroup);
        setGroupId(selected ? String(selected.id) : "");
        if (selected && selected.education_level !== "unspecified") setEducationLevel(selected.education_level);
      }
    }).catch((caughtError) => {
      if (!cancelled) setError(caughtError.message);
    });
    return () => { cancelled = true; };
  }, [requestedGroup]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const data = await createLessonApi({ tema: topic, pocetOtazek: Number(questionCount), education_level: educationLevel, group_id: groupId || null });
      navigate(`/ucitel/schvalit/${data.lessonId}`);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card lessonEditor">
      <div className="hstack"><h2>Vytvořit lekci</h2><Link className="linkBtn" to="/ucitel">Hlavní menu</Link></div>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="form">
        <label htmlFor="lesson-topic">Téma</label>
        <input id="lesson-topic" required minLength={3} maxLength={200} value={topic} onChange={(event) => setTopic(event.target.value)} disabled={isLoading} />

        <label htmlFor="lesson-group">Třída / skupina</label>
        <select id="lesson-group" value={groupId} disabled={isLoading || !options} onChange={(event) => {
          setGroupId(event.target.value);
          const selected = groups.find((group) => String(group.id) === event.target.value);
          if (selected && selected.education_level !== "unspecified") setEducationLevel(selected.education_level);
        }}><option value="">Bez skupiny</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}{group.grade ? ` · ${group.grade}. ročník` : ""}</option>)}</select>

        <label htmlFor="lesson-education">Věková skupina / stupeň vzdělávání</label>
        <select id="lesson-education" required value={educationLevel} onChange={(event) => setEducationLevel(event.target.value)} disabled={isLoading || !options}>
          <option value="">Vyber cílovou skupinu</option>
          {options?.educationLevels.filter((level) => level.id !== "unspecified").map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}
        </select>

        <label htmlFor="lesson-count">Počet otázek</label>
        <input id="lesson-count" required type="number" min="1" max={options?.maxQuestions ?? 30} value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} disabled={isLoading} />

        <button className="primary" disabled={isLoading || !options}>{isLoading ? "Generuji návrh lekce…" : "Vygenerovat návrh lekce"}</button>
        {isLoading && <p role="status">Generování může chvíli trvat. Pokud AI vrátí méně otázek, aplikace se pokusí chybějící doplnit.</p>}
      </form>
      <LessonEditorHelp />
    </div>
  );
}
