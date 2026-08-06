import { defineRecipe } from '../../core/recipe'
import { omote, sou, ugoki } from '../kiso'

const { backdrop } = omote
const { overlay } = ugoki

// `elevated` clears the chrome a consumer lifted over the root to stay `reachable`;
// the default rung seals the page for a transaction. Floats and toasts sit above
// both — see the `sou` ladder.
const root = defineRecipe({
	base: ['inset-0'],
	elevated: {
		true: sou.elevated,
		false: sou.overlay,
	},
	defaults: { elevated: false },
})

export const k = {
	motion: overlay,
	backdrop,
	root,
	/** The rung a `reachable` declaration obliges the consumer to lift its chrome onto. */
	chrome: sou.chrome,
}
