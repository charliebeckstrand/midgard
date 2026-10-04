/**
 * Kasane 重ね: layered chrome plus its companion spacing helpers. The ring
 * utilities of `core/density/utilities.ts` (`px-ring-2`, …) subtract the 1 px
 * outer ring from a spacing stop. A class uses them directly.
 *
 * Two named axes:
 *   - `layers`: the signature inset-fill-plus-rings stack, as one list (base
 *     ring, inset fill, overlay, hover, focus, validation, and disabled).
 *   - `rounded`: pass-through to Tailwind's named radius scale
 *     (none / sm / md / lg / xl / full); `rounded.lg` → `rounded-lg`.
 *
 * A radius that follows density is a stepped `density-rounded-*` class, and
 * its inset fill is a `rounded-ring` class under a `density-*` variant, as
 * `kata/control.ts` writes them.
 */

import { layers } from './layers'
import { rounded } from './rounded'

export const kasane = {
	layers,
	rounded,
} as const
