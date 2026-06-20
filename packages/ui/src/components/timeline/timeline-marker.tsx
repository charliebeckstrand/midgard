'use client'

import type { ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import type { Color } from '../../recipes'
import { k } from '../../recipes/kata/timeline'
import { StatusDot, type StatusDotProps } from '../status'
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
	/** Styling hook only; the row's `<li>` carries the `aria-current` announcement. */
	current?: boolean
	className?: string
	/** Custom marker content; replaces the default `<StatusDot>` and relaxes the fixed dot size. */
	children?: ReactNode
}

/**
 * Dot and connector lines for a timeline row. With no `children`, renders a
 * `<StatusDot>` driven by `status` (semantic, labelled) or `color`
 * (decorative), styled to the orientation and variant from context. Custom
 * `children` replace the dot entirely. ARIA stays on the parent `<li>`; the
 * marker itself is decorative.
 */
export function TimelineMarker({
	status,
	color,
	pulse,
	lineBefore,
	lineAfter,
	current,
	className,
	children,
}: TimelineMarkerProps) {
	const { orientation, variant } = useTimeline()

	return (
		<span
			data-slot="timeline-marker"
			// `current` is a styling hook only. ARIA stays on the TimelineItem <li>,
			// which announces aria-current; the marker carries none.
			data-current={dataAttr(current)}
			className={cn(
				k.marker.base,
				orientation === 'vertical' ? k.marker.vertical : k.marker.horizontal,
				color && k.marker.palette[color].dot,
				k.marker.palette[lineBefore ?? 'zinc'].lineBefore,
				k.marker.palette[lineAfter ?? 'zinc'].lineAfter,
				children != null && 'size-auto',
				className,
			)}
		>
			{children != null ? (
				children
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
