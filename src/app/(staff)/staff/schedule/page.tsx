"use client";

import { PageHeader } from "@/components/design/PageHeader";
import { GlassSection } from "@/components/design/GlassSection";
import StaffSchedulingBoard from "@/apps/staff-console/manager/StaffSchedulingBoard";
import StaffCalendarBoard from "@/apps/staff-console/manager/StaffCalendarBoard";

export default function SchedulePage() {
  return (
    <div className="mx-auto px-8 sm:px-12 md:px-16 lg:px-24 xl:px-32 py-20 sm:py-24 md:py-32 lg:py-40" style={{ maxWidth: "1400px" }}>
      <PageHeader
        title="Schedule"
        subtitle="Crew Coordination"
      />

      <GlassSection delay={0.3}>
        <p className="text-lg sm:text-xl md:text-2xl text-white/60 leading-relaxed mb-10 sm:mb-12 md:mb-16">
          Weekly schedules, shift rotations, and live route drift. Track crew assignments and handoff times.
        </p>

        <div className="space-y-12 sm:space-y-16 md:space-y-20">
          <StaffSchedulingBoard />
          <StaffCalendarBoard />
        </div>
      </GlassSection>
    </div>
  );
}
