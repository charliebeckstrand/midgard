/**
 * Ugoki still: the copy of a preset for a reader who asks for reduced motion.
 * The `transform` lands at once, and every other value keeps its tween.
 *
 * A preset that moves a box sets `transform` directly, so Motion can give the
 * tween to the animation engine of the browser. `MotionConfig reducedMotion`
 * skips only the keys of a single transform (`x`, `y`, `scale`, and the rest),
 * not `transform`. Thus a component that shows such a preset reads the setting
 * and shows this copy of it (WCAG 2.3.3).
 *
 * Layer: kiso · Concern: reduced motion
 */

export function still<P extends { transition: object }>(preset: P) {
	return { ...preset, transition: { ...preset.transition, transform: { duration: 0 } } } as const
}
