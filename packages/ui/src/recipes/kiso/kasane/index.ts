/**
 * Kasane 重ね: layered chrome plus its companion spacing helpers. The ring
 * utilities of `ring-utilities.ts` (`px-ring-2`, …) subtract the 1 px outer
 * ring from a spacing stop. A class uses them directly.
 *
 * Four named axes:
 *   - `layers`: the signature inset-fill-plus-rings stack (base /
 *     inset / overlay / hover / focus / validation / disabled / all).
 *   - `radius`: ring-compensated corner radii (r / ri / ro / all).
 *   - `rounded`: pass-through to Tailwind's named radius scale
 *     (none / sm / md / lg / xl / full); `rounded.lg` → `rounded-lg`.
 *   - `gap`: pass-through gap helpers (g / gx / gy); gap doesn't
 *     intersect the outer ring and gets no compensation.
 */

import { gap } from './gap'
import { layers } from './layers'
import { radius } from './radius'
import { rounded } from './rounded'

export const kasane = {
	layers,
	radius,
	rounded,
	gap,
} as const
