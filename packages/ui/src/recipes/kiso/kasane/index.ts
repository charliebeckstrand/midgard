/**
 * Kasane 重ね — layered chrome plus its companion spacing helpers.
 *
 * Five named axes:
 *   - `layers` — the signature inset-fill-plus-rings stack (base /
 *     inset / overlay / hover / focus / validation / disabled / all).
 *   - `padding` — ring-compensated padding helpers
 *     (p / px / py / pl / pr). Each `kasane.padding.x('2')` returns the
 *     padding class with 1 px subtracted to land inside the outer ring.
 *   - `radius` — ring-compensated corner radii (r / ri / ro / all).
 *   - `rounded` — pass-through to Tailwind's named radius scale
 *     (sm / md / lg / full); kept at the top so the kata read like the
 *     Tailwind class itself (`rounded.lg` → `rounded-lg`).
 *   - `gap` — pass-through gap helpers (g / gx / gy) that live here for
 *     symmetry; gap doesn't intersect the outer ring so no compensation.
 */

import { gap } from './gap'
import { layers } from './layers'
import { padding } from './padding'
import { radius } from './radius'
import { rounded } from './rounded'

export const kasane = {
	layers,
	padding,
	radius,
	rounded,
	gap,
} as const
