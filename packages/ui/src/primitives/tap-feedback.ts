import { ugoki } from '../recipes'

/**
 * Tap feedback — spreadable motion props for press interactions.
 *
 * Apply to any motion element for consistent tap animation:
 * `<motion.span {...tapFeedback}>` or `<motion.button {...tapFeedback}>`
 */
export const tapFeedback = {
	whileTap: { scale: 0.98 } as const,
	transition: ugoki.tap,
}
