import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-neutral-900/60 p-4 text-white shadow-lg backdrop-blur-xl ${className}`}
      style={{
        fontFamily: "Geist, 'Eurostile', 'Space Grotesk', system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}

export default Card;
