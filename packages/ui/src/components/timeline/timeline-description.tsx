import { cn } from '../../core'
import { k } from './variants'

// ── TimelineDescription ─────────────────────────────────

export type TimelineDescriptionProps = {
	className?: string
	children?: React.ReactNode
}

export function TimelineDescription({ className, children }: TimelineDescriptionProps) {
	return (
		<p data-slot="timeline-description" className={cn(k.description, className)}>
			{children}
		</p>
	)
}
