/**
 * Kasane (重ね): the layered chrome and the radius scale. The ring
 * utilities of `core/density/utilities.ts` (`px-ring-2`, …) subtract the 1 px
 * outer ring from a spacing stop. A class uses them directly.
 *
 * `layers` is the stack of a framed control, as one list: the base ring, the
 * inset fill, the overlay, and the hover, focus, validation, and disabled
 * states. `rounded` holds the classes of the named radius scale of Tailwind,
 * from `none` to `full`, so `rounded.lg` is `rounded-lg`.
 *
 * A radius that follows density is a stepped `density-rounded-*` class, and
 * its inset fill is a stepped `density-rounded-ring-*` class after `before:`,
 * as `dan.radius` writes them.
 */

import { layers } from './layers'
import { rounded } from './rounded'

export const kasane = {
	layers,
	rounded,
} as const
