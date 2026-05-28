/**
 * Kasane 重ね — layered chrome plus its companion spacing helpers.
 *
 * Five named axes:
 *   - `layers` — the signature inset-fill-plus-rings stack (base /
 *     inset / overlay / hover / focus / validation / disabled / all).
 *   - `padding` — ring-compensated padding helpers
 *     (p / px / py / pl / pr). Each `kasane.padding.x('2')` returns the
 *     padding class with 1 px subtracted to land inside the outer ring.
 *   - `radius` — ring-compensated corner radii (r / ri / ro / stack).
 *   - `rounded` — pass-through to Tailwind's named radius scale
 *     (sm / md / lg / full); kept at the top so the kata read like the
 *     Tailwind class itself (`rounded.lg` → `rounded-lg`).
 *   - `gap` — pass-through gap helpers (g / gx / gy) that live here for
 *     symmetry; gap doesn't intersect the outer ring so no compensation.
 */

import { g, gx, gy } from './gap'
import { all, base, disabled, focus, hover, inset, overlay, validation } from './layers'
import { p, pl, pr, px, py } from './padding'
import { r, ri, ro, rounded, stack } from './radius'

export const kasane = {
	layers: {
		base,
		inset,
		overlay,
		hover,
		focus,
		validation,
		disabled,
		all,
	},
	padding: { p, px, py, pl, pr },
	radius: { r, ri, ro, stack },
	rounded,
	gap: { g, gx, gy },
} as const
