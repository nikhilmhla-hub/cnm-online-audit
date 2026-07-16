export interface Option {
  label: string;
  points: number;
  description?: string;
}

export interface Question {
  id: string;
  category: string;
  text: string;
  description?: string;
  helperText?: string;
  options: Option[];
}


export const questions: Question[] = [
  // FOCUS (q1 - q4)
  {
    id: "q1",
    category: "Focus",
    text: "How often do you check your phone during study sessions?",
    options: [
      { label: "Almost Never", points: 10 },
      { label: "1–2 Times", points: 7 },
      { label: "3–5 Times", points: 4 },
      { label: "Constantly", points: 0 }
    ]
  },
  {
    id: "q2",
    category: "Focus",
    text: "Can you study continuously for 90 minutes without distraction?",
    options: [
      { label: "Easily", points: 10 },
      { label: "Most Days", points: 7 },
      { label: "Rarely", points: 3 },
      { label: "Never", points: 0 }
    ]
  },
  {
    id: "q3",
    category: "Focus",
    text: "How often does your mind wander while studying?",
    options: [
      { label: "Almost Never", points: 10 },
      { label: "Rarely", points: 7 },
      { label: "Sometimes", points: 5 },
      { label: "Frequently", points: 2 },
      { label: "Constantly", points: 0 }
    ]
  },
  {
    id: "q4",
    category: "Focus",
    text: "When you sit to study, how long does it take before real studying starts?",
    options: [
      { label: "Immediately", points: 10 },
      { label: "5–10 Minutes", points: 7 },
      { label: "10–20 Minutes", points: 3 },
      { label: "20+ Minutes", points: 0 }
    ]
  },
  // REVISION (q5 - q8)
  {
    id: "q5",
    category: "Revision",
    text: "How often do you revise completed chapters?",
    options: [
      { label: "Weekly", points: 10 },
      { label: "Every 2–3 Weeks", points: 7 },
      { label: "Occasionally", points: 3 },
      { label: "Almost Never", points: 0 }
    ]
  },
  {
    id: "q6",
    category: "Revision",
    text: "After 30 days, how much of a chapter do you typically remember?",
    options: [
      { label: "80–100%", points: 10 },
      { label: "60–80%", points: 7 },
      { label: "40–60%", points: 3 },
      { label: "Less Than 40%", points: 0 }
    ]
  },
  {
    id: "q7",
    category: "Revision",
    text: "Do you maintain short notes or revision notes?",
    options: [
      { label: "For Every Chapter", points: 10 },
      { label: "For Most Chapters", points: 7 },
      { label: "For Few Chapters", points: 3 },
      { label: "No Notes", points: 0 }
    ]
  },
  {
    id: "q8",
    category: "Revision",
    text: "Do you have a fixed revision schedule?",
    options: [
      { label: "Always", points: 10 },
      { label: "Mostly", points: 7 },
      { label: "Sometimes", points: 3 },
      { label: "Never", points: 0 }
    ]
  },
  // PRACTICE & CONCEPTS (q9 - q12)
  {
    id: "q9",
    category: "Accuracy",
    text: "When facing a difficult question, what do you usually do?",
    options: [
      { label: "Try Multiple Approaches", points: 10 },
      { label: "Revisit Concepts", points: 7 },
      { label: "Check Solution Quickly", points: 3 },
      { label: "Skip It", points: 0 }
    ]
  },
  {
    id: "q10",
    category: "Accuracy",
    text: "How often do you reattempt wrong questions?",
    options: [
      { label: "Always", points: 10 },
      { label: "Often", points: 7 },
      { label: "Sometimes", points: 3 },
      { label: "Never", points: 0 }
    ]
  },
  {
    id: "q11",
    category: "Accuracy",
    text: "How comfortable are you with applying concepts to new questions?",
    options: [
      { label: "Very Comfortable", points: 10 },
      { label: "Comfortable", points: 7 },
      { label: "Somewhat Comfortable", points: 3 },
      { label: "Not Comfortable", points: 0 }
    ]
  },
  {
    id: "q12",
    category: "Accuracy",
    text: "How many quality questions do you solve daily?",
    options: [
      { label: "100+", points: 10 },
      { label: "50–100", points: 7 },
      { label: "20–50", points: 3 },
      { label: "Less Than 20", points: 0 }
    ]
  },
  // TEST PERFORMANCE (q13 - q16)
  {
    id: "q13",
    category: "Time Management",
    text: "How often do you take mock tests?",
    options: [
      { label: "Weekly", points: 10 },
      { label: "Twice Monthly", points: 7 },
      { label: "Monthly", points: 3 },
      { label: "Rarely", points: 0 }
    ]
  },
  {
    id: "q14",
    category: "Time Management",
    text: "What do you do after a mock test?",
    options: [
      { label: "Detailed Analysis", points: 10 },
      { label: "Quick Review", points: 7 },
      { label: "Only Check Score", points: 3 },
      { label: "Move On", points: 0 }
    ]
  },
  {
    id: "q15",
    category: "Time Management",
    text: "How many mistakes are usually silly mistakes?",
    options: [
      { label: "Very Few", points: 10 },
      { label: "Some", points: 7 },
      { label: "Many", points: 3 },
      { label: "Most Mistakes", points: 0 }
    ]
  },
  {
    id: "q16",
    category: "Time Management",
    text: "Do you maintain an error log of mistakes?",
    options: [
      { label: "Always", points: 10 },
      { label: "Often", points: 7 },
      { label: "Occasionally", points: 3 },
      { label: "Never", points: 0 }
    ]
  },
  // EXECUTION & MINDSET (q17 - q20)
  {
    id: "q17",
    category: "Confidence",
    text: "How often do you complete your planned study targets?",
    options: [
      { label: "Almost Always", points: 10 },
      { label: "Often", points: 7 },
      { label: "Sometimes", points: 3 },
      { label: "Rarely", points: 0 }
    ]
  },
  {
    id: "q18",
    category: "Confidence",
    text: "Current Pending Syllabus level?",
    options: [
      { label: "No Pending Syllabus", points: 10 },
      { label: "Small Pending Syllabus", points: 7 },
      { label: "Moderate Pending Syllabus", points: 3 },
      { label: "Large Pending Syllabus", points: 0 }
    ]
  },
  {
    id: "q19",
    category: "Confidence",
    text: "How do you react after a poor mock test?",
    options: [
      { label: "Analyze And Improve", points: 10 },
      { label: "Recover Quickly", points: 7 },
      { label: "Feel Demotivated", points: 3 },
      { label: "Give Up For A While", points: 0 }
    ]
  },
  {
    id: "q20",
    category: "Confidence",
    text: "How confident are you about achieving your target rank?",
    options: [
      { label: "Very Confident", points: 10 },
      { label: "Confident", points: 7 },
      { label: "Unsure", points: 3 },
      { label: "Not Confident", points: 0 }
    ]
  }
];
