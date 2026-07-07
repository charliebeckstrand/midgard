'use client'

import { Box } from '../../components/box'
import { Text } from '../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { useTruncation } from '../../hooks/use-truncation'

/** Props for {@link ChartHeaderLine}. @internal */
type ChartHeaderLineProps = {
	text: string
	/** The subtitle mutes and shrinks under the title. */
	subtitle?: boolean
}

/**
 * One header line — the title or the subtitle — clipped to a single line with a
 * reveal tooltip once it overflows, the same {@link useTruncation} affordance the
 * legend entries and grid cells wear. A header never wraps: a chart tile trades
 * its height for the plot, so a long line ellipsizes and hands the rest to the
 * tooltip rather than pushing the marks down.
 *
 * @internal
 */
function ChartHeaderLine({ text, subtitle = false }: ChartHeaderLineProps) {
	const [ref, truncated] = useTruncation<HTMLSpanElement>()

	return (
		<Tooltip enabled={truncated}>
			<TooltipTrigger>
				<span
					ref={ref}
					data-slot={subtitle ? 'chart-subtitle' : 'chart-title'}
					className={cn('block max-w-full truncate', truncated && 'cursor-help')}
				>
					<Text
						as="span"
						size={subtitle ? 'sm' : 'md'}
						severity={subtitle ? 'muted' : undefined}
						className={cn('leading-tight', !subtitle && 'font-medium')}
					>
						{text}
					</Text>
				</span>
			</TooltipTrigger>

			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	)
}

/** Props for {@link ChartHeader}. @internal */
type ChartHeaderProps = {
	title?: string
	subtitle?: string
	/**
	 * The centered hover / focus veil over a spark plot rather than the inline
	 * header above a framed one: it overlays the marks on a faint surface, faded
	 * out until the chart is pointed at or holds focus, so the sparkline reads as
	 * pure marks at rest.
	 */
	veil?: boolean
}

/**
 * The chart's header: a `title` and optional `subtitle`, each clipped to one line
 * with a reveal tooltip. Inline, it bands above the plot inside the aspect box so
 * the drawing fills the height it leaves. As a `veil` — the spark tier, where the
 * header would crowd the marks — it instead overlays the plot centered on a faint
 * surface, faded out until a pointer or keyboard focus asks what the sparkline
 * is. Renders nothing without a title or subtitle.
 *
 * @internal
 */
export function ChartHeader({ title, subtitle, veil = false }: ChartHeaderProps) {
	if (!title && !subtitle) return null

	const lines = (
		<>
			{title && <ChartHeaderLine text={title} />}

			{subtitle && <ChartHeaderLine text={subtitle} subtitle />}
		</>
	)

	if (!veil) {
		return (
			<div data-slot="chart-header" className="flex min-w-0 flex-col gap-0.5">
				{lines}
			</div>
		)
	}

	return (
		<Box
			data-slot="chart-header"
			bg="popover"
			radius="sm"
			// Centered over the marks and faded out until the chart is hovered or holds
			// focus; `pointer-events-none` so it never eats a mark's own hover.
			className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2 text-center opacity-0 transition-opacity duration-150 group-hover/chart:opacity-100 group-focus-within/chart:opacity-100"
		>
			{lines}
		</Box>
	)
}
