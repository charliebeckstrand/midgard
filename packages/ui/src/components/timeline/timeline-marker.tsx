import { cn } from '../../core'
import type { Color } from '../../recipes/nuri/palette'
import { StatusDot, type StatusDotProps } from '../status'
import { useTimeline } from './context'
import { k } from './variants'

// ── TimelineMarker ──────────────────────────────────────

export type TimelineMarkerConfig = {
	pulse?: StatusDotProps['pulse']
} & ({ status?: StatusDotProps['status']; color?: never } | { color?: Color; status?: never })

export type TimelineMarkerProps = TimelineMarkerConfig & {
	active?: boolean
	className?: string
}

export function TimelineMarker({
	status,
	color,
	pulse,
	active: _active,
	className,
}: TimelineMarkerProps) {
	const { orientation, variant } = useTimeline()

	return (
		<StatusDot
			data-slot="timeline-marker"
			variant={variant}
			status={status}
			pulse={pulse}
			className={cn(
				k.marker.base,
				orientation === 'vertical' ? k.marker.vertical[variant] : k.marker.horizontal[variant],
				color && k.marker.color[color],
				className,
			)}
		/>
	)
}
