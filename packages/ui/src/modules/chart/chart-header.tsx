'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type KeyboardEvent, type ReactNode, useLayoutEffect } from 'react'
import { Box } from '../../components/box'
import { Heading } from '../../components/heading'
import { Text } from '../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { useTruncation } from '../../hooks/use-truncation'
import { useDragHandle } from '../../primitives/drag-handle'
import { useTileSurface } from '../../primitives/tile-surface'
import { k } from '../../recipes/kata/chart'
import type { ChartHeaderConfig } from './chart-schema'
import { useChartFullscreenControl } from './context'

/** Props for {@link ChartHeaderClip}. @internal */
type ChartHeaderClipProps = {
	/** The line's `data-slot` anchor. */
	slot: 'chart-title' | 'chart-subtitle'
	/** The full text, for the reveal tooltip once the line overflows. */
	text: string
	children: ReactNode
}

/**
 * The one-line clip both header lines share: truncation with a reveal
 * tooltip once the text overflows, the same {@link useTruncation} affordance
 * the legend entries and grid cells wear. A header never wraps: a chart tile
 * trades its height for the plot, so a long line ellipsizes and hands the
 * rest to the tooltip rather than pushing the marks down.
 *
 * @internal
 */
function ChartHeaderClip({ slot, text, children }: ChartHeaderClipProps) {
	const [ref, truncated] = useTruncation<HTMLSpanElement>()

	return (
		<Tooltip enabled={truncated}>
			<TooltipTrigger>
				<span
					ref={ref}
					data-slot={slot}
					// `text-start`, not the veil's inherited `text-center`: a centered line
					// clips both ends with no ellipsis when it overflows, so the clip pins
					// to the start and ellipsizes the end. A short line still reads centered
					// — it shrink-wraps and the veil's `items-center` centers the block.
					className={cn(
						'block max-w-full truncate text-start leading-tight',
						truncated && 'cursor-help',
					)}
				>
					{children}
				</span>
			</TooltipTrigger>

			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	)
}

/**
 * The title line: a true heading, so a board of tiles reads as a document
 * outline to assistive tech, in {@link ChartHeaderClip}'s one-line clip.
 *
 * @internal
 */
function ChartHeaderTitle({ text }: { text: string }) {
	return (
		<ChartHeaderClip slot="chart-title" text={text}>
			<Heading level={4}>{text}</Heading>
		</ChartHeaderClip>
	)
}

/**
 * The subtitle line — a unit, a period, a caveat — muted under the title,
 * sharing its clip and reveal tooltip.
 *
 * @internal
 */
function ChartHeaderSubtitle({ text }: { text: string }) {
	return (
		<ChartHeaderClip slot="chart-subtitle" text={text}>
			<Text as="span" severity="muted" className="leading-tight">
				{text}
			</Text>
		</ChartHeaderClip>
	)
}

/** Props for {@link ChartHeader}. @internal */
type ChartHeaderProps = {
	/** The resolved header config; the frame only mounts this with something to show. */
	header: ChartHeaderConfig
	/**
	 * The centered hover / focus veil over a spark plot rather than the inline
	 * header above a framed one: it overlays the marks on a faint surface, faded
	 * out until the chart is pointed at or holds focus, so the sparkline reads as
	 * pure marks at rest. The veil carries the title and subtitle alone — the
	 * adornments stand down with the rest of the spark chrome.
	 */
	veil?: boolean
}

/**
 * The chart's header: a title and optional subtitle, each clipped to one line
 * with a reveal tooltip, between the leading and trailing adornments the
 * `header` config carries. Inline, it bands above the plot inside the aspect
 * box as a single row — `[handle] [prefix] [title / subtitle] [suffix]` — and
 * an adornment arriving or leaving after mount pops on a scale-fade while the
 * title block slides over on the shared layout spring. The handle is the
 * ambient one a drag host broadcasts ({@link useDragHandle}): while this
 * header renders inline it claims and adopts it, so a dashboard tile's drag
 * grip sits in the chart's own chrome rather than floating over it. As a
 * `veil` — the spark tier, where the header would crowd the marks — it instead
 * overlays the plot centered on a faint surface, faded out until a pointer or
 * keyboard focus asks what the sparkline is, carrying only the title lines.
 * Inside a tile the veil bleeds over the tile's content padding to the card
 * edge and, where the chart carries a fullscreen view, becomes a button that
 * opens it — so a sparkline shrunk past its chrome is still one click from the
 * full chart.
 *
 * @internal
 */
export function ChartHeader({ header, veil = false }: ChartHeaderProps) {
	const { title, subtitle, prefix, suffix } = header

	const dragHandle = useDragHandle()

	// A veil inside a tile bleeds to the tile's edge and clicks through to the
	// chart's fullscreen view; both stand down for a standalone spark chart.
	const tiled = useTileSurface()

	const openFullscreen = useChartFullscreenControl()

	// The veil never adopts: a spark tile's grip stays with the host's floating
	// fallback, where it reads over bare marks instead of inside a hover veil.
	const adopted = !veil && dragHandle !== null

	useLayoutEffect(() => {
		if (!adopted) return

		return dragHandle.claim()
	}, [adopted, dragHandle])

	const lines = (
		<>
			{title && <ChartHeaderTitle text={title} />}

			{subtitle && <ChartHeaderSubtitle text={subtitle} />}
		</>
	)

	if (!veil) {
		return (
			<div data-slot="chart-header" className="flex min-w-0 items-center gap-2">
				<AnimatePresence initial={false} mode="popLayout">
					{adopted && (
						<motion.span
							key="handle"
							{...k.header.adornment}
							data-slot="chart-header-handle"
							className="flex shrink-0 items-center"
						>
							{dragHandle.handle}
						</motion.span>
					)}

					{prefix !== undefined && (
						<motion.span
							key="prefix"
							{...k.header.adornment}
							data-slot="chart-header-prefix"
							className="flex shrink-0 items-center"
						>
							{prefix}
						</motion.span>
					)}
				</AnimatePresence>

				<motion.div {...k.header.slide} className="flex min-w-0 flex-1 flex-col gap-0.5">
					{lines}
				</motion.div>

				<AnimatePresence initial={false} mode="popLayout">
					{suffix !== undefined && (
						<motion.span
							key="suffix"
							{...k.header.adornment}
							data-slot="chart-header-suffix"
							className="flex shrink-0 items-center"
						>
							{suffix}
						</motion.span>
					)}
				</AnimatePresence>
			</div>
		)
	}

	// Inside a tile with a fullscreen view the veil is a click target for it —
	// role, focus, and the space/enter parity a native button carries. A tile
	// veil with no fullscreen (or a standalone spark chart) stays inert.
	const clickable = tiled && openFullscreen !== null

	const trigger = clickable
		? {
				role: 'button' as const,
				tabIndex: 0,
				onClick: openFullscreen,
				onKeyDown: (event: KeyboardEvent) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault()

						openFullscreen()
					}
				},
				'aria-label': title ? `Expand ${title}` : 'Expand chart',
			}
		: null

	return (
		<Box
			data-slot="chart-header"
			bg="popover"
			// A tile veil matches the tile card's radius; a standalone one the plot's.
			radius={tiled ? 'lg' : 'sm'}
			{...trigger}
			// Centered over the marks and faded out until the chart is hovered or holds
			// focus. Standalone it fills the plot box, inert so it never eats a mark's
			// hover; in a tile it bleeds over the tile's `p-3` content padding to the
			// card edge (`-inset-3`) and, with a fullscreen view, clicks through to it.
			className={cn(
				// `items-center` centers each line's block; the lines themselves align to
				// the start so an overflowing title ellipsizes cleanly (see ChartHeaderClip).
				'absolute flex flex-col items-center justify-center gap-0.5 px-2 opacity-0 transition-opacity duration-150 group-hover/chart:opacity-100 group-focus-within/chart:opacity-100',
				tiled ? '-inset-3' : 'inset-0',
				clickable ? 'cursor-pointer' : 'pointer-events-none',
			)}
		>
			{lines}
		</Box>
	)
}
