/**
 * Ugoki toast: toast slide-in from the top or bottom edge.
 *
 * Layer: kiso · Concern: toast motion
 */

function slide(value: string) {
	return {
		initial: { y: value, opacity: 1 },
		animate: { y: 0, opacity: 1 },
		exit: { y: value, opacity: 1 },
		transition: { duration: 0.15, ease: 'easeOut' as const },
	}
}

export const toast = {
	top: slide('-100%'),
	bottom: slide('100%'),
}
