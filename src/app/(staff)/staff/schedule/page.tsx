"use client";

import { PageHeader } from "@/components/design/PageHeader";
import { GlassSection } from "@/components/design/GlassSection";
import StaffSchedulingBoard from "@/apps/staff-console/manager/StaffSchedulingBoard";
import StaffCalendarBoard from "@/apps/staff-console/manager/StaffCalendarBoard";

export default function SchedulePage() {
  return (
    <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12 md:py-16" style={{ maxWidth: "1800px" }}>
      <PageHeader
        title="Schedule"
        subtitle="Crew Coordination"
      />

      <GlassSection delay={0.3}>
        <p className="text-base sm:text-lg md:text-xl text-white/60 leading-relaxed mb-6 sm:mb-8">
          Weekly schedules, shift rotations, and live route drift. Track crew assignments and handoff times.
        </p>

        <div className="space-y-6 sm:space-y-8">
      <StaffSchedulingBoard />
      <StaffCalendarBoard />
        </div>
      </GlassSection>
    </div>
  );
}
