import React, { useEffect, useState } from "react";
import {
  getTeacherStudentsApi,
  getLessonAssignmentsApi,
  saveLessonAssignmentsApi,
} from "../api/endpoints";

export default function AssignStudents({ lessonId, disabled }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [query, setQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const loadAssignments = async () => {
    setError("");
    setMessage("");
    setIsLoading(true);
    try {
      const [assignments, availableStudents] = await Promise.all([
        getLessonAssignmentsApi(lessonId),
        getTeacherStudentsApi(""),
      ]);
      setSelectedStudentIds(new Set(assignments?.studentIds || []));
      setStudents(availableStudents || []);
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (lessonId) loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const searchStudents = async (value) => {
    setQuery(value);
    try {
      const availableStudents = await getTeacherStudentsApi(value);
      setStudents(availableStudents || []);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleSaveAssignments = async () => {
    setError("");
    setMessage("");
    try {
      await saveLessonAssignmentsApi(lessonId, Array.from(selectedStudentIds));
      setMessage("Přiřazení žákům uloženo ✅");
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  return (
    <div className="card">
      <div className="hstack">
        <div>
          <div className="sectionTitle">Přiřazení žákům</div>
          <div className="subTitle">Výběr potvrď tlačítkem „Uložit přiřazení“. Žáci lekci uvidí po jejím schválení.</div>
        </div>
        <span className="badge">Vybráno: {selectedStudentIds.size}</span>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}

      <div className="grid2">
        <div>
          <label>Hledat (jméno nebo email)</label>
          <input
            value={query}
            onChange={(event) => searchStudents(event.target.value)}
            placeholder="např. Novák"
            disabled={isLoading}
          />
        </div>

        <div style={{ alignSelf: "end" }} className="btnRow">
          <button className="primary" onClick={handleSaveAssignments} disabled={disabled || isLoading}>
            Uložit přiřazení
          </button>
          <button onClick={loadAssignments} disabled={isLoading}>
            Obnovit
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, maxHeight: 320, overflow: "auto" }}>
        {students.length === 0 && (
          <div className="subTitle">Žádní žáci nenalezeni.</div>
        )}

        {students.map((student) => {
          const checked = selectedStudentIds.has(student.id);
          return (
            <div key={student.id} className="qItem" style={{ marginBottom: 8 }}>
              <label className="studentCheckRow">
                <span className="studentCheckName">
                  <strong>{student.name}</strong>
                  <span className="muted">{student.email}</span>
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStudentSelection(student.id)}
                  disabled={disabled}
                />
                <span aria-hidden="true" />
              </label>
            </div>
          );
        })}
      </div>

      {disabled && (
        <div className="subTitle" style={{ marginTop: 10 }}>
          Přiřazení lze spravovat také přes „Správa žáků“ v přehledu lekcí.
        </div>
      )}
    </div>
  );
}
