"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { StudentSession } from "@/lib/scoring/engine";
const steps: Record<string, [string, string]> = {
  Focus: [
    "Choose one task for a bounded study session.",
    "Record interruptions and what you actually completed.",
  ],
  Revision: [
    "Try recalling one small topic before checking your notes.",
    "Revisit it later and inspect what you can retrieve without help.",
  ],
  Accuracy: [
    "Review a short set of recent mistakes.",
    "Separate concept, reading and calculation errors before choosing practice.",
  ],
  "Time Management": [
    "Compare your plan with the time actually available.",
    "Try a smaller timed set and review pacing and question selection.",
  ],
  Confidence: [
    "Identify one moment when preparation or test pressure interrupts you.",
    "Discuss the situation and choose a manageable preparation or test routine to practise.",
  ],
};
export default function Report() {
  const [session, setSession] = useState<StudentSession | null>(null),
    [loaded, setLoaded] = useState(false),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [consent, setConsent] = useState(false),
    [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
      "idle",
    );
  const [receipt, setReceipt] = useState("");
  const [deliveryStorage, setDeliveryStorage] = useState("");
  const [errorReference, setErrorReference] = useState("");
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("cnm_public_audit_v1");
      if (raw) {
        const parsed = JSON.parse(raw) as StudentSession;
        if (parsed.metrics && parsed.answers && parsed.student) {
          setSession(parsed);
          try {
            const saved = JSON.parse(
              sessionStorage.getItem("cnm_public_enquiry_receipt_v1") || "null",
            );
            if (
              saved?.submissionId === parsed.submissionId &&
              typeof saved.receiptId === "string"
            ) {
              setReceipt(saved.receiptId);
              setDeliveryStorage(
                typeof saved.storage === "string" ? saved.storage : "",
              );
              setStatus("saved");
            }
          } catch {
            /* A receipt cache is optional; it cannot invalidate the audit. */
          }
        }
      }
    } catch {
      /* Display the recovery route below. */
    }
    setLoaded(true);
  }, []);
  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !consent || status === "saving" || status === "saved")
      return;
    setStatus("saving");
    setErrorReference("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          submissionId: session.submissionId,
          source: "Website Audit",
          name: name.trim(),
          phone: phone.trim(),
          class: session.student.class,
          exam: session.student.exam,
          overallScore: session.overallScore,
          archetype: "Self-report questionnaire",
          primaryBottleneck:
            session.primaryBottleneck?.category || "Review all areas",
          focus: session.metrics.Focus,
          revision: session.metrics.Revision,
          accuracy: session.metrics.Accuracy,
          timeManagement: session.metrics["Time Management"],
          confidence: session.metrics.Confidence,
          status: "Enquiry requested",
          leadSaved: "Yes",
          answersJson: JSON.stringify(session.answers),
          consent: true,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        setErrorReference(
          typeof data.reference === "string"
            ? data.reference
            : session.submissionId,
        );
        throw Error("Not confirmed");
      }
      const receiptId = data.receiptId || session.submissionId;
      setReceipt(receiptId);
      setDeliveryStorage(
        data.storage === "primary" || data.storage === "backup"
          ? data.storage
          : "",
      );
      setStatus("saved");
      try {
        sessionStorage.setItem(
          "cnm_public_enquiry_receipt_v1",
          JSON.stringify({ submissionId: session.submissionId, receiptId, storage: data.storage }),
        );
      } catch {
        /* Server acknowledgement remains valid if browser storage is unavailable. */
      }
    } catch {
      setErrorReference((reference) => reference || session.submissionId);
      setStatus("error");
    }
  }
  function clear() {
    sessionStorage.removeItem("cnm_public_audit_v1");
    sessionStorage.removeItem("cnm_public_enquiry_receipt_v1");
    setSession(null);
    setName("");
    setPhone("");
    setConsent(false);
    setStatus("idle");
    setReceipt("");
    setDeliveryStorage("");
    setErrorReference("");
  }
  if (!loaded) return <p role="status">Loading your summary…</p>;
  if (!session)
    return (
      <div className="audit-content">
        <span className="audit-kicker">YOUR SUMMARY</span>
        <h1>No current audit in this browser session.</h1>
        <p>You can start again without a name or phone number.</p>
        <Link className="audit-primary" href="/audit">
          Start an audit →
        </Link>
        <a
          className="audit-textlink"
          href="https://cnm-learning-website.vercel.app/"
        >
          Return to CNM →
        </a>
      </div>
    );
  const ranked = Object.entries(session.metrics).sort((a, b) => a[1] - b[1]);
  const priority = ranked[0]?.[0] || "Focus";
  const actions = steps[priority] || steps.Focus;
  return (
    <div className="audit-content audit-report">
      <span className="audit-kicker">
        AUDIT COMPLETE / {session.student.class} · {session.student.exam}
      </span>
      <h1>
        Your answers.
        <br />
        <em>A starting point to review.</em>
      </h1>
      <p className="audit-lead">
        This is a questionnaire summary, not a diagnosis or an exam score.
        Compare it with a recent test, your study routine and examples of your
        work.
      </p>
      <div className="audit-paper">
        <h2>What the percentages mean</h2>
        <p>
          Each answer has a fixed point value. Each category shows the points
          earned as a percentage of the available points in that category. Lower
          percentages indicate answers describing more difficulty under these
          scoring rules. The rules have not been validated to predict marks,
          rank or improvement.
        </p>
      </div>
      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading">Your self-reported preparation patterns</h2>
        <dl className="audit-metrics">
          {Object.entries(session.metrics).map(([category, value]) => (
            <div key={category}>
              <dt>{category}</dt>
              <dd>
                {value}% <span>questionnaire points</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="audit-card">
        <span className="audit-kicker">
          A POSSIBLE STARTING QUESTION / {priority.toUpperCase()}
        </span>
        <h2>Does this match your recent work?</h2>
        <p>
          {priority} has the lowest questionnaire percentage
          {ranked.filter(([, n]) => n === ranked[0][1]).length > 1
            ? " (tied with another area)"
            : ""}
          . That suggests an area to investigate, not a proven cause or a
          confirmed weakness.
        </p>
        <ol>
          <li>{actions[0]}</li>
          <li>{actions[1]}</li>
          <li>Review the evidence before making a bigger change.</li>
        </ol>
        <p className="audit-small">
          If all areas are high, still check your actual work. High self-report
          scores do not establish mastery or exam readiness.
        </p>
      </section>
      <section className="audit-card">
        <h2>A useful parent or mentor conversation</h2>
        <p>
          Ask the student which answer felt most accurate, what recent work
          supports it and what one next action would be manageable. Avoid
          treating a percentage as a label for ability.
        </p>
        <div className="audit-links">
          <button type="button" onClick={() => window.print()}>
            Print / save summary as PDF
          </button>
          <a href="https://cnm-learning-website.vercel.app/demo">
            Explore the sample workflow →
          </a>
          <a href="https://cnm-learning-website.vercel.app/programmes">
            Programmes, fees & delivery →
          </a>
        </div>
      </section>
      <section
        className="audit-card audit-enquiry"
        aria-labelledby="enquiry-heading"
      >
        <span className="audit-kicker">OPTIONAL NEXT STEP</span>
        <h2 id="enquiry-heading">Want to discuss your preparation?</h2>
        <p>
          Share this audit with CNM and request contact. This is an enquiry, not
          a confirmed appointment or enrolment. Availability, programme fit and
          delivery terms must be agreed separately.
        </p>
        {status === "saved" ? (
          <div
            role="status"
            className="audit-paper"
            data-delivery-storage={deliveryStorage}
          >
            <h3>Your enquiry was received.</h3>
            <p>
              Enquiry reference: <strong>{receipt}</strong>
            </p>
            <p>
              No appointment has been reserved. If you need to follow up, call{" "}
              <a href="tel:+916377525604">+91 6377525604</a> or email{" "}
              <a href="mailto:info@cnmlearning.com">info@cnmlearning.com</a>.
            </p>
          </div>
        ) : (
          <form onSubmit={share}>
            <label htmlFor="enquiry-name">Your name</label>
            <input
              id="enquiry-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
            <label htmlFor="enquiry-phone">Indian mobile number</label>
            <input
              id="enquiry-phone"
              type="tel"
              autoComplete="tel-national"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              placeholder="10 digits"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <label className="audit-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
              />
              <span>
                I choose to send my name, mobile number, class, exam, audit
                answers and summary to CNM for follow-up about my preparation.{" "}
                <a href="https://cnm-learning-website.vercel.app/privacy-policy">
                  Read the privacy policy.
                </a>
              </span>
            </label>
            <button
              className="audit-primary"
              disabled={!consent || status === "saving"}
              type="submit"
            >
              {status === "saving" ? "Sending enquiry…" : "Send my enquiry"}
            </button>
            {status === "error" && (
              <p role="alert" className="audit-error">
                We could not confirm that your enquiry was saved. No callback is
                confirmed. Keep reference <strong>{errorReference}</strong> and
                contact CNM directly at{" "}
                <a href="tel:+916377525604">+91 6377525604</a>. Your summary is
                still available.
              </p>
            )}
          </form>
        )}
        <p className="audit-small">
          You can leave without submitting this form. Your report is not locked
          behind an enquiry.
        </p>
      </section>
      <div className="audit-links">
        <button type="button" onClick={clear}>
          Clear my audit from this browser
        </button>
        <a href="https://cnm-learning-website.vercel.app/">Return to CNM →</a>
      </div>
    </div>
  );
}
