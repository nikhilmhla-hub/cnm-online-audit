import { questions } from "@/data/questions";

export interface StudentSession {
  reportVersion: string;
  submissionId: string;
  student: {
    name: string;
    phone: string;
    class: string;
    exam: string;
  };
  answers: Record<string, string>;
  metrics: Record<string, number>;
  overallScore: number;
  completedAt: string;
  primaryBottleneck: {
    category: string;
    score: number;
  } | null;
  topBottlenecks: Array<{
    category: string;
    score: number;
  }>;
  archetype: string;
  potentialImprovement: {
    currentScore: number;
    potentialScore: number;
    gain: number;
  };
  personalizedInsight: string;
  sessionStatus?: string;
  queueNumber?: string;
  bookingId?: string;
}

export function getCategoryScores(answers: Record<string, string>): Record<string, number> {
  const categoryScores: Record<string, number> = {};
  const categories = ["Focus", "Revision", "Accuracy", "Time Management", "Confidence"];

  categories.forEach((cat) => {
    let earned = 0;
    let maxPossible = 0;

    const catQuestions = questions.filter((q) => q.category === cat);
    catQuestions.forEach((q) => {
      const maxQPoints = q.options.reduce((max, opt) => Math.max(max, opt.points), 0);
      maxPossible += maxQPoints;

      const selectedLabel = answers[q.id];
      if (selectedLabel) {
        const option = q.options.find((opt) => opt.label === selectedLabel);
        if (option) {
          earned += option.points;
        }
      }
    });

    categoryScores[cat] = maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0;
  });

  return categoryScores;
}

export function calculateOverallScore(answers: Record<string, string>): number {
  let earned = 0;
  let maxPossible = 0;

  questions.forEach((q) => {
    const maxQPoints = q.options.reduce((max, opt) => Math.max(max, opt.points), 0);
    maxPossible += maxQPoints;

    const selectedLabel = answers[q.id];
    if (selectedLabel) {
      const option = q.options.find((opt) => opt.label === selectedLabel);
      if (option) {
        earned += option.points;
      }
    }
  });

  return maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0;
}

export function getPrimaryBottleneck(metrics: Record<string, number>): { category: string; score: number } | null {
  const categories = ["Focus", "Revision", "Accuracy", "Time Management", "Confidence"];
  const bottlenecks = categories
    .map((cat) => ({ category: cat, score: metrics[cat] ?? 0 }))
    .filter((item) => item.score < 75)
    .sort((a, b) => a.score - b.score);

  if (bottlenecks.length === 0) {
    return null;
  }

  return bottlenecks[0];
}

export function getTopBottlenecks(metrics: Record<string, number>): Array<{ category: string; score: number }> {
  const categories = ["Focus", "Revision", "Accuracy", "Time Management", "Confidence"];
  const bottlenecks = categories
    .map((cat) => ({ category: cat, score: metrics[cat] ?? 0 }))
    .filter((item) => item.score < 75)
    .sort((a, b) => a.score - b.score);

  return bottlenecks.slice(0, 3);
}

export function getStudentArchetype(overallScore: number, metrics: Record<string, number>): string {
  const allCategoryVals = Object.values(metrics);
  
  const examWarriorCheck = overallScore >= 80 && allCategoryVals.every((val) => val >= 70);
  if (examWarriorCheck) {
    return "Exam Warrior";
  }

  const rankBuilderCheck =
    overallScore >= 60 && overallScore < 80 && allCategoryVals.every((val) => val >= 60);
  if (rankBuilderCheck) {
    return "Rank Builder";
  }

  const categories = ["Focus", "Revision", "Accuracy", "Time Management", "Confidence"];
  let lowestCat = "Focus";
  let lowestVal = 101;
  categories.forEach((cat) => {
    const val = metrics[cat] ?? 0;
    if (val < lowestVal) {
      lowestVal = val;
      lowestCat = cat;
    }
  });

  if (lowestCat === "Focus") return "Distracted Learner";
  if (lowestCat === "Revision") return "Knowledge Hoarder";
  if (lowestCat === "Accuracy") return "Practice Avoider";
  if (lowestCat === "Time Management") return "Inconsistent Performer";
  return "Confidence Crisis";
}

export function getPotentialImprovement(
  currentScore: number,
  metrics: Record<string, number>
): { currentScore: number; potentialScore: number; gain: number } {
  if (currentScore >= 90) {
    return {
      currentScore,
      potentialScore: currentScore,
      gain: 0
    };
  }

  const sortedGaps = Object.values(metrics)
    .map((score) => 100 - score)
    .sort((a, b) => b - a);

  const top3Gaps = sortedGaps.slice(0, 3);
  const avgGap = top3Gaps.reduce((sum, gap) => sum + gap, 0) / 3;
  const gain = Math.round(avgGap * 0.30);
  const potentialScore = Math.min(100, currentScore + gain);
  const finalGain = potentialScore - currentScore;

  return {
    currentScore,
    potentialScore,
    gain: finalGain
  };
}

export function getPersonalizedInsight(metrics: Record<string, number>): string {
  const primary = getPrimaryBottleneck(metrics);
  
  if (!primary) {
    return "You already have strong systems in place. Focus on consistency and advanced test strategy to maximize rank potential.";
  }

  const lowestCat = primary.category;
  switch (lowestCat) {
    case "Focus":
      return "Your biggest obstacle is sustained concentration. Reducing distractions and increasing deep-work sessions can rapidly improve performance.";
    case "Revision":
      return "You understand concepts reasonably well, but information is leaking between revisions. Improving your revision system can significantly improve your scores.";
    case "Accuracy":
      return "Your conceptual understanding is broad, but precision is lacking. Focus on analyzing your silly mistakes and solving problems with high accuracy.";
    case "Time Management":
      return "You are losing marks due to execution and pacing rather than knowledge. Better test strategy can unlock substantial gains.";
    case "Confidence":
    default:
      return "Your test preparation is decent, but exam anxiety or doubt is holding you back. Strengthening your exam mindset and mental resilience will unlock your true potential.";
  }
}

export function generateAuditSession(
  student: { name: string; phone: string; class: string; exam: string },
  answers: Record<string, string>
): StudentSession {
  const overallScore = calculateOverallScore(answers);
  const metrics = getCategoryScores(answers);
  const primaryBottleneck = getPrimaryBottleneck(metrics);
  const topBottlenecks = getTopBottlenecks(metrics);
  const archetype = getStudentArchetype(overallScore, metrics);
  const potentialImprovement = getPotentialImprovement(overallScore, metrics);
  const personalizedInsight = getPersonalizedInsight(metrics);

  const submissionId = `${Date.now()}-${student.phone.trim()}`;

  return {
    reportVersion: "v1",
    submissionId,
    student,
    answers,
    metrics,
    overallScore,
    completedAt: new Date().toISOString(),
    primaryBottleneck,
    topBottlenecks,
    archetype,
    potentialImprovement,
    personalizedInsight,
    sessionStatus: "Audit Completed"
  };
}
