import Link from "next/link";
import { questions } from "@/data/questions";
export default function Home() {
  return (
    <div className="audit-content">
      <span className="audit-kicker">
        CNM SYSTEM LABS / PREPARATION SELF-REVIEW
      </span>
      <h1>
        A clearer starting point.
        <br />
        <em>In your own words.</em>
      </h1>
      <p className="audit-lead">
        Answer {questions.length} questions about focus, revision, accuracy,
        time management and confidence. See your summary before deciding whether
        to contact CNM.
      </p>
      <div className="audit-paper">
        <h2>Before you begin</h2>
        <ul>
          <li>Free to complete. No payment or account required.</li>
          <li>English and Hindi questions.</li>
          <li>No name or phone number needed to see your summary.</li>
          <li>
            Your answers suggest questions to investigate; they do not predict
            marks or rank.
          </li>
        </ul>
      </div>
      <Link className="audit-primary" href="/audit">
        Begin the {questions.length}-question audit →
      </Link>
      <p className="audit-small">
        Your current summary is stored in this browser session. An optional
        enquiry sends your details and answers to CNM only when you choose to
        submit it.
      </p>
      <a
        className="audit-textlink"
        href="https://cnm-learning-website.vercel.app/demo"
      >
        Explore the sample preparation workflow first →
      </a>
    </div>
  );
}
