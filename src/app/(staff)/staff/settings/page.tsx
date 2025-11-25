"use client";

import { PageHeader } from "@/components/design/PageHeader";
import { GlassSection } from "@/components/design/GlassSection";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import type { SettingsRole } from "@/components/settings/types";

export default function StaffSettingsPage() {
  const role: SettingsRole = "boh";

  return (
    <div className="mx-auto px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32 py-20 sm:py-24 md:py-32 lg:py-40" style={{ maxWidth: "1400px" }}>
      <PageHeader
        title="Settings"
        subtitle="SettingsOS"
      />

      <GlassSection delay={0.3}>
        <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed mb-10 sm:mb-12 md:mb-16">
          Update your identity, preferences, and notification options. Owners unlock additional modules.
        </p>

        <SettingsWorkspace role={role} />
      </GlassSection>
    </div>
  );
}
