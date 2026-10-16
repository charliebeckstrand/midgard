'use client'

import { type ComponentProps, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { TimelineContext, type TimelineVariant, useTimeline } from './context'
import { TimelineMarker, type TimelineMarkerConfig } from './timeline-marker'

/**
 * Props for {@link TimelineItem}. The marker keys ({@link TimelineMarkerConfig})
 * set the dot and the connector lines of the row. The `<li>` takes the rest. The
 * row gives `color` to its marker.
 */
export type TimelineItemProps = Omit<ComponentProps<'li'>, 'color'> & {
	/**
	 * Marks this row as the active step; sets `aria-current` and a `data-current` styling hook.
	 * @defaultValue false
	 */
	current?: boolean
	/**
	 * Overrides the marker treatment inherited from `<Timeline>` for this row only.
	 *
	 * @defaultValue `'solid'`, or the `variant` of the enclosing `<Timeline>`.
	 */
	variant?: TimelineVariant
} & TimelineMarkerConfig

/**
 * A single `<li>` row within a `<Timeline>`. Renders its marker from
 * the marker keys. It carries `aria-current` when `current`, and
 * re-shares the resolved orientation and variant to descendants via context.
 */
export function TimelineItem(props: TimelineItemProps) {
	const {
		current,
		variant: variantProp,
		pulse,
		lineBefore,
		lineAfter,
		status,
		color,
		className,
		children,
		...rest
	} = props

	// `status` and `color` exclude each other, so the config holds one of them.
	const markerConfig: TimelineMarkerConfig =
		status !== undefined
			? { pulse, lineBefore, lineAfter, status }
			: { pulse, lineBefore, lineAfter, color }

	const { orientation, variant: contextVariant } = useTimeline()

	const variant = variantProp ?? contextVariant

	const providerValue = useMemo(() => ({ orientation, variant }), [orientation, variant])

	return (
		<li
			data-slot="timeline-item"
			{...rest}
			data-current={dataAttr(current)}
			aria-current={current ? 'step' : undefined}
			className={cn(k.item({ orientation }), className)}
		>
			<TimelineContext value={providerValue}>
				<TimelineMarker {...markerConfig} />
				{children}
			</TimelineContext>
		</li>
	)
}
