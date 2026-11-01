'use client'

import { type ReactNode, useId } from 'react'
import type { ChartColorSlot } from '../../../recipes/kata/chart'
import { ChartPatternDefs } from './chart-pattern-defs'

/** Everything a chart needs to paint its marks with textures. @internal */
export type ChartTexture = {
	/** The `<defs>` to mount inside the SVG: the tiles for the slots in use. */
	defs: ReactNode
	/** The tile fill URL for a slot, or `undefined` for a raw color, which takes no tile. */
	fillFor: (slot: ChartColorSlot | null) => string | undefined
	/** The `texture` prop: tiles paint in every mode, not only forced-colors / print. */
	active: boolean
}

/**
 * Assembles a chart's texture tiles and a slot-keyed fill resolver. The
 * `<defs>` and URLs are always built. A mark applies them in every mode when
 * `active`, or only where color is gone (forced colors, print). A chart thus
 * survives High Contrast Mode without opting in. Tiles de-dupe to the distinct
 * slots, so a two-series chart defines two, not eight. Pass every visible
 * series's slot so a combo's bars and areas both resolve. A raw-colored series
 * carries a `null` slot: it opts out of the categorical palette and takes no
 * tile. `fillFor` hands it back `undefined` so the mark fills flat.
 *
 * @internal
 */
export function useChartTexture(active: boolean, slots: (ChartColorSlot | null)[]): ChartTexture {
	const base = useId()

	const idFor = (slot: ChartColorSlot) => `chart-tx-${base}-${slot}`

	const distinct = new Set(slots.filter((slot) => slot !== null))

	const entries = [...distinct].map((slot) => ({ color: slot, id: idFor(slot) }))

	return {
		defs: <ChartPatternDefs entries={entries} />,
		fillFor: (slot) => (slot === null ? undefined : `url(#${idFor(slot)})`),
		active,
	}
}
