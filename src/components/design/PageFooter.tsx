"use client";

import Link from "next/link";

interface PageFooterProps {
  className?: string;
}

export function PageFooter({ className = "" }: PageFooterProps) {
  return (
    <footer className={`mt-32 sm:mt-40 md:mt-48 lg:mt-56 border-t border-white/10 pt-12 sm:pt-16 md:pt-20 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-6 sm:gap-8 text-xs sm:text-sm text-white/30">
        <p>Snow White Laundry</p>
        <div className="flex items-center gap-6">
          <Link href="/overshare" className="text-white/30 hover:text-white/50 transition-colors">
            Overshare
          </Link>
          <span className="text-white/10">·</span>
          <p className="text-white/20">
            Powered by{" "}
            <a
              href="https://openpeople.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white/60 transition-colors"
            >
              Open People
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
