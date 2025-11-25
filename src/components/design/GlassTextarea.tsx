"use client";

import { type TextareaHTMLAttributes, forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { getFocusGlow } from "@/design/reflections";

interface GlassTextareaProps extends Omit<HTMLMotionProps<"textarea">, "children"> {
  label?: string;
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ label, className = "", rows, value, onChange, placeholder, required, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label className="text-xs sm:text-sm uppercase tracking-[0.2em] text-white/40 font-light">
            {label}
          </label>
        )}
        <motion.textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-white/[0.02] border border-white/10 rounded-lg px-4 sm:px-6 py-3 sm:py-4 text-white/90 placeholder:text-white/30 backdrop-blur-sm transition-all duration-400 resize-none ${className}`}
          style={getFocusGlow()}
          whileFocus={{
            borderColor: "rgba(255, 255, 255, 0.2)",
            boxShadow: "0 0 20px rgba(255, 255, 255, 0.1), inset 0 0 10px rgba(255, 255, 255, 0.05)",
          }}
          {...props}
        />
      </div>
    );
  }
);

GlassTextarea.displayName = "GlassTextarea";
