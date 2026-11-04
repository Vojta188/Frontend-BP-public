import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { sendAnswerApi, startAttemptApi, getNextQuestionApi, finishAttemptApi } from "../../api/endpoints";
import QuestionCard from "../../components/QuestionCard";

export default function LessonViewer() {
  const { lessonId } = useParams();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState("easy");

  const [progress, setProgress] = useState({ answered: 0, correct: 0, totalQuestions: 0 });
  const [feedback, setFeedback] = useState(null);

  const loadNextQuestion = useCallback(async () => {
    const response = await getNextQuestionApi(lessonId);

    setDifficulty(response.difficulty || "easy");
    setProgress(response.progress);

    if (response.done) {
      await finishAttemptApi(lessonId);
      setIsCompleted(true);
      setCurrentQuestion(null);
      setFeedback(null);
      return;
    }

    setCurrentQuestion(response.question);
    setFeedback(null);
  }, [lessonId]);

  useEffect(() => {
    (async () => {
      try {
        setError("");
        setIsCompleted(false);
        setFeedback(null);
        setProgress({ answered: 0, correct: 0, totalQuestions: 0 });
        await startAttemptApi(lessonId);
        await loadNextQuestion();
      } catch (caughtError) {
        setError(caughtError.message);
      }
    })();
  }, [lessonId, loadNextQuestion]);

  const handleAnswer = async (letter) => {
    if (!currentQuestion || isSubmitting || feedback) return;
    setIsSubmitting(true);
    setError("");
    setFeedback(null);
    try {
      const response = await sendAnswerApi({ questionId: currentQuestion.id, answer: letter });
      setFeedback({ ...response, answer: letter });

      setProgress((prev) => ({
        ...prev,
        answered: prev.answered + 1,
        correct: prev.correct + (response.correct ? 1 : 0),
      }));

    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueTest = async () => {
    if (!feedback || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      await loadNextQuestion();
    } catch (caughtError) {
      // Zpětná vazba a tlačítko zůstanou viditelné, aby šlo načtení opakovat.
      setError(caughtError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Lekce #{lessonId}</h2>
      {error && <div className="error">{error}</div>}

      <div className="card">
        {progress.totalQuestions > 0 && (
          <>
            <div>
              {isCompleted ? "Zodpovězeno" : "Otázka"}: <b>
                {isCompleted ? progress.answered : Math.min(progress.answered + (feedback ? 0 : 1), progress.totalQuestions)}
                {" z "}{progress.totalQuestions}
              </b>
            </div>
            <div>Správně: <b>{progress.correct}</b> ze {progress.answered} zodpovězených</div>
          </>
        )}
        {!isCompleted && <div>Aktuální obtížnost: <b>{difficulty}</b></div>}
      </div>

      {isCompleted && (
        <div className="card okCard">
          <b>Hotovo ✅</b>
          <div>Výsledek: <b>{progress.correct}/{progress.totalQuestions}</b></div>
          <div className="muted">Lekce je teď splněná a je zamčená, dokud učitel nepovolí opakování.</div>
          <div className="btnRow"><Link className="btn" to="/student">Zpět do hlavního menu</Link></div>
        </div>
      )}

      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          disabled={isSubmitting || Boolean(feedback)}
          onAnswer={handleAnswer}
        />
      )}

      {feedback && (
        <div className={`card ${feedback.correct ? "okCard" : "errorCard"}`}>
          <b>{feedback.correct ? "Správně ✅" : "Špatně ❌"}</b>
          <div style={{ marginTop: 6 }}>Tvoje odpověď: <b>{feedback.answer}</b></div>
          {!feedback.correct && feedback.vysvetleni && (
            <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{feedback.vysvetleni}</div>
          )}
          <button type="button" onClick={handleContinueTest} disabled={isSubmitting} style={{ marginTop: 12 }}>
            {isSubmitting ? "Načítání…" : "Pokračovat"}
          </button>
        </div>
      )}
    </div>
  );
}
