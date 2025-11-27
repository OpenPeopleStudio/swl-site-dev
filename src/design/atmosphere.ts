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
    size: 220,
    opacity: 0.08,
    duration: 110,
    travel: ['-8% -5%', '18% 20%'],
  },
  {
    size: 160,
    opacity: 0.12,
    duration: 150,
    travel: ['0% 0%', '-40% 25%'],
  },
  {
    size: 120,
    opacity: 0.14,
    duration: 190,
    travel: ['4% 2%', '42% -22%'],
  },
  {
    size: 90,
    opacity: 0.16,
    duration: 220,
    travel: ['0% 0%', '-55% -35%'],
  },
  {
    size: 64,
    opacity: 0.18,
    duration: 260,
    travel: ['-3% 6%', '30% 45%'],
  },
  {
    size: 44,
    opacity: 0.2,
    duration: 320,
    travel: ['2% -4%', '-38% 40%'],
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
