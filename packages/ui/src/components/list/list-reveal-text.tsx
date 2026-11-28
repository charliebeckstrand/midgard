'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, useLayoutEffect } from 'react'
import { cn } from '../../core/cn'
import { useTruncation } from '../../hooks/use-truncation'
import { type ListRevealLine, useListItemReveal } from './context'
import type { CutLines } from './use-list-item-reveal-state'

/**
 * The text of the truncation reveal of a row: the label, and then the
 * description, each on its own line. Only the lines that truncate show.
 *
 * @internal
 */
export function ListRevealText({ lines }: { lines: CutLines }) {
	return (
		<>
			{lines.label !== undefined && <span className="block">{lines.label}</span>}
			{lines.description !== undefined && <span className="block">{lines.description}</span>}
		</>
	)
}

/** Props for {@link ListRevealLineText}. @internal */
type ListRevealLineTextProps = ComponentProps<'span'> & {
	/** The line of the row that the text is. */
	line: ListRevealLine
	/** The `data-slot` of the text. */
	slot: string
	/** The classes of the recipe. */
	base: string
}

/**
 * One line of the text of a row, clipped to one line. While it truncates, it
 * reports its content to the reveal of the row (see {@link useListItemRevealState}).
 * The pointer or the focus contact of the row arms the measure, because the row
 * takes the hover and the focus: the overlay of a row that acts covers the text.
 *
 * @internal
 */
export function ListRevealLineText({
	line,
	slot,
	base,
	className,
	ref,
	children,
	...props
}: ListRevealLineTextProps) {
	const reveal = useListItemReveal()

	const [truncationRef, truncated] = useTruncation<HTMLSpanElement>({ armRef: reveal?.armRef })

	const setRef = useComposedRefs<HTMLSpanElement>(ref, truncationRef)

	const content = truncated ? children : null

	useLayoutEffect(() => {
		reveal?.report(line, content)
	}, [reveal, line, content])

	// A line that unmounts takes its text out of the reveal.
	useLayoutEffect(() => () => reveal?.report(line, null), [reveal, line])

	return (
		<span data-slot={slot} className={cn(base, className)} ref={setRef} {...props}>
			{children}
		</span>
	)
}
