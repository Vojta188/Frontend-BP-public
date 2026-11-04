import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  getLessonStudentsOverviewApi,
  allowLessonRepeatBatchApi,
  getTeacherStudentsApi,
  addStudentsToLessonApi,
} from "../api/endpoints";

export default function LessonRepeatManager({ lessonId }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [studentOverview, setStudentOverview] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

  const [query, setQuery] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [selectedNewStudentIds, setSelectedNewStudentIds] = useState(new Set());

  const loadStudentOverview = useCallback(async () => {
  setError("");
  setMessage("");
  const overview = await getLessonStudentsOverviewApi(lessonId);
  setStudentOverview(overview || []);
  setSelectedStudentIds(new Set());
}, [lessonId]);

  useEffect(() => {
  if (!lessonId) return;
  (async () => {
    try {
      await loadStudentOverview();
      const availableStudents = await getTeacherStudentsApi("");
      setAllStudents(availableStudents || []);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  })();
}, [lessonId, loadStudentOverview]);

  const toggleRepeatSelection = (studentId) => {
    setSelectedStudentIds((prev) => {
      const nextSelection = new Set(prev);
      if (nextSelection.has(studentId)) nextSelection.delete(studentId);
      else nextSelection.add(studentId);
      return nextSelection;
    });
  };

  const toggleNewStudentSelection = (studentId) => {
    setSelectedNewStudentIds((prev) => {
      const nextSelection = new Set(prev);
      if (nextSelection.has(studentId)) nextSelection.delete(studentId);
      else nextSelection.add(studentId);
      return nextSelection;
    });
  };

  const completedStudentIds = useMemo(() => {
    return studentOverview
      .filter((student) => student.status === "splneno")
      .map((student) => student.student_id);
  }, [studentOverview]);

  const handleAllowRepeat = async () => {
    setError("");
    setMessage("");
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) return setError("Nejdřív vyber žáky.");

    try {
      await allowLessonRepeatBatchApi(lessonId, ids);
      setMessage("Opakování povoleno ✅");
      await loadStudentOverview();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleAllowRepeatForCompleted = async () => {
    setError("");
    setMessage("");
    if (completedStudentIds.length === 0) return setError("Nikdo nemá lekci splněnou.");

    try {
      await allowLessonRepeatBatchApi(lessonId, completedStudentIds);
      setMessage("Opakování povoleno všem splněným ✅");
      await loadStudentOverview();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const searchStudents = async (value) => {
    setQuery(value);
    try {
      const availableStudents = await getTeacherStudentsApi(value);
      setAllStudents(availableStudents || []);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleAddStudents = async () => {
    setError("");
    setMessage("");
    const ids = Array.from(selectedNewStudentIds);
    if (ids.length === 0) return setError("Vyber žáky k přidání.");

    try {
      await addStudentsToLessonApi(lessonId, ids);
      setMessage("Žáci přidáni k lekci ✅");
      setSelectedNewStudentIds(new Set());
      await loadStudentOverview();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  return (
    <div className="card">
      <div className="hstack">
        <div>
          <div className="sectionTitle">Opakování lekce</div>
        </div>
        <span className="badge">Žáků: {studentOverview.length}</span>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}

      <div className="btnRow">
        <button className="primary" onClick={handleAllowRepeat}>
          Povolit opakování vybraným
        </button>
        <button onClick={handleAllowRepeatForCompleted}>
          Povolit opakování všem splněným
        </button>
        <button onClick={loadStudentOverview}>Obnovit</button>
      </div>

      <div style={{ marginTop: 12, maxHeight: 280, overflow: "auto" }}>
        {studentOverview.map(student => (
          <div key={student.student_id} className="qItem" style={{ marginBottom: 8 }}>
            <label className="studentCheckRow">
              <span className="studentCheckName">
                <strong>{student.name}</strong>
                <span className="muted">{student.email}</span>
              </span>
              <input
                type="checkbox"
                checked={selectedStudentIds.has(student.student_id)}
                onChange={() => toggleRepeatSelection(student.student_id)}
              />
              <span className="badge">
                {student.status === "splneno" ? "Splněno" : student.status === "rozpracovano" ? "Rozpracováno" : "Nezačato"}
              </span>
            </label>
            {student.last_completed_at && (
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                Naposledy dokončeno: {String(student.last_completed_at)}
              </div>
            )}
          </div>
        ))}

        {studentOverview.length === 0 && <div className="subTitle">K lekci zatím nejsou přiřazení žádní žáci.</div>}
      </div>

      <div className="hr" />

      <div className="sectionTitle" style={{ marginBottom: 6 }}>Přidat žáky k lekci</div>

      <div className="grid2">
        <div>
          <label>Hledat</label>
          <input value={query} onChange={(event) => searchStudents(event.target.value)} placeholder="jméno / email" />
        </div>
        <div className="btnRow" style={{ alignSelf: "end" }}>
          <button className="primary" onClick={handleAddStudents}>Přidat vybrané</button>
        </div>
      </div>

      <div style={{ marginTop: 10, maxHeight: 240, overflow: "auto" }}>
        {allStudents.map(student => (
          <div key={student.id} className="qItem" style={{ marginBottom: 8 }}>
            <label className="studentCheckRow">
              <span className="studentCheckName">
                <strong>{student.name}</strong>
                <span className="muted">{student.email}</span>
              </span>
              <input
                type="checkbox"
                checked={selectedNewStudentIds.has(student.id)}
                onChange={() => toggleNewStudentSelection(student.id)}
              />
              <span aria-hidden="true" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
