"use client";

import { SiteShell } from "@/components/design/SiteShell";
import { PageHeader } from "@/components/design/PageHeader";
import { GlassSection } from "@/components/design/GlassSection";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import type { SettingsRole } from "@/components/settings/types";

export default function StaffSettingsPage() {
  const role: SettingsRole = "boh";

  return (
    <SiteShell>
      <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-6 2xl:px-8 py-8 sm:py-12 md:py-16" style={{ maxWidth: "100%", width: "100%" }}>
        <PageHeader
          title="Settings"
          subtitle="SettingsOS"
        />

        <GlassSection delay={0.3}>
          <p className="text-base sm:text-lg md:text-xl text-white/60 leading-relaxed mb-6 sm:mb-8">
            Update your identity, preferences, and notification options. Owners unlock additional modules.
          </p>

          <SettingsWorkspace role={role} />
        </GlassSection>
      </div>
    </SiteShell>
  );
}
