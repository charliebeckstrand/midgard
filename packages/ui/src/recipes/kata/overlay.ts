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
	/** The box of an overlay scoped to a container: the full container. */
	scoped: 'absolute inset-0',
}
