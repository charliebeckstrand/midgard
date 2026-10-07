'use client'

import { cn } from '../../core'
import type { Color } from '../../recipes'
import { k } from '../../recipes/kata/timeline'
import { capitalizeFirst } from '../../utilities'
import { StatusDot, type StatusDotProps } from '../status'
import { Swatch } from '../swatch'
import { useTimeline } from './context'

/**
 * The marker keys of {@link TimelineItem}. `status` and `color` are mutually exclusive:
 * `status` drives a semantic `<StatusDot>` (and names it), `color` paints a
 * decorative dot.
 */
export type TimelineMarkerConfig = {
	/**
	 * Animates the status dot.
	 * @defaultValue false
	 */
	pulse?: StatusDotProps['pulse']
	/** Connector-line color leading into the marker. @defaultValue 'zinc' */
	lineBefore?: Color
	/** Connector-line color leading out of the marker. @defaultValue 'zinc' */
	lineAfter?: Color
} & (
	| {
			/** The status of the dot. The dot is a named StatusDot in the color of the status. */
			status?: StatusDotProps['status']
			color?: never
	  }
	| {
			/** The color of a decorative dot with no name. Set it in place of `status`. */
			color?: Color
			status?: never
	  }
)

/**
 * Dot and connector lines for a timeline row. It renders a semantic, labeled
 * `<StatusDot>` when `status` is set, and a decorative `<Swatch>` dot in the
 * requested hue when `color` is set. Both are styled to the orientation and
 * variant from context. ARIA stays on the parent `<li>`; the marker itself is
 * decorative.
 *
 * @internal
 */
export function TimelineMarker({
	status,
	color,
	pulse,
	lineBefore,
	lineAfter,
}: TimelineMarkerConfig) {
	const { orientation, variant } = useTimeline()

	return (
		<span
			data-slot="timeline-marker"
			// ARIA stays on the TimelineItem <li>, which announces aria-current; the
			// decorative marker carries none.
			className={cn(
				k.marker.base,
				orientation === 'vertical' ? k.marker.vertical : k.marker.horizontal,
				k.marker.palette[lineBefore ?? 'zinc'].line.before,
				k.marker.palette[lineAfter ?? 'zinc'].line.after,
			)}
		>
			{color != null ? (
				// A color-only marker is decorative: paint the dot straight from the
				// marker hue via <Swatch>. <StatusDot> forces its own status color and
				// omits `color`, so the requested hue can reach the dot only this way.
				<Swatch
					shape="circle"
					variant={variant}
					color={cn(k.marker.palette[color].dot)}
					className={cn(k.marker.dot, pulse && k.marker.pulse)}
				/>
			) : (
				<StatusDot
					variant={variant}
					status={status}
					pulse={pulse}
					// Names the dot when it carries a semantic status; a color-only marker stays decorative.
					label={status ? capitalizeFirst(status) : undefined}
					className={k.marker.dot}
				/>
			)}
		</span>
	)
}
