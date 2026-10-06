/**
 * The class that marks the root element when the Motion setting of the app is
 * `'reduced'`. `AppearanceScript` adds it before the first paint, and
 * `AppearanceProvider` keeps it in step with the stored choice. The
 * `motion-reduce` and `motion-safe` variants read it (`core/motion/variants.ts`).
 */
export const rootReducedMotionClass = 'reduced-motion'
