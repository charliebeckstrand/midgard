import { sou } from '../kiso'

export const k = {
	/*
	 * `relative` gives the rung something to apply to — `z-index` binds only to a
	 * positioned box. Chrome usually positions itself (`sticky`, `fixed`), and a
	 * consumer class wins through `cn`'s tailwind-merge, so this is the floor
	 * rather than an imposition.
	 */
	region: ['relative', sou.chrome],
}
