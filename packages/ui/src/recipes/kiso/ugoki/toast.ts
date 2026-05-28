/**
 * Ugoki toast — toast slide-in from the edge, keyed by position side.
 *
 * Layer: kiso · Concern: toast motion
 */

function slide(axis: 'x' | 'y', value: string) {
	return {
		initial: { [axis]: value, opacity: 1 },
		animate: { [axis]: 0, opacity: 1 },
		exit: { [axis]: value, opacity: 1 },
		transition: { duration: 0.15, ease: 'easeOut' as const },
	}
}

export const toast = {
	right: slide('x', '100%'),
	left: slide('x', '-100%'),
	top: slide('y', '-100%'),
	bottom: slide('y', '100%'),
}
