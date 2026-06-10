/**
 * Ugoki collapse: height reveal for `<Collapse>` panels. Two variants:
 * `fade` crossfades opacity alongside the height change; `slide` is
 * height-only.
 *
 * Layer: kiso · Concern: collapse motion
 */

export const collapse = {
	fade: {
		initial: { height: 0, opacity: 0 },
		animate: { height: 'auto', opacity: 1 },
		exit: { height: 0, opacity: 0 },
		transition: { duration: 0.2, ease: 'easeInOut' as const },
	},
	slide: {
		initial: { height: 0 },
		animate: { height: 'auto' },
		exit: { height: 0 },
		transition: { duration: 0.2, ease: 'easeInOut' as const },
	},
}
