/**
 * Ugoki panel — slide-from-edge panel configs keyed by direction. Used
 * by sheet and drawer to animate the panel into view from its anchored
 * edge.
 *
 * Layer: kiso · Concern: panel motion
 */

function slide(axis: 'x' | 'y', value: string) {
	return {
		initial: { [axis]: value, opacity: 1 },
		animate: { [axis]: 0, opacity: 1 },
		exit: { [axis]: value, opacity: 1 },
		transition: { duration: 0.15 },
	}
}

export const panel = {
	right: slide('x', '100%'),
	left: slide('x', '-100%'),
	top: slide('y', '-100%'),
	bottom: slide('y', '100%'),
}
