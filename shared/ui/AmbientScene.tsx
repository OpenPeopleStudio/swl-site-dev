"use client";

import Starfield from "./Starfield";
import { useAmbientGlow } from "@/apps/core/useAmbientGlow";
import { useReactiveVisuals } from "@/apps/core/useReactiveVisuals";

export default function AmbientScene() {
  useAmbientGlow();
  useReactiveVisuals();

  return (
    <>
      <Starfield />
    </>
  );
}
