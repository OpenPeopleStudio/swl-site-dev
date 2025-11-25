import StaffSchedulingBoard from "@/apps/staff-console/manager/StaffSchedulingBoard";
import StaffCalendarBoard from "@/apps/staff-console/manager/StaffCalendarBoard";

export default function SchedulePage() {
  return (
    <div className="flex w-full flex-col gap-8">
      <StaffSchedulingBoard />
      <StaffCalendarBoard />
    </div>
  );
}
