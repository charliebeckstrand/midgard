import type { ReactNode } from 'react'
import { cn } from '../../core'
import { type TimelineVariants, timelineVariants } from '../../recipes/kata/timeline'
import type { TimelineOrientation, TimelineVariant } from './context'
import { TimelineProvider } from './context'

// ── Timeline ────────────────────────────────────────────

export type TimelineProps = TimelineVariants & {
	orientation?: TimelineOrientation
	variant?: TimelineVariant
	className?: string
	children?: ReactNode
}

export function Timeline({
	orientation = 'vertical',
	variant = 'solid',
	className,
	children,
}: TimelineProps) {
	const resolvedOrientation = orientation ?? 'vertical'
	const resolvedVariant = variant ?? 'solid'

	return (
		<TimelineProvider value={{ orientation: resolvedOrientation, variant: resolvedVariant }}>
			<ol
				data-slot="timeline"
				className={cn(timelineVariants({ orientation, variant }), className)}
			>
				{children}
			</ol>
		</TimelineProvider>
	)
}
