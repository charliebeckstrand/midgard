'use client'

/**
 * The map's frame chrome — the graticule's meridians and parallels, and the
 * sphere outline — drawn beneath every region on the chart's own gridline inks,
 * so a dashboard's charts and maps rule their frames alike. Recessive by
 * construction: it draws first, so region fills cover the lines that cross land
 * and only the frame around the geography carries them.
 *
 * The graticule draws only where the projection does. It is clipped to the
 * projection's own frame under the even-odd rule, which is what keeps a
 * composite legible: `albers-usa` streams the lines through all three of its
 * sub-projections, so without the clip each inset fills with fragments at its
 * own angle and the map reads as three graticules laid over one another. Under
 * the rule the inset boxes are holes in the outer frame, so the main map rules
 * and every inset stays clear. A whole-globe projection has one frame and no
 * holes, so the same clip changes nothing there.
 *
 * Chrome answers no pointer and joins no readout. It names no place and carries
 * no value, so it is decoration in the strict sense: the tooltip, the keyboard
 * cursor, and the data table never see it, and it never takes a hit the region
 * under it should have had.
 */

import { memo, useId } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { useMapZoomScale } from './context'
import { CHROME_STROKE_WIDTH } from './engine/map-constants'
import type { MapChromePaths } from './engine/map-geometry/chrome'

/** Props for {@link MapChrome}: the paths the active fit resolved, and whether the frame is drawn. @internal */
type MapChromeProps = {
	paths: MapChromePaths
	/** Stroke the frame as the sphere outline; unset it still bounds the graticule. */
	sphere: boolean
}

/** Props for {@link ChromeLine}: which part of the chrome to draw, and its path. @internal */
type ChromeLineProps = {
	/** The part names both the `data-slot` and the ink, so the two can never be paired wrong. */
	part: 'graticule' | 'sphere'
	d: string
	/** The clip bounding the line, for the part that takes one. */
	clip?: string
}

/**
 * One chrome path: a hairline outline, never a fill — the graticule is a
 * multi-line path and the frame a closed one, and a fill on either would flood
 * the frame under the geography.
 *
 * @internal
 */
function ChromeLine({ part, d, clip }: ChromeLineProps) {
	const unitsPerPixel = useMapZoomScale()

	return (
		<path
			data-slot={`map-${part}`}
			d={d}
			clipPath={clip}
			fill="none"
			// Device pixels, not viewBox units — the region border's discipline: a
			// zoom must widen the ground a meridian crosses and never the hairline
			// ruling it. The scale is read here rather than inherited from the zoom
			// layer, as the region seams below are: chrome is two paths, so paying a
			// re-render per notch to keep the width stated where it is drawn costs
			// nothing, where the atlas would pay it per region.
			strokeWidth={CHROME_STROKE_WIDTH * unitsPerPixel}
			className={cn(...k.chrome[part])}
		/>
	)
}

/**
 * The chrome layer, or nothing where both parts are off — the default, so a map
 * without chrome mounts no group and no path.
 *
 * The graticule draws under the sphere outline, so the globe's edge reads as
 * the frame's own line over the hairlines that meet it.
 *
 * Memoised like the region layer beside it: the plat re-renders on every legend
 * focus, toggle, overlay registration, and resize commit, in none of which the
 * two paths move. Both props hold their identity across those — the paths come
 * from the cross-instance memo, and the shared empty value stands in while the
 * chrome is off — so the memo bails rather than rebuilding the subtree.
 *
 * @internal
 */
export const MapChrome = memo(function MapChrome({ paths, sphere }: MapChromeProps) {
	const { graticule, frame } = paths

	const clipId = `map-chrome-clip-${useId()}`

	if (graticule === null && !sphere) return null

	// A projection that draws no frame (a passed instance with nothing to
	// outline) bounds nothing: the graticule then draws whole rather than
	// vanishing behind an empty clip.
	const bounded = graticule !== null && frame !== null

	return (
		// Off the pointer as one group: chrome crosses every region, and a hairline
		// that took a hit would shadow the region under it.
		<g data-slot="map-chrome" className="pointer-events-none">
			{bounded && (
				<defs>
					<clipPath id={clipId} data-slot="map-chrome-clip">
						{/* The even-odd rule is the whole of the composite fix: it reads the
						    inset boxes as holes in the outer frame rather than as part of it. */}
						<path d={frame} clipRule="evenodd" />
					</clipPath>
				</defs>
			)}

			{graticule !== null && (
				<ChromeLine part="graticule" d={graticule} clip={bounded ? `url(#${clipId})` : undefined} />
			)}

			{sphere && frame !== null && <ChromeLine part="sphere" d={frame} />}
		</g>
	)
})
