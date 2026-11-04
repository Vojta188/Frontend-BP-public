import React from "react";
import { useParams, Link } from "react-router-dom";
import LessonRepeatManager from "../../components/LessonRepeatManager.jsx";

export default function LessonManage() {
  const { lessonId } = useParams();

  return (
    <div className="container">
      <div className="card">
        <div className="hstack">
          <div>
            <div className="sectionTitle">Správa žáků – lekce {lessonId}</div>
            <div className="subTitle">Přidávání žáků a povolení opakování.</div>
          </div>
          <Link className="btn" to="/ucitel">Zpět</Link>
        </div>
      </div>

      <LessonRepeatManager lessonId={lessonId} />
    </div>
  );
}
