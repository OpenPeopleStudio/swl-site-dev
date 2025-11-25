/**
 * Snow White Laundry — Reflection Physics
 * 
 * Soft highlight physics for glass surfaces
 */

export const reflectionIntensity = {
  soft: 0.03,
  medium: 0.06,
  strong: 0.1,
};

/**
 * Generate reflection styles for glass surfaces
 */
export function getReflectionStyles(intensity: keyof typeof reflectionIntensity = 'soft') {
  const opacity = reflectionIntensity[intensity];
  
  return {
    boxShadow: `
      0 0 40px rgba(255, 255, 255, ${opacity * 0.3}),
      inset 0 0 20px rgba(255, 255, 255, ${opacity * 0.1}),
      0 1px 0 rgba(255, 255, 255, ${opacity})
    `,
  };
}

/**
 * Hover reflection enhancement
 */
export function getHoverReflection(intensity: keyof typeof reflectionIntensity = 'medium') {
  const opacity = reflectionIntensity[intensity];
  
  return {
    boxShadow: `
      0 0 60px rgba(255, 255, 255, ${opacity * 0.4}),
      inset 0 0 30px rgba(255, 255, 255, ${opacity * 0.15}),
      0 1px 0 rgba(255, 255, 255, ${opacity * 1.5})
    `,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  };
}

/**
 * Focus glow for inputs
 */
export function getFocusGlow() {
  return {
    boxShadow: `
      0 0 20px rgba(255, 255, 255, 0.1),
      inset 0 0 10px rgba(255, 255, 255, 0.05)
    `,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  };
}
