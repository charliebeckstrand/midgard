import { cn } from '../../core'
import { katachi } from '../../recipes'
import { StatusDot, type StatusDotProps } from '../status'
import {
	type TimelineOrientation,
	TimelineProvider,
	type TimelineVariant,
	useTimeline,
} from './context'
import { type TimelineVariants, timelineVariants } from './variants'

const k = katachi.timeline

// ── Timeline ────────────────────────────────────────────

export type TimelineProps = TimelineVariants & {
	className?: string
	children?: React.ReactNode
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

// ── TimelineItem ────────────────────────────────────────

export type TimelineItemProps = {
	active?: boolean
	className?: string
	children?: React.ReactNode
}

export function TimelineItem({ active, className, children }: TimelineItemProps) {
	const { orientation, variant } = useTimeline()

	return (
		<li
			data-slot="timeline-item"
			data-active={active || undefined}
			className={cn(
				k.item.base,
				orientation === 'vertical' ? k.item.vertical : k.item.horizontal,
				className,
			)}
		>
			<TimelineConnector orientation={orientation} variant={variant} />
			{children}
		</li>
	)
}

// ── TimelineConnector (internal) ────────────────────────

function TimelineConnector({
	orientation,
	variant,
}: {
	orientation: TimelineOrientation
	variant: TimelineVariant
}) {
	const styles = k.connector[orientation][variant]

	return (
		<div
			data-slot="timeline-connector"
			className={cn(k.connector.base, styles)}
			aria-hidden="true"
		/>
	)
}

// ── TimelineMarker ──────────────────────────────────────

export type TimelineMarkerProps = {
	status?: StatusDotProps['status']
	className?: string
}

export function TimelineMarker({ status, className }: TimelineMarkerProps) {
	const { orientation, variant } = useTimeline()

	return (
		<StatusDot
			data-slot="timeline-marker"
			variant={variant}
			status={status}
			className={cn(
				k.marker.base,
				orientation === 'vertical' ? k.marker.vertical : k.marker.horizontal,
				className,
			)}
		/>
	)
}

// ── TimelineHeading ─────────────────────────────────────

export type TimelineHeadingProps = {
	className?: string
	children?: React.ReactNode
}

export function TimelineHeading({ className, children }: TimelineHeadingProps) {
	return (
		<div data-slot="timeline-heading" className={cn(k.heading, className)}>
			{children}
		</div>
	)
}

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

// ── TimelineTimestamp ────────────────────────────────────

export type TimelineTimestampProps = {
	className?: string
	children?: React.ReactNode
	dateTime?: string
}

export function TimelineTimestamp({ className, children, dateTime }: TimelineTimestampProps) {
	return (
		<time data-slot="timeline-timestamp" dateTime={dateTime} className={cn(k.timestamp, className)}>
			{children}
		</time>
	)
}
