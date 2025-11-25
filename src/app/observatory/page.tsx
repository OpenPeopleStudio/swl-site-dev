"use client";

import { useEffect, useState } from "react";
import { ObservatoryShell } from "./components/ObservatoryShell";
import { GlassChamber } from "./components/GlassChamber";
import { MetricGlyph } from "./components/MetricGlyph";
import { DriftPlot } from "./components/DriftPlot";
import { ConstellationMap } from "./components/ConstellationMap";
import { EntropyList } from "./components/EntropyList";
import { WorktreeDashboard } from "./components/WorktreeDashboard";

interface SystemPulse {
  totalBreadcrumbs: number;
  newBreadcrumbs7d: number;
  worktreesActive: number;
  entropyLevel: number;
  graphIntegrity: number;
  feedFreshness: string;
  structuredDataValidity: string;
}

interface WorktreeData {
  active: number;
  stale: number;
  total: number;
  worktrees: Array<{
    name: string;
    path: string;
    modified: string;
    ageHours: number;
    isStale: boolean;
    size: number;
    branch?: string;
    agentSource?: string;
  }>;
}

interface EntropyData {
  entropyScore: number;
  totalBreadcrumbs: number;
  totalLinks: number;
  issueCount: number;
  issues: Array<{
    type: string;
    breadcrumb: string;
    severity: "low" | "medium" | "high";
    message: string;
  }>;
}

interface GraphData {
  nodes: number;
  edges: number;
  isolatedNodes: number;
  overlinkedNodes: Array<{ id: string; title: string; linkCount: number }>;
  categories: number;
  clusterBalance: number;
  integrityScore: number;
  connectivityScore: number;
}

interface FeedData {
  status: string;
  timestamp: string;
  content: {
    breadcrumbs: number;
    updates: number;
    total: number;
  };
  feeds: {
    rss: string;
    atom: string;
    json: string;
  };
  sitemap: string;
}

export default function ObservatoryPage() {
  const [systemPulse, setSystemPulse] = useState<SystemPulse | null>(null);
  const [worktrees, setWorktrees] = useState<WorktreeData | null>(null);
  const [entropy, setEntropy] = useState<EntropyData | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [feeds, setFeeds] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all data in parallel
        const [worktreesRes, entropyRes, graphRes, feedsRes, breadcrumbsRes] = await Promise.all([
          fetch("/api/observatory/worktrees"),
          fetch("/api/observatory/entropy"),
          fetch("/api/observatory/graph"),
          fetch("/api/monitoring/feeds"),
          fetch("/api/monitoring/feeds"), // Reuse for breadcrumb count
        ]);

        const worktreesData: WorktreeData = await worktreesRes.json();
        const entropyData: EntropyData = await entropyRes.json();
        const graphData: GraphData = await graphRes.json();
        const feedsData: FeedData = await feedsRes.json();

        setWorktrees(worktreesData);
        setEntropy(entropyData);
        setGraph(graphData);
        setFeeds(feedsData);

        // Calculate system pulse
        const feedTimestamp = new Date(feedsData.timestamp);
        const now = new Date();
        const feedAgeHours = (now.getTime() - feedTimestamp.getTime()) / (1000 * 60 * 60);
        const feedFreshness = feedAgeHours < 1 ? "fresh" : feedAgeHours < 24 ? "recent" : "stale";

        // Mock 7-day velocity (in real implementation, would track historical data)
        const newBreadcrumbs7d = Math.floor(entropyData.totalBreadcrumbs * 0.1);

        setSystemPulse({
          totalBreadcrumbs: entropyData.totalBreadcrumbs,
          newBreadcrumbs7d,
          worktreesActive: worktreesData.active,
          entropyLevel: entropyData.entropyScore,
          graphIntegrity: graphData.integrityScore,
          feedFreshness,
          structuredDataValidity: entropyData.issueCount === 0 ? "valid" : "issues",
        });

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch observatory data:", error);
        setLoading(false);
      }
    }

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Generate mock drift data for cadence plots
  const generateDriftData = (base: number, variance: number = 0.1) => {
    return Array.from({ length: 10 }, () => base + (Math.random() - 0.5) * variance);
  };

  // Generate constellation nodes/edges from graph data
  const constellationNodes = graph
    ? graph.overlinkedNodes.slice(0, 15).map((node, index) => ({
        id: node.id,
        x: 0,
        y: 0,
        links: node.linkCount,
      }))
    : [];
  const constellationEdges = graph
    ? graph.overlinkedNodes.slice(0, 5).flatMap((node, i) =>
        graph.overlinkedNodes.slice(i + 1, i + 3).map((other) => ({
          from: node.id,
          to: other.id,
        }))
      )
    : [];

  if (loading) {
    return (
      <ObservatoryShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white/40 text-sm font-light">Loading observatory...</div>
        </div>
      </ObservatoryShell>
    );
  }

  return (
    <ObservatoryShell>
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-light text-white/90 mb-2 tracking-wide">
            Operational Observatory
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-white/30 font-light">
            Snow White Laundry · Overshare Engine Control Room
          </p>
        </header>

        {/* Six Chambers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Chamber 1 — System Pulse */}
          <GlassChamber title="System Pulse" className="lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <MetricGlyph
                label="Breadcrumbs"
                value={systemPulse?.totalBreadcrumbs || 0}
              />
              <MetricGlyph
                label="New (7d)"
                value={systemPulse?.newBreadcrumbs7d || 0}
              />
              <MetricGlyph
                label="Worktrees"
                value={systemPulse?.worktreesActive || 0}
              />
              <MetricGlyph
                label="Entropy"
                value={systemPulse?.entropyLevel?.toFixed(2) || "0.00"}
              />
              <MetricGlyph
                label="Graph Score"
                value={systemPulse?.graphIntegrity?.toFixed(2) || "0.00"}
              />
              <MetricGlyph
                label="Feed State"
                value={systemPulse?.feedFreshness || "unknown"}
              />
              <MetricGlyph
                label="Data Validity"
                value={systemPulse?.structuredDataValidity || "unknown"}
              />
            </div>
          </GlassChamber>

          {/* Chamber 2 — Worktree Horizon */}
          <GlassChamber title="Worktree Horizon">
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                <span>Active: {worktrees?.active || 0}</span>
                <span>Stale: {worktrees?.stale || 0}</span>
              </div>
            </div>
            <WorktreeDashboard worktrees={worktrees?.worktrees || []} />
          </GlassChamber>

          {/* Chamber 3 — Entropy Field */}
          <GlassChamber title="Entropy Field">
            <div className="mb-4">
              <MetricGlyph
                label="Entropy Score"
                value={entropy?.entropyScore?.toFixed(2) || "0.00"}
                className="mb-4"
              />
            </div>
            <EntropyList issues={entropy?.issues || []} maxItems={10} />
          </GlassChamber>

          {/* Chamber 4 — Graph Health Constellation */}
          <GlassChamber title="Graph Health Constellation">
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-white/30 mb-1">Nodes</div>
                  <div className="text-white/80 text-lg">{graph?.nodes || 0}</div>
                </div>
                <div>
                  <div className="text-white/30 mb-1">Edges</div>
                  <div className="text-white/80 text-lg">{graph?.edges || 0}</div>
                </div>
                <div>
                  <div className="text-white/30 mb-1">Isolated</div>
                  <div className="text-white/80 text-lg">{graph?.isolatedNodes || 0}</div>
                </div>
                <div>
                  <div className="text-white/30 mb-1">Integrity</div>
                  <div className="text-white/80 text-lg">
                    {graph?.integrityScore?.toFixed(2) || "0.00"}
                  </div>
                </div>
              </div>
            </div>
            <ConstellationMap
              nodes={constellationNodes}
              edges={constellationEdges}
            />
          </GlassChamber>

          {/* Chamber 5 — Feed & JSON State */}
          <GlassChamber title="Feed & JSON State">
            <div className="space-y-4">
              <div className="text-xs">
                <div className="text-white/30 mb-1">RSS Feed</div>
                <div className="text-white/60 font-mono text-[10px] truncate">
                  {feeds?.feeds.rss || "—"}
                </div>
              </div>
              <div className="text-xs">
                <div className="text-white/30 mb-1">Atom Feed</div>
                <div className="text-white/60 font-mono text-[10px] truncate">
                  {feeds?.feeds.atom || "—"}
                </div>
              </div>
              <div className="text-xs">
                <div className="text-white/30 mb-1">JSON Index</div>
                <div className="text-white/60 font-mono text-[10px] truncate">
                  {feeds?.feeds.json || "—"}
                </div>
              </div>
              <div className="text-xs">
                <div className="text-white/30 mb-1">Sitemap</div>
                <div className="text-white/60 font-mono text-[10px] truncate">
                  {feeds?.sitemap || "—"}
                </div>
              </div>
              <div className="pt-2 border-t border-white/5">
                <div className="text-white/30 text-[10px]">
                  Last updated: {feeds?.timestamp ? new Date(feeds.timestamp).toLocaleTimeString() : "—"}
                </div>
              </div>
            </div>
          </GlassChamber>

          {/* Chamber 6 — Cadence + Drift Monitor */}
          <GlassChamber title="Cadence + Drift Monitor">
            <div className="space-y-6">
              <div>
                <div className="text-xs text-white/30 mb-2">Breadcrumb Velocity</div>
                <DriftPlot
                  data={generateDriftData(systemPulse?.newBreadcrumbs7d || 0, 2)}
                  height={30}
                />
              </div>
              <div>
                <div className="text-xs text-white/30 mb-2">Entropy Drift</div>
                <DriftPlot
                  data={generateDriftData(entropy?.entropyScore || 0.5, 0.1)}
                  height={30}
                />
              </div>
              <div>
                <div className="text-xs text-white/30 mb-2">Graph Connectivity</div>
                <DriftPlot
                  data={generateDriftData(graph?.connectivityScore || 0.5, 0.1)}
                  height={30}
                />
              </div>
            </div>
          </GlassChamber>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-white/5">
          <p className="text-xs text-white/20 font-light text-center">
            Operational Observatory · Snow White Laundry Overshare Engine
          </p>
        </footer>
      </div>
    </ObservatoryShell>
  );
}
