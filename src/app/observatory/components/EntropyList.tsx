"use client";

interface EntropyIssue {
  type: string;
  breadcrumb: string;
  severity: "low" | "medium" | "high";
  message: string;
}

interface EntropyListProps {
  issues: EntropyIssue[];
  maxItems?: number;
}

export function EntropyList({ issues, maxItems = 20 }: EntropyListProps) {
  const displayedIssues = issues.slice(0, maxItems);

  const severityStyles = {
    low: "text-white/30",
    medium: "text-white/50",
    high: "text-white/70",
  };

  const typeLabels: Record<string, string> = {
    linguistic_drift: "Linguistic drift",
    missing_metadata: "Missing metadata",
    broken_link: "Broken link",
    isolated_node: "Isolated node",
    structural_violation: "Structural violation",
    semantic_outlier: "Semantic outlier",
  };

  if (displayedIssues.length === 0) {
    return (
      <div className="text-xs text-white/30 font-light italic">
        No issues detected
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {displayedIssues.map((issue, index) => (
        <div
          key={index}
          className="flex items-start gap-4 sm:gap-5 text-xs sm:text-sm border-b border-white/5 pb-3 sm:pb-4 last:border-0"
        >
          <span className={`font-light ${severityStyles[issue.severity]}`}>
            {typeLabels[issue.type] || issue.type}
          </span>
          <span className="text-white/20">·</span>
          <span className="text-white/40 font-mono text-[10px] flex-1 truncate">
            {issue.breadcrumb.replace("breadcrumb-swl-", "").replace(".md", "")}
          </span>
          <span className={`text-[10px] ${severityStyles[issue.severity]}`}>
            {issue.message}
          </span>
        </div>
      ))}
    </div>
  );
}
