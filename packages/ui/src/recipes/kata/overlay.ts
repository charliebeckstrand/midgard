import { omote, ugoki } from '../kiso'

const { backdrop } = omote
const { overlay } = ugoki

export const k = {
	motion: overlay,
	backdrop,
	/**
	 * Root stacking levels. `base` is the ordinary overlay layer, under the
	 * `z-100` the popover portal and the toast viewport take. `elevated` clears
	 * chrome a consumer lifted over the root to keep it reachable, and so also
	 * clears both of those.
	 */
	root: {
		base: 'z-99',
		elevated: 'z-101',
	},
}
