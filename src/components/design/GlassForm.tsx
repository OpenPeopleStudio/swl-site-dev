"use client";

import { type ReactNode, type FormHTMLAttributes } from "react";

interface GlassFormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
}

export function GlassForm({ children, className = "", ...props }: GlassFormProps) {
  return (
    <form className={`space-y-6 sm:space-y-8 ${className}`} {...props}>
      {children}
    </form>
  );
}
