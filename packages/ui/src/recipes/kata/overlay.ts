import { omote, sou, ugoki } from '../kiso'

const { backdrop } = omote
const { overlay } = ugoki

export const k = {
	motion: overlay,
	backdrop,
	// Seals the page for a transaction. `Chrome`, floats, and toasts all
	// sit above — see the `sou` ladder.
	base: sou.overlay,
	/** The rung of an overlay that covers the `Chrome` regions too. */
	cover: sou.cover,
	/**
	 * The box of an overlay fixed to the viewport: the full viewport. The browser
	 * keeps a fixed box clear of its own toolbars.
	 */
	frame: 'fixed inset-0',
	/**
	 * The box of an overlay scoped to a container: the full container.
	 *
	 * It clips what it holds, and it is not a scroll container. A panel waits
	 * outside the box until it slides in. If its overflow reached the container,
	 * the move of the focus into the panel would scroll the container to the
	 * panel, and the slide would run against that scroll.
	 */
	scoped: 'absolute inset-0 overflow-clip',
}
