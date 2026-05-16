'use client'

import { createContext } from '../core'

/**
 * Reserved primitive — slated for the nested-radius cascade.
 *
 * Original purpose (from `sun.ts`): "outer-radius = inner-radius + padding"
 * for surfaces that nest visually (`<Card>` inside `<Card>`, `<Drawer>`
 * containing `<Popover>`). An outer surface declares its own radius and
 * padding via context; an inner surface reads `(outer_radius, outer_padding)`
 * and computes its own inner-fitting radius as `outer_radius - outer_padding`
 * so the corners stay visually nested.
 *
 * The size cascade that previously lived on this primitive has moved to
 * `Density` (Step axis) and `Affix` (Ma axis). The provider + hook stay
 * exported as the eventual home for `{ radius, padding }`; the type is
 * minimal until that lands.
 */
export type ConcentricContextValue = Record<string, never>

export const [ConcentricProvider, useConcentric] = createContext<ConcentricContextValue | null>(
	'Concentric',
	{ default: null },
)
