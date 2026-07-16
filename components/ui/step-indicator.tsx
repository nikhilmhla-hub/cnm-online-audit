"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/progress-bar";

export interface StepIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  current: number;
  total: number;
  label?: string;
  animate?: boolean;
}

const StepIndicator = React.forwardRef<HTMLDivElement, StepIndicatorProps>(
  ({ current, total, label = "Question", animate = true, className, ...props }, ref) => {
    const percentage = Math.min(Math.max((current / total) * 100, 0), 100);

    return (
      <div
        ref={ref}
        className={cn("w-full space-y-3 p-1 select-none", className)}
        {...props}
      >
        <ProgressBar
          value={current}
          max={total}
          animate={animate}
          showLabel={true}
          label={`${label} ${current} of ${total}`}
          sublabel={`${Math.round(percentage)}% Completed`}
        />
      </div>
    );
  }
);
StepIndicator.displayName = "StepIndicator";

export { StepIndicator };
