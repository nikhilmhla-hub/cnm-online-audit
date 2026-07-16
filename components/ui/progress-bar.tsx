import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // current value
  max?: number; // max value, default 100
  showLabel?: boolean;
  label?: string;
  sublabel?: string;
  animate?: boolean;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      max = 100,
      showLabel = true,
      label,
      sublabel,
      animate = true,
      className,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div ref={ref} className={cn("w-full space-y-2.5", className)} {...props}>
        {showLabel && (
          <div className="flex justify-between items-end text-xs font-mono">
            <span className="text-zinc-400 font-medium">
              {label || "Assessment Progress"}
            </span>
            <span className="text-gold font-bold">
              {sublabel || `${Math.round(percentage)}%`}
            </span>
          </div>
        )}
        <div className="h-2 w-full bg-zinc-900 border border-border/40 rounded-full overflow-hidden relative">
          <div
            style={{ width: `${percentage}%` }}
            className={cn(
              "h-full rounded-full bg-gradient-to-r from-gold to-[#C59B27] shadow-[0_0_8px_rgba(212,175,55,0.4)]",
              {
                "transition-all duration-500 ease-out": animate,
              }
            )}
          />
        </div>
      </div>
    );
  }
);
ProgressBar.displayName = "ProgressBar";

export { ProgressBar };
