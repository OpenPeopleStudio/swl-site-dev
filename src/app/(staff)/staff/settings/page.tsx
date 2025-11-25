"use client";

import { PageHeader } from "@/components/design/PageHeader";
import { GlassSection } from "@/components/design/GlassSection";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import type { SettingsRole } from "@/components/settings/types";

export default function StaffSettingsPage() {
  const role: SettingsRole = "boh";

  return (
    <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12 md:py-16" style={{ maxWidth: "1800px" }}>
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
  );
}
