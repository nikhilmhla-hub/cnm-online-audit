"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "gold" | "outline";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.97] touch-manipulation cursor-pointer",
          // Variants
          {
            // Primary: Gold CTA Button (Matches premium Gold styling)
            "bg-[#D4AF37] text-black hover:bg-[#C59B27] shadow-lg shadow-[#D4AF37]/15 font-bold border border-transparent":
              variant === "primary" || variant === "gold",
            // Secondary: Dark Outline Button (Matches matte-black theme)
            "bg-[#141414]/60 text-white border border-[#262626] hover:bg-[#1E1E1E] hover:border-[#333333] hover:text-white shadow-md":
              variant === "secondary" || variant === "outline",
          },
          // Sizes (touch-friendly targets for kiosk use)
          {
            "h-10 px-4 text-xs": size === "sm",
            "h-12 px-6 text-sm": size === "md",
            "h-14 px-8 text-base tracking-wide": size === "lg", // Highly recommended for kiosk touch screens
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
