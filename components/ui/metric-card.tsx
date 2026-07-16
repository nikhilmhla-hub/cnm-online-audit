import * as React from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  subtext?: string;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    { title, value, change, changeType = "neutral", icon, subtext, className, ...props },
    ref
  ) => {
    return (
      <Card ref={ref} className={cn("p-6 md:p-8 flex flex-col justify-between hoverable", className)} {...props}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              {title}
            </span>
            <div className="text-3xl md:text-4xl font-bold tracking-tight text-white font-mono mt-1">
              {value}
            </div>
          </div>
          {icon && (
            <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-border flex items-center justify-center text-zinc-400">
              {icon}
            </div>
          )}
        </div>

        {(change || subtext) && (
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border/40 text-xs">
            {change && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full border",
                  {
                    "text-emerald-400 bg-emerald-500/5 border-emerald-500/10":
                      changeType === "positive",
                    "text-red-400 bg-red-500/5 border-red-500/10":
                      changeType === "negative",
                    "text-gold bg-gold/5 border-gold/10":
                      changeType === "neutral",
                  }
                )}
              >
                {changeType === "positive" && <TrendingUp className="h-3 w-3" />}
                {changeType === "negative" && <TrendingDown className="h-3 w-3" />}
                {changeType === "neutral" && <Minus className="h-3 w-3" />}
                {change}
              </span>
            )}
            {subtext && <span className="text-zinc-500 font-light">{subtext}</span>}
          </div>
        )}
      </Card>
    );
  }
);
MetricCard.displayName = "MetricCard";

export { MetricCard };
