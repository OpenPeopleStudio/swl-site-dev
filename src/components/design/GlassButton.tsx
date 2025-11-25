"use client";

import { type ReactNode, type ButtonHTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { getFocusGlow } from "@/design/reflections";
import Link from "next/link";

interface GlassButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  variant?: "primary" | "secondary";
  href?: string;
}

export function GlassButton({ 
  children, 
  variant = "primary", 
  href,
  className = "",
  type = "button",
  disabled,
  onClick,
  ...props 
}: GlassButtonProps) {
  const baseStyles = "rounded-full border backdrop-blur-sm px-10 sm:px-12 md:px-16 py-5 sm:py-6 md:py-7 text-sm sm:text-base uppercase tracking-[0.2em] transition-all duration-400";
  
  const variantStyles = {
    primary: "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10",
    secondary: "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:bg-white/[0.05]",
  };

  if (href) {
    return (
      <Link href={href} className="inline-block">
        <motion.div
          className={`${baseStyles} ${variantStyles[variant]} ${className} inline-block cursor-pointer`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={getFocusGlow()}
        >
          {children}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={getFocusGlow()}
      {...props}
    >
      {children}
    </motion.button>
  );
}
