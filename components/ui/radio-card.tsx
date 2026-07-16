"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface RadioCardProps extends React.HTMLAttributes<HTMLButtonElement> {
  selected: boolean;
  title: string;
  description?: string;
  points?: string | number;
  disabled?: boolean;
}

const RadioCard = React.forwardRef<HTMLButtonElement, RadioCardProps>(
  ({ selected, title, description, points, disabled = false, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        type="button"
        className={cn(
          "w-full flex items-start justify-between p-5 rounded-2xl border bg-card text-left transition-all duration-300 select-none outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99] touch-manipulation cursor-pointer",
          {
            // Selected variant: gold border, golden drop glow
            "border-gold bg-gold/[0.02] shadow-lg shadow-gold/5": selected,
            // Unselected variant: normal border
            "border-border hover:border-gold/30 hover:bg-zinc-900/10": !selected,
          },
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-4 flex-1 pr-4">
          {/* Custom Radio Circular Indicator */}
          <div
            className={cn(
              "h-6 w-6 shrink-0 rounded-full border flex items-center justify-center transition-all duration-300 mt-0.5",
              {
                "border-gold bg-gold text-black": selected,
                "border-zinc-700 bg-zinc-900/60": !selected,
              }
            )}
          >
            {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </div>

          <div className="space-y-1">
            <h4
              className={cn(
                "font-semibold text-base leading-snug transition-colors",
                selected ? "text-gold" : "text-white"
              )}
            >
              {title}
            </h4>
            {description && (
              <p className="text-zinc-400 text-sm font-light leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Option Score Value Badge */}
        {points !== undefined && (
          <span
            className={cn(
              "shrink-0 font-mono text-xs font-bold px-2.5 py-1 rounded-md border",
              selected
                ? "border-gold/30 bg-gold/10 text-gold"
                : "border-border bg-zinc-900/40 text-zinc-500"
            )}
          >
            {typeof points === "number" && points >= 0 ? `+${points} Pts` : `${points}`}
          </span>
        )}
      </button>
    );
  }
);
RadioCard.displayName = "RadioCard";

export { RadioCard };
