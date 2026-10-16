"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { questions } from "@/data/questions";
import { generateAuditSession } from "@/lib/scoring/engine";
export default function Audit() {
  const router = useRouter();
  const [stage, setStage] = useState(0),
    [track, setTrack] = useState(""),
    [exam, setExam] = useState(""),
    [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [error, setError] = useState("");
  const question = questions[index];
  const finish = () => {
    try {
      const result = generateAuditSession(
        { name: "", phone: "", class: track, exam },
        answers,
      );
      sessionStorage.setItem("cnm_public_audit_v1", JSON.stringify(result));
      router.push("/report");
    } catch {
      setError(
        "Your browser could not keep the summary. Allow session storage, then try again. Your answers remain on this page.",
      );
    }
  };
  const back = () => {
    if (stage === 2 && index > 0) setIndex(index - 1);
    else setStage(Math.max(0, stage - 1));
    setError("");
  };
  return (
    <div className="audit-content">
      <div className="audit-toolbar">
        {stage === 0 ? (
          <Link href="/">← Before you begin</Link>
        ) : (
          <button type="button" onClick={back}>
            ← Back
          </button>
        )}
        <span>
          {stage === 0
            ? "YOUR CLASS"
            : stage === 1
              ? "YOUR EXAM"
              : `${index + 1} / ${questions.length}`}
        </span>
      </div>
      {stage === 0 ? (
        <>
          <span className="audit-kicker">START WITH YOUR CONTEXT</span>
          <h1>Which class are you in?</h1>
          <p>Choose your current preparation track.</p>
          <div
            className="audit-options"
            role="group"
            aria-label="Choose your class"
          >
            {["XI", "XII", "Dropper"].map((value) => (
              <button
                key={value}
                aria-pressed={track === value}
                onClick={() => setTrack(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <button
            className="audit-primary"
            disabled={!track}
            onClick={() => setStage(1)}
          >
            Continue →
          </button>
        </>
      ) : stage === 1 ? (
        <>
          <span className="audit-kicker">YOUR PREPARATION</span>
          <h1>Which exam are you preparing for?</h1>
          <div
            className="audit-options"
            role="group"
            aria-label="Choose your exam"
          >
            {["JEE", "NEET"].map((value) => (
              <button
                key={value}
                aria-pressed={exam === value}
                onClick={() => setExam(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <button
            className="audit-primary"
            disabled={!exam}
            onClick={() => setStage(2)}
          >
            Start the questions →
          </button>
        </>
      ) : (
        <>
          <div className="audit-progress">
            <progress
              aria-label="Questions answered"
              max={questions.length}
              value={Object.keys(answers).length}
            />
            <span>
              {Object.keys(answers).length} of {questions.length} answered
            </span>
          </div>
          <span className="audit-kicker">
            {question.category.toUpperCase()}
          </span>
          <h1 className="audit-question">{question.text}</h1>
          {question.textHindi && (
            <p lang="hi" className="audit-hindi">
              {question.textHindi}
            </p>
          )}
          <p className="audit-small">
            Choose the answer closest to your usual experience. There is no
            benefit in choosing what sounds best.
          </p>
          <div
            className="audit-options"
            role="group"
            aria-label="Choose your answer"
          >
            {question.options.map((option) => (
              <button
                key={option.label}
                aria-pressed={answers[question.id] === option.label}
                onClick={() =>
                  setAnswers({ ...answers, [question.id]: option.label })
                }
              >
                {option.label}
                {option.labelHindi && (
                  <span lang="hi">{option.labelHindi}</span>
                )}
              </button>
            ))}
          </div>
          <button
            className="audit-primary"
            disabled={!answers[question.id]}
            onClick={() => {
              if (index < questions.length - 1) setIndex(index + 1);
              else finish();
            }}
          >
            {index === questions.length - 1
              ? "View my summary"
              : "Next question"}{" "}
            →
          </button>
          <p className="audit-small">
            No contact details are required. No enquiry is sent by viewing the
            summary.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="audit-error">
          {error}
        </p>
      )}
    </div>
  );
}
