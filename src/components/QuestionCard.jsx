import React from "react";

export default function QuestionCard({ question, onAnswer, disabled }) {
  return (
    <div className="card">
      <h3>{question.question}</h3>
      <div className="options">
        {["A", "B", "C", "D"].map((letter) => {
          const optionKey = letter.toLowerCase();
          return (
            <button
              key={letter}
              className="option"
              disabled={disabled}
              onClick={() => onAnswer(letter)}
            >
              <b>{letter})</b> {question[optionKey]}
            </button>
          );
        })}
      </div>
      <div className="muted">Obtížnost: {question.difficulty}</div>
    </div>
  );
}
