import { defineKata } from '../../core/recipe'
import { sou } from '../kiso'

/** Chrome kata: the unit of the `<Chrome>` region. The `base` slot is the region. */
export const k = defineKata({
	/*
	 * `relative` gives the rung something to apply to: `z-index` binds only to a
	 * positioned box. Chrome usually positions itself (`sticky`, `fixed`), and a
	 * consumer class wins through `cn`'s tailwind-merge, so this is the floor
	 * rather than an imposition.
	 */
	base: ['relative', sou.chrome],
})
