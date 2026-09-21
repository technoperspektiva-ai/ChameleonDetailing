export const motion = {
  instant: 90,
  fast: 160,
  normal: 240,
  slow: 360,
  hero: 520,
  splashMin: 850,
  calculatorOverlayMin: 750,
  startupTimeout: 8000,
} as const;

export const easing = {
  standard: 'cubic-bezier(.2,.8,.2,1)',
  enter: 'cubic-bezier(.16,1,.3,1)',
  exit: 'cubic-bezier(.4,0,1,1)',
  springSoft: 'cubic-bezier(.2,1.35,.4,1)',
} as const;
