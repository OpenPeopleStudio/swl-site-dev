/**
 * Snow White Laundry — Motion Specifications
 * 
 * Physics-driven micro-drift, ease-out ceremonial transitions,
 * slow luminance fades
 */

export const motionCurves = {
  easeOut: [0.16, 1, 0.3, 1] as const,
  ceremonial: [0.19, 1, 0.22, 1] as const,
  drift: [0.5, 0, 0.5, 1] as const,
};

export const motionTiming = {
  fast: 200,
  base: 400,
  slow: 800,
  ceremonial: 1200,
};

export const driftConfig = {
  amplitude: 2,
  period: 12,
  phase: () => Math.random() * Math.PI * 2,
};

/**
 * Generate drift animation values
 */
export function generateDrift(amplitude: number = driftConfig.amplitude) {
  const phase = Math.random() * Math.PI * 2;
  return {
    x: [
      Math.sin(phase) * amplitude,
      Math.sin(phase + Math.PI) * amplitude,
      Math.sin(phase) * amplitude,
    ],
    y: [
      Math.cos(phase) * amplitude,
      Math.cos(phase + Math.PI) * amplitude,
      Math.cos(phase) * amplitude,
    ],
  };
}

/**
 * Ceremonial entrance animation
 */
export const ceremonialEntrance = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: motionTiming.ceremonial / 1000,
    ease: motionCurves.ceremonial,
  },
};

/**
 * Ritual transition
 */
export const ritualTransition = {
  duration: motionTiming.slow / 1000,
  ease: motionCurves.easeOut,
};

/**
 * Luminance fade
 */
export const luminanceFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: {
    duration: motionTiming.slow / 1000,
    ease: motionCurves.easeOut,
  },
};
