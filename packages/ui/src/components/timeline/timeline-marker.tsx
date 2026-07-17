'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { Color } from '../../recipes'
import { pulse as pulseAnimation } from '../../recipes/kata/status'
import { k } from '../../recipes/kata/timeline'
import { StatusDot, type StatusDotProps } from '../status'
import { Swatch } from '../swatch'
import { useTimeline } from './context'

/**
 * Marker styling shared between {@link TimelineMarker} and the implicit marker
 * spread by {@link TimelineItem}. `status` and `color` are mutually exclusive:
 * `status` drives a semantic `<StatusDot>` (and names it), `color` paints a
 * decorative dot.
 */
export type TimelineMarkerConfig = {
	/** Animates the status dot. */
	pulse?: StatusDotProps['pulse']
	/** Connector-line color leading into the marker. @defaultValue 'zinc' */
	lineBefore?: Color
	/** Connector-line color leading out of the marker. @defaultValue 'zinc' */
	lineAfter?: Color
} & ({ status?: StatusDotProps['status']; color?: never } | { color?: Color; status?: never })

/** Props for {@link TimelineMarker}. */
export type TimelineMarkerProps = TimelineMarkerConfig & {
	className?: string
	/** Custom marker content; replaces the default `<StatusDot>` and relaxes the fixed dot size. */
	children?: ReactNode
}

/**
 * Dot and connector lines for a timeline row. With no `children`, renders a
 * semantic, labelled `<StatusDot>` when `status` is set, or a decorative
 * `<Swatch>` dot in the requested hue when `color` is set — both styled to the
 * orientation and variant from context. Custom `children` replace the dot
 * entirely. ARIA stays on the parent `<li>`; the marker itself is decorative.
 */
export function TimelineMarker({
	status,
	color,
	pulse,
	lineBefore,
	lineAfter,
	className,
	children,
}: TimelineMarkerProps) {
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
				children != null && 'size-auto',
				className,
			)}
		>
			{children != null ? (
				children
			) : color != null ? (
				// A colour-only marker is decorative: paint the dot straight from the
				// marker hue via <Swatch>. <StatusDot> forces its own status colour and
				// omits `color`, so the requested hue can reach the dot only this way.
				<Swatch
					shape="circle"
					variant={variant}
					color={cn(k.marker.palette[color].dot)}
					className={cn('z-10 relative size-full', pulse && pulseAnimation)}
				/>
			) : (
				<StatusDot
					variant={variant}
					status={status}
					pulse={pulse}
					// Names the dot when it carries a semantic status; a colour-only marker stays decorative.
					label={status ? status.charAt(0).toUpperCase() + status.slice(1) : undefined}
					className="z-10 relative size-full"
				/>
			)}
		</span>
	)
}
