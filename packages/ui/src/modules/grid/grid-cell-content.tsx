'use client'

import {
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'

/**
 * Truncation tooltip for a data cell: `auto` shows the cell's own content when
 * it overflows, `custom` shows a column-supplied node in its place, and `none`
 * suppresses the tooltip while still truncating.
 *
 * @internal
 */
export type CellTooltip = { kind: 'auto' } | { kind: 'custom'; node: ReactNode } | { kind: 'none' }

/**
 * Whether an element's single-line content overflows its content box, measured
 * at sub-pixel precision. `scrollWidth`/`clientWidth` round to integers, so a
 * fraction of a pixel of overflow can read as fitting (a clipped cell with no
 * tooltip) or an exact fit as overflowing (a tooltip with nothing to reveal); a
 * `Range` over the contents reports their true laid-out width, regardless of the
 * overflow clip. The truncate span carries no padding or border, so its bounding
 * width is its content box; half a pixel of slack absorbs rounding noise.
 *
 * @internal
 */
function isOverflowing(el: HTMLElement): boolean {
	const range = document.createRange()

	range.selectNodeContents(el)

	// Layout-less environments (jsdom) don't implement Range geometry; fall back
	// to the integer scroll/client comparison there.
	if (typeof range.getBoundingClientRect !== 'function') return el.scrollWidth > el.clientWidth

	return range.getBoundingClientRect().width - el.getBoundingClientRect().width > 0.5
}

/**
 * Tracks whether an element's single-line content overflows its box (clipped to
 * an ellipsis). Measured eagerly — after every commit, for content changes, on
 * `ResizeObserver` width changes that don't re-render, and once web fonts settle
 * (which reflows text without resizing the box) — because a {@link Tooltip} won't
 * open mid-hover once its `enabled` flips, so truncation must be known before the
 * pointer arrives.
 *
 * @internal
 */
function useGridCellTruncated<E extends HTMLElement>(): [RefObject<E | null>, boolean] {
	const ref = useRef<E>(null)

	const [truncated, setTruncated] = useState(false)

	// Setting the same value bails out of a re-render, so measuring on every
	// commit can't loop.
	const measure = useCallback(() => {
		const el = ref.current

		if (el) setTruncated(isOverflowing(el))
	}, [])

	useLayoutEffect(measure)

	useEffect(() => {
		const el = ref.current

		if (!el) return

		if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {})

		if (typeof ResizeObserver === 'undefined') return

		const observer = new ResizeObserver(measure)

		observer.observe(el)

		return () => observer.disconnect()
	}, [measure])

	return [ref, truncated]
}

/** Props for {@link GridCellContent}. @internal */
type GridCellContentProps = {
	content: ReactNode
	tooltip: CellTooltip
}

/**
 * Renders a data cell's content on one line, truncated to an ellipsis when it
 * overflows the column width. A truncated cell gains a hover/focus
 * {@link Tooltip} carrying the full content — or a column's `cellTooltip` node in
 * its place — while `none` suppresses it.
 *
 * @remarks The tooltip stays mounted and is gated by its `enabled` prop rather
 * than mounted only while truncated: keeping the span in place means the overflow
 * `ResizeObserver` never detaches, so widening a column back out re-measures and
 * `enabled` closes the tooltip. (Remounting the span on every truncation toggle
 * stranded the observer on the old node, leaving a stale tooltip.) The closed
 * tooltip renders no surface, so an untruncated cell adds no DOM.
 * @internal
 */
export function GridCellContent({ content, tooltip }: GridCellContentProps) {
	const [ref, truncated] = useGridCellTruncated<HTMLSpanElement>()

	const span = (
		<span ref={ref} className={cn(k.cell.truncate)}>
			{content}
		</span>
	)

	if (tooltip.kind === 'none') return span

	const node = tooltip.kind === 'custom' ? tooltip.node : content

	return (
		<Tooltip enabled={truncated}>
			<TooltipTrigger>{span}</TooltipTrigger>

			<TooltipContent className={cn(k.cell.tooltip)}>{node}</TooltipContent>
		</Tooltip>
	)
}
