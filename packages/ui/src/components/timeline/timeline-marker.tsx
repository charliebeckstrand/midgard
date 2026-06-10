'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { Color } from '../../recipes'
import { k } from '../../recipes/kata/timeline'
import { StatusDot, type StatusDotProps } from '../status'
import { useTimeline } from './context'

export type TimelineMarkerConfig = {
	pulse?: StatusDotProps['pulse']
	lineBefore?: Color
	lineAfter?: Color
} & ({ status?: StatusDotProps['status']; color?: never } | { color?: Color; status?: never })

export type TimelineMarkerProps = TimelineMarkerConfig & {
	current?: boolean
	className?: string
	children?: ReactNode
}

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
			data-current={current || undefined}
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
