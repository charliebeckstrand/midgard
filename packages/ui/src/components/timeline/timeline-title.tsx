'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import type { HeadingLevel } from '../heading'
import { useTimeline } from './context'

/**
 * Props for {@link TimelineTitle}. The `<div>` or the heading takes the rest.
 * The two elements have different ref types, so the title takes no `ref`.
 */
export type TimelineTitleProps = Omit<ComponentProps<'div'>, 'ref'> & {
	/**
	 * Heading level of the title. Set it when each item is a section of the page,
	 * so that a screen reader can go from title to title. Omit it to render a
	 * `<div>`. The look does not change with the level.
	 *
	 * @defaultValue No level: the title renders in a `<div>`.
	 */
	level?: HeadingLevel
}

/** Headline of a `<TimelineItem>`; spaced against the marker per the inherited orientation. */
export function TimelineTitle({ className, level, children, ...props }: TimelineTitleProps) {
	const { orientation } = useTimeline()

	// Tailwind preflight resets the font and the margin of a heading, so a heading
	// title looks the same as a `<div>` title.
	const Element = level === undefined ? 'div' : (`h${level}` as const)

	return (
		<Element
			data-slot="timeline-title"
			{...props}
			className={cn(k.title({ orientation }), className)}
		>
			{children}
		</Element>
	)
}
