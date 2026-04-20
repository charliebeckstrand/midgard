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
		<span
			data-slot="timeline-marker"
			className={cn(
				k.marker.base,
				orientation === 'vertical' ? k.marker.vertical : k.marker.horizontal,
				color && k.marker.color[color],
				className,
			)}
		>
			<StatusDot
				variant={variant}
				status={status}
				pulse={pulse}
				className="z-10 relative size-full"
			/>
		</span>
	)
}
