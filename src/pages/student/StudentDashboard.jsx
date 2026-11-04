import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLessonsApi } from "../../api/endpoints";

export default function StudentDashboard() {
  const [lessons, setLessons] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const lessonsResponse = await getLessonsApi();
        setLessons(lessonsResponse);
      } catch (caughtError) {
        setError(caughtError.message);
      }
    })();
  }, []);

  return (
    <div className="studentHome">
      <div className="studentHero card">
        <h2>Moje lekce</h2>
        <div className="muted">Uvidíš lekce, které ti učitel přiřadil.</div>
        {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
      </div>

      <div className="studentGrid">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="card studentLessonCard">
            <div className="hstack">
              <div style={{ fontWeight: 800 }}>{lesson.title}</div>
              <span className="badge">
                {lesson.attempt_status === "completed" ? "Splněno" : "Dostupné"}
              </span>
            </div>

            <div className="muted" style={{ marginTop: 8 }}>
              {lesson.attempt_status === "completed"
                ? "Lekce je zamčená (čeká na povolení opakování)."
                : "Klikni a začni test."}
            </div>

            <div className="btnRow" style={{ marginTop: 12 }}>
              {lesson.attempt_status === "completed" ? (
                <button disabled>Otevřít</button>
              ) : (
                <Link className="btn" to={`/student/lekce/${lesson.id}`}>Otevřít</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
