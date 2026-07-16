"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, ClipboardCheck, ArrowRight, User, Phone, Target, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { RadioCard } from "@/components/ui/radio-card";
import { QuestionCard } from "@/components/ui/question-card";
import { StepIndicator } from "@/components/ui/step-indicator";
import { questions } from "@/data/questions";
import { cn } from "@/lib/utils";
import { generateAuditSession } from "@/lib/scoring/engine";

export default function AuditWizardPage() {
  const router = useRouter();

  const [step, setStep] = React.useState<"class" | "exam" | "quiz" | "details" | "loader">("class");
  const [studentClass, setStudentClass] = React.useState<string>("");
  const [exam, setExam] = React.useState<string>("");
  const [fullName, setFullName] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [nameError, setNameError] = React.useState("");
  const [mobileError, setMobileError] = React.useState("");
  const [nameTouched, setNameTouched] = React.useState(false);
  const [mobileTouched, setMobileTouched] = React.useState(false);
  const [isSubmittingDetails, setIsSubmittingDetails] = React.useState(false);
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [loaderTextIdx, setLoaderTextIdx] = React.useState(0);
  const [loaderOpacity, setLoaderOpacity] = React.useState(1);

  const loaderTexts = [
    "Analyzing Study Patterns...",
    "Identifying Main Problems...",
    "Calculating Potential Improvement...",
    "Generating Personalized Report..."
  ];

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;

  const validateName = (nameVal: string) => {
    const trimmed = nameVal.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setNameError("Please enter a valid name.");
      return false;
    }
    
    // Reject fake names (case-insensitive)
    const fakeNames = ["test", "testing", "demo", "sample", "admin", "student", "abc", "xyz", "asdf", "qwerty"];
    if (fakeNames.includes(trimmed.toLowerCase())) {
      setNameError("Please enter a valid name.");
      return false;
    }
    
    // Reject single repeated characters (ignoring spaces)
    const normalized = trimmed.replace(/\s/g, "");
    if (/^(.)\1+$/.test(normalized)) {
      setNameError("Please enter a valid name.");
      return false;
    }

    // Reject names shorter than 4 characters unless they contain at least two words
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (trimmed.length < 4 && words.length < 2) {
      setNameError("Please enter a valid name.");
      return false;
    }

    // Each word must contain at least 2 alphabetic characters
    const allWordsAtLeastTwoChars = words.every(word => word.replace(/[^A-Za-z]/g, "").length >= 2);
    if (!allWordsAtLeastTwoChars) {
      setNameError("Please enter a valid name.");
      return false;
    }

    // Allow only alphabets, spaces, and periods
    if (!/^[A-Za-z\s.]+$/.test(trimmed)) {
      setNameError("Please enter a valid name.");
      return false;
    }

    setNameError("");
    return true;
  };

  const validateMobile = (mobileVal: string) => {
    const cleaned = mobileVal.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setMobileError("Please enter a valid mobile number.");
      return false;
    }
    if (!/^[6-9]/.test(cleaned)) {
      setMobileError("Please enter a valid mobile number.");
      return false;
    }

    // Reject numbers containing 8 or more identical digits
    const counts: Record<string, number> = {};
    for (const char of cleaned) {
      counts[char] = (counts[char] || 0) + 1;
    }
    const hasEightIdentical = Object.values(counts).some((count) => count >= 8);
    if (hasEightIdentical) {
      setMobileError("Please enter a valid mobile number.");
      return false;
    }

    // Reject numbers where first 6 digits are identical
    if (/^(\d)\1{5}/.test(cleaned)) {
      setMobileError("Please enter a valid mobile number.");
      return false;
    }

    // Reject numbers containing 7+ repeating digits in sequence
    if (/(\d)\1{6}/.test(cleaned)) {
      setMobileError("Please enter a valid mobile number.");
      return false;
    }

    // Reject obvious ascending/descending patterns of length 6 or more
    const asc = "01234567890123456789";
    const desc = "98765432109876543210";
    let isSequential = false;
    for (let i = 0; i <= cleaned.length - 6; i++) {
      const sub = cleaned.substring(i, i + 6);
      if (asc.includes(sub) || desc.includes(sub)) {
        isSequential = true;
        break;
      }
    }
    if (isSequential) {
      setMobileError("Please enter a valid mobile number.");
      return false;
    }

    // Reject repeated dummy numbers
    const dummyList = [
      "0000000000", "1111111111", "2222222222", "3333333333",
      "4444444444", "5555555555", "6666666666", "7777777777",
      "8888888888", "9999999999", "1234567890", "0123456789"
    ];
    if (dummyList.includes(cleaned)) {
      setMobileError("Please enter a valid mobile number.");
      return false;
    }

    setMobileError("");
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFullName(val);
    setNameTouched(true);
    validateName(val);
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Automatically strip spaces, dashes, brackets, and non-numeric characters
    const cleaned = val.replace(/[\s\-()]/g, "").replace(/\D/g, "").slice(0, 10);
    setMobile(cleaned);
    setMobileTouched(true);
    validateMobile(cleaned);
  };

  const handleNameBlur = () => {
    const trimmed = fullName.trim();
    setFullName(trimmed);
    setNameTouched(true);
    validateName(trimmed);
  };

  const handleMobileBlur = () => {
    setMobileTouched(true);
    validateMobile(mobile);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitDetails();
    }
  };

  const handleSubmitDetails = () => {
    setNameTouched(true);
    setMobileTouched(true);

    const isNameValid = validateName(fullName);
    const isMobileValid = validateMobile(mobile);

    if (!isNameValid || !isMobileValid) return;
    if (isSubmittingDetails) return;

    setIsSubmittingDetails(true);
    setStep("loader");
  };

  const handleSelectOption = (optionLabel: string) => {
    if (!currentQuestion) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionLabel,
    }));
  };

  const handleBack = () => {
    if (step === "exam") {
      setStep("class");
    } else if (step === "quiz") {
      if (currentIdx > 0) {
        setCurrentIdx((prev) => prev - 1);
      } else {
        setStep("exam");
      }
    } else if (step === "details") {
      setCurrentIdx(totalQuestions - 1);
      setStep("quiz");
    }
  };

  const isDetailsValid = React.useMemo(() => {
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) return false;
    
    const fakeNames = ["test", "testing", "demo", "sample", "admin", "student", "abc", "xyz", "asdf", "qwerty"];
    if (fakeNames.includes(trimmedName.toLowerCase())) return false;
    
    const normalized = trimmedName.replace(/\s/g, "");
    if (/^(.)\1+$/.test(normalized)) return false;

    const words = trimmedName.split(/\s+/).filter(Boolean);
    if (trimmedName.length < 4 && words.length < 2) return false;

    const allWordsAtLeastTwoChars = words.every(word => word.replace(/[^A-Za-z]/g, "").length >= 2);
    if (!allWordsAtLeastTwoChars) return false;

    if (!/^[A-Za-z\s.]+$/.test(trimmedName)) return false;

    const cleanedMobile = mobile.replace(/\D/g, "");
    if (cleanedMobile.length !== 10) return false;
    if (!/^[6-9]/.test(cleanedMobile)) return false;

    const counts: Record<string, number> = {};
    for (const char of cleanedMobile) {
      counts[char] = (counts[char] || 0) + 1;
    }
    const hasEightIdentical = Object.values(counts).some((count) => count >= 8);
    if (hasEightIdentical) return false;

    if (/^(\d)\1{5}/.test(cleanedMobile)) return false;

    if (/(\d)\1{6}/.test(cleanedMobile)) return false;

    const asc = "01234567890123456789";
    const desc = "98765432109876543210";
    let isSequential = false;
    for (let i = 0; i <= cleanedMobile.length - 6; i++) {
      const sub = cleanedMobile.substring(i, i + 6);
      if (asc.includes(sub) || desc.includes(sub)) {
        isSequential = true;
        break;
      }
    }
    if (isSequential) return false;

    const dummyList = [
      "0000000000", "1111111111", "2222222222", "3333333333",
      "4444444444", "5555555555", "6666666666", "7777777777",
      "8888888888", "9999999999", "1234567890", "0123456789"
    ];
    if (dummyList.includes(cleanedMobile)) return false;

    return true;
  }, [fullName, mobile]);

  const handleQuizNext = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setStep("details");
    }
  };
// Logic implementation remains unchanged below for the standard report generation hook
  React.useEffect(() => {
    if (step !== "loader") return;

    let timerDone = false;
    let saveDone = false;

    const maybeNavigate = () => {
      if (timerDone && saveDone) {
        router.push("/report");
      }
    };

    try {
      const student = {
        name: fullName.trim(),
        phone: mobile.trim(),
        class: studentClass,
        exam: exam
      };
      const sessionData = generateAuditSession(student, answers);
      localStorage.setItem("cnm_kiosk_audit_session", JSON.stringify(sessionData));
      saveDone = true;
    } catch (e) {
      console.error("Failed to save audit session", e);
      saveDone = true;
    }

    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => { setLoaderOpacity(0); }, 500));
    timers.push(setTimeout(() => { setLoaderTextIdx(1); setLoaderOpacity(1); }, 650));

    timers.push(setTimeout(() => { setLoaderOpacity(0); }, 1150));
    timers.push(setTimeout(() => { setLoaderTextIdx(2); setLoaderOpacity(1); }, 1300));

    timers.push(setTimeout(() => { setLoaderOpacity(0); }, 1800));
    timers.push(setTimeout(() => { setLoaderTextIdx(3); setLoaderOpacity(1); }, 1950));

    timers.push(setTimeout(() => { setLoaderOpacity(0); }, 2450));
    timers.push(setTimeout(() => {
      timerDone = true;
      maybeNavigate();
    }, 2600));

    return () => {
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div className="w-full max-w-2xl py-8 space-y-8 animate-fade-in">
      {step !== "loader" && (
        <div className="flex items-center justify-between">
          {step === "class" ? (
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors py-2 px-4 rounded-lg bg-card/60 border border-border/40 hover:border-border"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>
          ) : (
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors py-2 px-4 rounded-lg bg-card/60 border border-border/40 hover:border-border cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}

          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-full border border-border/30">
            {step === "class" && "Class Track"}
            {step === "exam" && "Exam Focus"}
            {step === "quiz" && `Diagnostics`}
            {step === "details" && "Registration"}
          </span>
        </div>
      )}

      {step === "class" && (
        <Card variant="glass" className="relative p-6">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/80 to-transparent" />
          
          <CardHeader className="text-center space-y-3 pb-8">
            <div className="mx-auto h-12 w-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold font-sans text-white">Select Your Academic Class</CardTitle>
              <CardDescription className="mt-1.5">
                Choose your current academic track to customize your diagnostic path.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <RadioCard
              selected={studentClass === "Class 11"}
              title="Class 11"
              description="Standard XI (Foundation Batch)"
              onClick={() => setStudentClass("Class 11")}
              className="p-5 animate-fade-in"
            />
            <RadioCard
              selected={studentClass === "Class 12"}
              title="Class 12"
              description="Standard XII (Target Batch)"
              onClick={() => setStudentClass("Class 12")}
              className="p-5 animate-fade-in"
            />
            <RadioCard
              selected={studentClass === "Dropper"}
              title="Dropper"
              description="Repeater Batch (Dedicated Year)"
              onClick={() => setStudentClass("Dropper")}
              className="p-5 animate-fade-in"
            />
          </CardContent>

          <CardFooter className="pt-6 border-t border-border/40 mt-6 flex justify-end">
            <Button
              type="button"
              disabled={!studentClass}
              onClick={() => setStep("exam")}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-10 flex items-center justify-center gap-2 group min-h-[56px]"
            >
              Next
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "exam" && (
        <Card variant="glass" className="relative p-6">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/80 to-transparent" />
          
          <CardHeader className="text-center space-y-3 pb-8">
            <div className="mx-auto h-12 w-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold font-sans text-white">What Are You Preparing For?</CardTitle>
              <CardDescription className="mt-1.5">
                Select your target entrance exam focus to customize report scoring.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <RadioCard
              selected={exam === "JEE"}
              title="JEE"
              description="Engineering entrance focus (JEE Main & Advanced)"
              onClick={() => setExam("JEE")}
              className="p-5 animate-fade-in"
            />
            <RadioCard
              selected={exam === "NEET"}
              title="NEET"
              description="Medical entrance focus (NEET UG)"
              onClick={() => setExam("NEET")}
              className="p-5 animate-fade-in"
            />
          </CardContent>

          <CardFooter className="pt-6 border-t border-border/40 mt-6 flex justify-end">
            <Button
              type="button"
              disabled={!exam}
              onClick={() => setStep("quiz")}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-10 flex items-center justify-center gap-2 group min-h-[56px]"
            >
              Next
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "quiz" && currentQuestion && (
        <div className="space-y-6">
          <StepIndicator current={currentIdx + 1} total={totalQuestions} label="Diagnostic Step" />

          <QuestionCard
            title={currentQuestion.text}
            description={currentQuestion.description}
            helperText={currentQuestion.helperText}
            variant="glass"
          >
            <div className="grid grid-cols-1 gap-4 pt-2">
              {currentQuestion.options.map((opt, i) => (
                <RadioCard
                  key={i}
                  selected={answers[currentQuestion.id] === opt.label}
                  title={opt.label}
                  description={opt.description}
                  onClick={() => handleSelectOption(opt.label)}
                />
              ))}
            </div>
          </QuestionCard>

          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleBack}
              className="px-8 rounded-xl min-h-[56px]"
            >
              Previous
            </Button>

            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!answers[currentQuestion.id]}
              onClick={handleQuizNext}
              className="px-8 rounded-xl min-h-[56px] flex items-center gap-1.5"
            >
              {currentIdx === totalQuestions - 1 ? "Proceed" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "details" && (
        <Card variant="glass" className="relative p-6">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/80 to-transparent" />
          
          <CardHeader className="text-center space-y-3 pb-8">
            <div className="mx-auto h-12 w-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold font-sans text-white">Almost Done</CardTitle>
              <CardDescription className="mt-1.5">
                Enter your details to unlock your personalized report.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="block text-[10px] font-mono text-gold uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-4 h-5 w-5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Enter student full name"
                  value={fullName}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "w-full bg-[#111111]/80 border text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-1 transition-all font-sans text-sm placeholder:text-zinc-600 min-h-[56px]",
                    (nameTouched && nameError)
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-border focus:border-gold/50 focus:ring-gold/50"
                  )}
                />
              </div>
              {nameTouched && nameError && (
                <p className="text-red-500 text-xs font-mono mt-1 pl-2">{nameError}</p>
              )}
            </div>

            <div className="space-y-2 text-left">
              <label className="block text-[10px] font-mono text-gold uppercase tracking-wider">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-4 h-5 w-5 text-zinc-500" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={handleMobileChange}
                  onBlur={handleMobileBlur}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "w-full bg-[#111111]/80 border text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-1 transition-all font-sans text-sm placeholder:text-zinc-600 min-h-[56px]",
                    (mobileTouched && mobileError)
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-border focus:border-gold/50 focus:ring-gold/50"
                  )}
                />
              </div>
              {mobileTouched && mobileError && (
                <p className="text-red-500 text-xs font-mono mt-1 pl-2">{mobileError}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="pt-6 border-t border-border/40 mt-6 flex justify-end">
            <Button
              type="button"
              disabled={!isDetailsValid || isSubmittingDetails}
              onClick={handleSubmitDetails}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-10 flex items-center justify-center gap-2 group min-h-[56px]"
            >
              Generate My Report
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "loader" && (
        <div className="fixed inset-0 bg-[#0B0B0B] flex flex-col justify-center items-center z-50 animate-fade-in text-center p-4">
          <div className="relative mb-8">
            <div className="w-16 h-16 rounded-full border border-gold/40 flex items-center justify-center bg-gold/5 shadow-[0_0_20px_rgba(212,175,55,0.15)] animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gold to-[#FFE885] opacity-80" />
            </div>
            <div className="absolute inset-[-8px] rounded-full border border-dashed border-gold/20 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div 
            className="text-lg md:text-xl font-medium tracking-wide text-zinc-300 font-sans min-h-[2rem] transition-opacity duration-150 ease-in-out"
            style={{ opacity: loaderOpacity }}
          >
            {loaderTexts[loaderTextIdx]}
          </div>
          <div className="mt-4 text-xs font-mono text-zinc-600 uppercase tracking-widest">
            System Diagnostics
          </div>
        </div>
      )}
    </div>
  );
}
