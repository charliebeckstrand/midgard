/**
 * Kasane 重ね: layered chrome plus its companion spacing helpers.
 *
 * Five named axes:
 *   - `layers`: the signature inset-fill-plus-rings stack (base /
 *     inset / overlay / hover / focus / validation / disabled / all).
 *   - `padding`: ring-compensated padding helpers
 *     (p / px / py / pl / pr). Each `padding.px('2')` returns the
 *     padding class with 1 px subtracted, landing inside the outer ring.
 *   - `radius`: ring-compensated corner radii (r / ri / ro / all).
 *   - `rounded`: pass-through to Tailwind's named radius scale
 *     (none / sm / md / lg / xl / full); `rounded.lg` → `rounded-lg`.
 *   - `gap`: pass-through gap helpers (g / gx / gy); gap doesn't
 *     intersect the outer ring and gets no compensation.
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
