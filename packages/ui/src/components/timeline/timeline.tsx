'use client'

import { type ComponentProps, type ReactNode, useMemo } from 'react'
import { cn } from '../../core'
import { useComposedRef, useScrollOverflow, useScrollRegion } from '../../hooks'
import { k } from '../../recipes/kata/timeline'
import type { TimelineOrientation, TimelineVariant } from './context'
import { TimelineContext } from './context'

/** Props for {@link Timeline}. */
export type TimelineProps = Omit<ComponentProps<'ol'>, 'className' | 'children'> & {
	/**
	 * Layout axis shared with descendant items via context.
	 * @defaultValue 'vertical'
	 */
	orientation?: TimelineOrientation
	/**
	 * Marker/line treatment shared with descendant items; `<TimelineItem>` can override per row.
	 * @defaultValue 'solid'
	 */
	variant?: TimelineVariant
	className?: string
	children?: ReactNode
}

/**
 * Ordered sequence of events rendered as an `<ol>` of `<TimelineItem>` rows.
 * Lays out along `orientation`, vertical or horizontal. It propagates both
 * `orientation` and `variant` to its items via context, so markers and connector
 * lines stay consistent across the run.
 *
 * The item spacing and the text take the step of the nearest density scope.
 * At `md` an item has `pb-8` below it, with a `text-lg` title.
 *
 * @remarks
 * A horizontal timeline scrolls its row inside the root. While the row
 * overflows, the edge with more items behind it fades
 * ({@link useScrollOverflow}). The root is then also a tab stop
 * ({@link useScrollRegion}), so a keyboard user can scroll it. The root keeps
 * its `list` role and the name that you give it with `aria-label` or
 * `aria-labelledby`.
 */
export function Timeline({
	ref,
	orientation = 'vertical',
	variant = 'solid',
	className,
	children,
	...props
}: TimelineProps) {
	const value = useMemo(() => ({ orientation, variant }), [orientation, variant])

	const horizontal = orientation === 'horizontal'

	const scrollOverflowRef = useScrollOverflow({ axis: 'horizontal', enabled: horizontal })

	// No name goes to the hook. A `region` role replaces the `list` role of the
	// `<ol>`, and the cleanup of the hook removes the name it set, which can be
	// the name that the consumer gave.
	const scrollRegionRef = useScrollRegion()

	const setRoot = useComposedRef<HTMLOListElement>(
		ref,
		scrollOverflowRef,
		horizontal ? scrollRegionRef : undefined,
	)

	return (
		<TimelineContext value={value}>
			<ol
				{...props}
				ref={setRoot}
				data-slot="timeline"
				className={cn(k.base({ orientation }), className)}
			>
				{children}
			</ol>
		</TimelineContext>
	)
}
