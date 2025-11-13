import { StaffMotivationLayer } from "@/components/owner/StaffMotivationLayer";
import { GuestRelationshipIntel } from "@/components/owner/GuestRelationshipIntel";
import { OwnerTimeHorizonView } from "@/components/owner/OwnerTimeHorizonView";
import { OwnerReflectionPanel } from "@/components/owner/OwnerReflectionPanel";

type OwnerConsoleAdvancedModulesProps = {
  staffMotivation: React.ComponentProps<typeof StaffMotivationLayer>;
  guestIntelligence: React.ComponentProps<typeof GuestRelationshipIntel>;
  timeHorizon: React.ComponentProps<typeof OwnerTimeHorizonView>;
  reflection: React.ComponentProps<typeof OwnerReflectionPanel>;
};

export function OwnerConsoleAdvancedModules({
  staffMotivation,
  guestIntelligence,
  timeHorizon,
  reflection,
}: OwnerConsoleAdvancedModulesProps) {
  return (
    <div className="flex flex-col gap-6">
      <StaffMotivationLayer {...staffMotivation} />
      <GuestRelationshipIntel {...guestIntelligence} />
      <OwnerTimeHorizonView {...timeHorizon} />
      <OwnerReflectionPanel {...reflection} />
    </div>
  );
}
