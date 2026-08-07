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

import { useId } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { CHROME_STROKE_WIDTH } from './engine/map-constants'
import type { MapChromePaths } from './engine/map-geometry/chrome'

/** Props for {@link MapChrome}: the paths the active fit resolved. @internal */
type MapChromeProps = {
	paths: MapChromePaths
}

/** Props for {@link ChromeLine}: one chrome path and the ink it takes. @internal */
type ChromeLineProps = {
	/** The line's `data-slot` name, naming which part of the chrome it is. */
	slot: string
	d: string
	className: string
}

/**
 * One chrome path: a hairline outline, never a fill — the graticule is a
 * multi-line path and the frame a closed one, and a fill on either would flood
 * the frame under the geography.
 *
 * @internal
 */
function ChromeLine({ slot, d, className }: ChromeLineProps) {
	return (
		<path
			data-slot={slot}
			d={d}
			fill="none"
			strokeWidth={CHROME_STROKE_WIDTH}
			// Device pixels, not viewBox units — the region border's discipline: a
			// resize whose refit lands a beat late scales the geometry crisply and
			// must not fatten a hairline with it.
			vectorEffect="non-scaling-stroke"
			className={className}
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
 * @internal
 */
export function MapChrome({ paths }: MapChromeProps) {
	const { graticule, frame, outline } = paths

	// React's useId carries colons — safe as an attribute, but not inside the
	// url() the clip reference reads — so strip them, as the chart's pattern defs
	// do for theirs.
	const clipId = `map-chrome-clip-${useId().replace(/:/g, '')}`

	if (graticule === null && !outline) return null

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
					<clipPath id={clipId}>
						{/* The even-odd rule is the whole of the composite fix: it reads the
						    inset boxes as holes in the outer frame rather than as part of it. */}
						<path d={frame} clipRule="evenodd" />
					</clipPath>
				</defs>
			)}

			{graticule !== null && (
				<g clipPath={bounded ? `url(#${clipId})` : undefined}>
					<ChromeLine slot="map-graticule" d={graticule} className={cn(k.chrome.graticule)} />
				</g>
			)}

			{outline && frame !== null && (
				<ChromeLine slot="map-sphere" d={frame} className={cn(k.chrome.sphere)} />
			)}
		</g>
	)
}
