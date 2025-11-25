/**
 * Snow White Laundry — Atmosphere Control
 * 
 * Sparse starfield, drift layers, parallax behaviors
 */

export interface StarLayer {
  size: number;
  opacity: number;
  duration: number;
  travel: [string, string];
}

export const starfieldLayers: StarLayer[] = [
  {
    size: 320,
    opacity: 0.08,
    duration: 140,
    travel: ['0% 0%', '-35% 20%'],
  },
  {
    size: 180,
    opacity: 0.12,
    duration: 180,
    travel: ['0% 0%', '50% -30%'],
  },
  {
    size: 90,
    opacity: 0.15,
    duration: 240,
    travel: ['0% 0%', '-55% -35%'],
  },
];

export const ambientGlow = {
  opacity: 0.15,
  blur: 140,
  size: '110vh',
  rotation: [0, 6, 0],
  duration: 80,
};

/**
 * Generate starfield configuration
 */
export function getStarfieldConfig() {
  return {
    layers: starfieldLayers,
    ambient: ambientGlow,
    background: '#000000',
  };
}
