import { StaffMotivationLayer } from "@/apps/owner-console/components/owner/StaffMotivationLayer";
import { GuestRelationshipIntel } from "@/apps/owner-console/components/owner/GuestRelationshipIntel";
import { OwnerTimeHorizonView } from "@/apps/owner-console/components/owner/OwnerTimeHorizonView";
import { OwnerReflectionPanel } from "@/apps/owner-console/components/owner/OwnerReflectionPanel";

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
