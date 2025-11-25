"use client";

import {
  StaffReflectionBoard,
  type BoardReflection,
  type ReflectionPrompt,
} from "@/apps/staff-console/boh/StaffReflectionBoard";

interface ReflectionPageClientProps {
  reflections: BoardReflection[];
  prompts: ReflectionPrompt[];
}

export function ReflectionPageClient({ reflections, prompts }: ReflectionPageClientProps) {
  return <StaffReflectionBoard initialReflections={reflections} prompts={prompts} />;
}
