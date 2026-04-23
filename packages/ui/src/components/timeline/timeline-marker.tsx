import type { ReactNode } from 'react'
import { cn } from '../../core'
import type { Color } from '../../recipes/iro'
import { StatusDot, type StatusDotProps } from '../status'
import { useTimeline } from './context'
import { k } from './variants'

// ── TimelineMarker ──────────────────────────────────────

export type TimelineMarkerConfig = {
	pulse?: StatusDotProps['pulse']
	lineBefore?: Color
	lineAfter?: Color
} & ({ status?: StatusDotProps['status']; color?: never } | { color?: Color; status?: never })

export type TimelineMarkerProps = TimelineMarkerConfig & {
	active?: boolean
	className?: string
	children?: ReactNode
}

export function TimelineMarker({
	status,
	color,
	pulse,
	lineBefore,
	lineAfter,
	active: _active,
	className,
	children,
}: TimelineMarkerProps) {
	const { orientation, variant } = useTimeline()

	return (
		<span
			data-slot="timeline-marker"
			className={cn(
				k.marker.base,
				orientation === 'vertical' ? k.marker.vertical : k.marker.horizontal,
				color && k.marker.color[color],
				lineBefore && k.marker.lineBefore[lineBefore],
				lineAfter && k.marker.lineAfter[lineAfter],
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
					className="z-10 relative size-full"
				/>
			)}
		</span>
	)
}
