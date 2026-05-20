/**
 * Design-token recipes.
 *
 *   kata/ — per-component recipes (1:1 with `src/components/<name>/`).
 *           Internal to the package; not re-exported from this barrel.
 *           Components consume kata via a relative path:
 *           `from '../../recipes/kata/<name>'`.
 *   waku/ — control primitives composed by panel-shaped kata (Dialog,
 *           Drawer, Sheet, etc.). Same internal status as kata.
 *
 * Substrate (iro / ji / ma / narabi / omote / sawari / sen / take / tsunagi /
 * ugoki / kokkaku) lives in `core/recipe/substrate/` alongside the engine
 * primitives. Re-exported here for callers that pull through the recipes
 * barrel.
 *
 * `package.json` `exports` deliberately omits `./recipes` and `./recipes/*`,
 * so kata and waku are unreachable from outside the package. The contract
 * is pinned by `src/__tests__/recipes/internal-boundary.test.ts`.
 */

export {
	iro,
	ji,
	kokkaku,
	ma,
	narabi,
	omote,
	sawari,
	sen,
	take,
	tsunagi,
	ugoki,
} from '../core/recipe'
