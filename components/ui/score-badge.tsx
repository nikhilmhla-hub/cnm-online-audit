import * as React from "react";
import { cn } from "@/lib/utils";

export interface ScoreBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function getGradeDetails(score: number) {
  if (score >= 90) {
    return {
      grade: "Top Performer",
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 shadow-emerald-500/5",
    };
  }
  if (score >= 75) {
    return {
      grade: "Strong",
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    };
  }
  if (score >= 60) {
    return {
      grade: "Average",
      color: "text-gold border-gold/20 bg-gold/5",
    };
  }
  if (score >= 40) {
    return {
      grade: "At Risk",
      color: "text-amber-500 border-amber-500/20 bg-amber-500/5",
    };
  }
  return {
    grade: "Critical",
    color: "text-red-400 border-red-500/20 bg-red-500/5 shadow-red-500/5",
  };
}

const ScoreBadge = React.forwardRef<HTMLDivElement, ScoreBadgeProps>(
  ({ score, size = "md", className, ...props }, ref) => {
    const { grade, color } = getGradeDetails(score);

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center justify-between rounded-xl border font-mono font-bold select-none",
          color,
          {
            "px-2.5 py-1 text-xs gap-1.5": size === "sm",
            "px-4 py-2 text-sm gap-3": size === "md",
            "px-6 py-3.5 text-lg gap-4 rounded-2xl": size === "lg",
          },
          className
        )}
        {...props}
      >
        <span className="opacity-60 text-[10px] tracking-wider uppercase">Score</span>
        <div className="flex items-center gap-1.5">
          <span className="text-white">{score}</span>
          <span className="text-[10px] opacity-40">/</span>
          <span>{grade}</span>
        </div>
      </div>
    );
  }
);
ScoreBadge.displayName = "ScoreBadge";

export { ScoreBadge };
