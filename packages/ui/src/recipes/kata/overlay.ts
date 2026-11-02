/**
 * Overlay kata: the unit of the Overlay primitive. The root slot `base` is the
 * box of the overlay, on the `overlay` rung of the stacking order. The
 * `scoped` axis picks the viewport or a container as its box. The `backdrop`
 * slot is the default scrim.
 */
import { defineKata } from '../../core/recipe'
import { omote, sou, ugoki } from '../kiso'

const { backdrop } = omote
const { overlay } = ugoki

export const k = defineKata(
	{
		base: sou.overlay,
		scoped: {
			/**
			 * The box of an overlay scoped to a container: the full container.
			 *
			 * It clips what it holds, and it is not a scroll container. A panel waits
			 * outside the box until it slides in. If its overflow reached the container,
			 * the move of the focus into the panel would scroll the container to the
			 * panel, and the slide would run against that scroll.
			 */
			true: 'absolute inset-0 overflow-clip',
			/**
			 * The box of an overlay fixed to the viewport: the full viewport. The browser
			 * keeps a fixed box clear of its own toolbars.
			 */
			false: 'fixed inset-0',
		},
		slots: { backdrop: ['absolute inset-0', backdrop.base] },
		defaults: { scoped: false },
	},
	{ motion: overlay },
)
