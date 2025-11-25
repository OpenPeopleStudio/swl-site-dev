"use client";

interface Worktree {
  name: string;
  path: string;
  modified: string;
  ageHours: number;
  isStale: boolean;
  size: number;
  branch?: string;
  agentSource?: string;
}

interface WorktreeDashboardProps {
  worktrees: Worktree[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatAge(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function WorktreeDashboard({ worktrees }: WorktreeDashboardProps) {
  if (worktrees.length === 0) {
    return (
      <div className="text-xs text-white/30 font-light italic">
        No worktrees active
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {worktrees.map((worktree) => (
        <div
          key={worktree.name}
          className={`flex items-center gap-5 sm:gap-6 text-xs sm:text-sm border-b border-white/5 pb-3 sm:pb-4 last:border-0 ${
            worktree.isStale ? "opacity-50" : ""
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white/60 font-mono truncate">
                {worktree.name}
              </span>
              {worktree.isStale && (
                <span className="text-white/20 text-[10px]">stale</span>
              )}
            </div>
            {worktree.branch && (
              <div className="text-white/30 text-[10px] mt-0.5">
                {worktree.branch}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-white/40 text-[10px]">
            <span>{formatAge(worktree.ageHours)}</span>
            <span>{formatSize(worktree.size)}</span>
            {worktree.agentSource && (
              <span className="text-white/20">{worktree.agentSource}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
