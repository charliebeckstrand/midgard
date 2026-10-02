import { omote, sou, ugoki } from '../kiso'

const { backdrop } = omote
const { overlay } = ugoki

export const k = {
	motion: overlay,
	backdrop,
	// Seals the page for a transaction. `Chrome`, floats, and toasts all
	// sit above — see the `sou` ladder.
	root: sou.overlay,
	/**
	 * The box of a root fixed to the viewport: the part of the screen that the
	 * reader sees, from `useVisualViewport`. A panel on the bottom edge of the box
	 * stays above a browser toolbar and an iOS keyboard. Without a reading, the
	 * box is the full viewport.
	 */
	frame:
		'fixed inset-x-0 top-[var(--visual-viewport-top,0px)] h-[var(--visual-viewport-height,100%)]',
	/** The box of a root scoped to a container: the full container. */
	scoped: 'absolute inset-0',
}
