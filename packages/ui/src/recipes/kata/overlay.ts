import { omote, sou, ugoki } from '../kiso'

const { backdrop } = omote
const { overlay } = ugoki

export const k = {
	motion: overlay,
	backdrop,
	/**
	 * Root stacking levels, from the `sou` ladder. `base` seals the page for a
	 * transaction; `elevated` clears the chrome a consumer lifted over it to stay
	 * `reachable`. Floats and toasts sit above both.
	 */
	root: {
		base: sou.overlay,
		elevated: sou.elevated,
	},
}
