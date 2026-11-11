'use client'

import { type ComponentProps, useId } from 'react'
import { cn } from '../../core/cn'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { ReducedMotion } from '../../primitives/reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import {
	k,
	type ProgressBarFillVariants,
	type ProgressTrackVariants,
} from '../../recipes/kata/progress'
import type { AccessibleName } from '../../types/accessible-name'
import { clamp } from '../../utilities/clamp'
import { toPercent } from '../../utilities/to-percent'

/** The palette color of a fill or a segment. */
export type ProgressColor = NonNullable<ProgressBarFillVariants['color']>

/** One part of a {@link ProgressBar} with `segments`. */
export type ProgressSegment = {
	/** The size of the segment, in the units of `max`. */
	value: number
	/** The palette color of the segment. */
	color: ProgressColor
	/**
	 * The name of the segment, unique in its bar. The description of the bar
	 * reads it with its value.
	 */
	label: string
	/**
	 * The end of the track that the segment stacks in from. The segments from the
	 * end stack in their order from the inline end, so the first sits at the end.
	 *
	 * @defaultValue 'start'
	 */
	from?: 'start' | 'end'
}

/** A line across a {@link ProgressBar} at one value, such as a majority. */
export type ProgressMark = {
	/** The position of the line, in the units of `max`, unique in its bar. */
	value: number
	/**
	 * The text above the line, centered on it, such as "218 to win". The
	 * description of the bar reads it too. With no label, the bar takes no room
	 * for one.
	 */
	label?: string
}

const messages = defineMessages<{
	segment: { label: string; value: string }
	segments: { segments: string; max: string }
}>({
	segment: {
		id: 'ui.progress.segment',
		defaultMessage: '{label} {value}',
		description:
			'One part of a progress bar that has more than one part: the name of the part and its value, such as "Democrats 252".',
	},
	segments: {
		id: 'ui.progress.segments',
		defaultMessage: '{segments}, of {max}.',
		description:
			'The description of a progress bar that has more than one part: the list of the parts, then the value of a full bar, such as "Democrats 252, Republicans 161, of 435."',
	},
})

/**
 * Props for {@link ProgressBar}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), enforced at the type level by `AccessibleName`. The root
 * `<div>` takes the rest. The bar gives `color` a meaning of its own, and draws
 * its own fill in place of `children`.
 */
export type ProgressBarProps = AccessibleName &
	Omit<ComponentProps<'div'>, 'color' | 'children' | 'aria-label' | 'aria-labelledby'> & {
		/** Current progress; omit (or pass `NaN`) for an indeterminate bar. With `segments`, the bar does not use it. */
		value?: number
		/**
		 * The value of a full bar. The bar holds `value` between 0 and `max`.
		 *
		 * @defaultValue 100
		 */
		max?: number
		/** The density step of the track height. Omit it to take the step of the nearest density scope. */
		size?: ProgressTrackVariants['size']
		/**
		 * The palette color of the fill.
		 *
		 * @defaultValue 'zinc'
		 */
		color?: ProgressColor
		/**
		 * The parts of the bar, in place of `value`, such as the seats of each
		 * party. They keep their order, with 2 px of track between them.
		 */
		segments?: ProgressSegment[]
		/** Lines across the bar at given values, such as a majority. */
		marks?: ProgressMark[]
	}

/**
 * Linear progress indicator rendered as a `role="progressbar"`. Determinate
 * when `value` is a usable number, with the fill width at its clamped
 * percentage; otherwise indeterminate, with a fill that sweeps along the
 * track. The fill mounts at its value and
 * animates each change of value. The sweep is a CSS animation. The track takes
 * the step of the nearest density scope, and an explicit `size` opens a scope on it. It respects
 * reduced-motion.
 *
 * With `segments`, the bar draws each part in its color, from the inline start
 * or from the inline end. Each part animates as the single fill does. A bar of
 * one segment stays a `progressbar` at the value of that segment. A bar of two
 * or more is a `role="img"`, because a progressbar has one value: its
 * description names each part and its value, then `max`. `marks` draw lines
 * across the bar, such as a majority, with an optional label above the track.
 *
 * @remarks
 * Exposes `aria-valuenow`/`aria-valuemin`/`aria-valuemax` when determinate and
 * drops `aria-valuenow` when indeterminate. The accessible name is required by
 * {@link ProgressBarProps}. The labels of the marks join the description
 * through `aria-describedby`.
 */
export function ProgressBar({
	value,
	max = 100,
	size,
	color,
	segments,
	marks,
	className,
	...props
}: ProgressBarProps) {
	// The fill mounts at its value. A sweep up from zero on mount plays again
	// each time a tab panel brings the bar back. Motion reads the reduced-motion
	// preference only when the fill mounts, so the fill reads the live preference
	// itself. Under reduced motion the fill moves to each new value without a
	// spring.
	const still = usePrefersReducedMotion()

	if (segments || marks?.length) {
		return (
			<LayeredBar
				{...props}
				value={value}
				max={max}
				size={size}
				color={color}
				segments={segments}
				marks={marks}
				still={still}
				className={className}
			/>
		)
	}

	// NaN is "no usable value": treating it as determinate renders
	// aria-valuenow="NaN" and width "NaN%".
	const determinate = value != null && !Number.isNaN(value)

	const percent = determinate ? clamp(toPercent(value, 0, max), 0, 100) : 0

	return (
		<div
			data-slot="progress-bar"
			data-density={size}
			{...props}
			role="progressbar"
			aria-valuenow={determinate ? clamp(value, 0, max) : undefined}
			aria-valuemin={0}
			aria-valuemax={max}
			className={cn(k().base, className)}
		>
			{determinate ? (
				// The `m` fill animates with the features that a `ReducedMotion` root loads.
				<ReducedMotion>
					<m.div
						className={k({ color }).bar.fill}
						initial={false}
						animate={{ width: `${percent}%` }}
						transition={still ? k.still : k.spring}
					/>
				</ReducedMotion>
			) : (
				// A CSS animation runs the sweep, from the inline start to the inline end.
				<div className={cn(k({ color }).bar.fill, k().bar.indeterminate)} />
			)}
		</div>
	)
}

type LayeredBarProps = Omit<ProgressBarProps, 'max'> & { max: number; still: boolean }

/**
 * The bar with segments or marks. A plain `value` with marks is one segment in
 * the color of the bar. The root does not clip, so a mark stands past the
 * track. The row of fills clips the segments in its place.
 */
function LayeredBar({
	value,
	max,
	size,
	color,
	segments,
	marks = [],
	still,
	className,
	'aria-describedby': describedBy,
	...props
}: LayeredBarProps) {
	const descriptionId = useId()

	const determinate = value != null && !Number.isNaN(value)

	const parts: ProgressSegment[] =
		segments ?? (determinate ? [{ value, color: color ?? 'zinc', label: '' }] : [])

	// A progressbar has one value, so two or more segments make an image.
	const single = !segments || segments.length === 1

	const description = useDescription(single ? [] : parts, marks, max)

	const labelled = marks.some((mark) => mark.label)

	return (
		<div
			data-slot="progress-bar"
			data-density={size}
			{...props}
			{...(single
				? {
						role: 'progressbar',
						'aria-valuenow': parts[0] ? clamp(parts[0].value, 0, max) : undefined,
						'aria-valuemin': 0,
						'aria-valuemax': max,
					}
				: { role: 'img' })}
			aria-describedby={
				[describedBy, description ? descriptionId : null].filter(Boolean).join(' ') || undefined
			}
			className={cn(k().base, k().bar.layered, labelled && k().bar.labelled, className)}
		>
			<div className={k().bar.fills}>
				{parts.length || segments ? (
					<Segments parts={parts} max={max} still={still} />
				) : (
					<div className={cn(k({ color }).bar.fill, k().bar.indeterminate)} />
				)}
			</div>
			{marks.map((mark) => (
				<Mark key={mark.value} mark={mark} max={max} />
			))}
			{description ? (
				<span id={descriptionId} className="sr-only">
					{description}
				</span>
			) : null}
		</div>
	)
}

/**
 * The description of a layered bar: each segment with its value and `max`,
 * when there is more than one segment, then the label of each mark.
 */
function useDescription(parts: ProgressSegment[], marks: ProgressMark[], max: number) {
	const intl = useIntl()

	const sentences: string[] = []

	if (parts.length) {
		const list = parts.map((part) =>
			intl.formatMessage(messages.segment, {
				label: part.label,
				value: intl.formatNumber(part.value),
			}),
		)

		sentences.push(
			intl.formatMessage(messages.segments, {
				segments: intl.formatList(list, { type: 'unit' }),
				max: intl.formatNumber(max),
			}),
		)
	}

	for (const mark of marks) if (mark.label) sentences.push(mark.label)

	return sentences.join(' ')
}

/**
 * The segments of a layered bar: the segments from the start, the free track,
 * then the segments from the end. The first segment from the end sits at the
 * inline end, so the row draws them in reverse.
 */
function Segments({
	parts,
	max,
	still,
}: {
	parts: ProgressSegment[]
	max: number
	still: boolean
}) {
	const share = (part: ProgressSegment) => clamp(toPercent(part.value, 0, max), 0, 100)

	const start = parts.filter((part) => part.from !== 'end')

	const end = parts.filter((part) => part.from === 'end').reverse()

	// With no free track, the spacer would add one more gap between the two stacks.
	const full = parts.reduce((sum, part) => sum + share(part), 0) >= 100

	const segment = (part: ProgressSegment) => (
		<m.div
			// The label names the segment, so a segment that changes value keeps its node.
			key={`${part.from ?? 'start'}:${part.label}`}
			data-from={part.from ?? 'start'}
			className={cn(k({ color: part.color }).bar.fill, k().bar.segment)}
			initial={false}
			animate={{ flexBasis: `${share(part)}%` }}
			transition={still ? k.still : k.spring}
		/>
	)

	return (
		// The `m` segments animate with the features that a `ReducedMotion` root loads.
		<ReducedMotion>
			{start.map(segment)}
			{full ? null : <div aria-hidden="true" className={k().bar.spacer} />}
			{end.map(segment)}
		</ReducedMotion>
	)
}

/** One mark of a layered bar: the line, and the label above the track when the mark has one. */
function Mark({ mark, max }: { mark: ProgressMark; max: number }) {
	const at = `${clamp(toPercent(mark.value, 0, max), 0, 100)}%`

	return (
		<span aria-hidden="true">
			<span data-slot="progress-mark" className={k().bar.mark} style={{ insetInlineStart: at }} />
			{mark.label ? (
				<span className={k().bar.markLabel} style={{ insetInlineStart: at }}>
					{mark.label}
				</span>
			) : null}
		</span>
	)
}
