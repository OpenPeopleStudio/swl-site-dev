import StaffSchedulingBoard from "@/components/staff/StaffSchedulingBoard";
import StaffCalendarBoard from "@/components/staff/StaffCalendarBoard";

export default function SchedulePage() {
  return (
    <div className="flex w-full flex-col gap-8">
      <StaffSchedulingBoard />
      <StaffCalendarBoard />
    </div>
  );
}
