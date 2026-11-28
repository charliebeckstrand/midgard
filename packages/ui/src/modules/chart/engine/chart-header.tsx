'use client'

import {
	type ComponentProps,
	type ReactNode,
	type RefCallback,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { Text } from '../../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { cn } from '../../../core/cn'
import { useEscapeLayer } from '../../../hooks/use-escape-layer'
import { useTruncation } from '../../../hooks/use-truncation'
import { Box } from '../../../structure/box'

/**
 * Props for {@link ChartHeaderText}. The `<span>` of the line takes the rest, so
 * a tooltip trigger can clone its props onto the line. @internal
 */
type ChartHeaderTextProps = Omit<ComponentProps<'span'>, 'children' | 'ref' | 'color'> & {
	text: string
	/** The subtitle mutes and shrinks under the title. */
	subtitle?: boolean
	/** The id of the line, which the chart figure points to for its name. */
	id?: string
	/** The ref of the line, which measures its truncation. */
	ref?: RefCallback<HTMLSpanElement>
}

/**
 * The text of one header line: the title or the subtitle, clipped to a single
 * line. A header never wraps, because a chart tile trades its height for the
 * plot. A long line ellipsizes and hands the rest to a reveal tooltip, rather
 * than pushing the marks down.
 *
 * The line sets its own `leading-6` line box. Its height is therefore
 * `CHART_HEADER_LINE_HEIGHT` at every inherited font size, and the tier
 * reserve that adds up the header stays correct.
 *
 * @internal
 */
function ChartHeaderText({ text, subtitle = false, className, ...props }: ChartHeaderTextProps) {
	return (
		<Text
			as="span"
			{...props}
			data-slot={subtitle ? 'chart-subtitle' : 'chart-title'}
			size={subtitle ? 'sm' : 'md'}
			tone={subtitle ? 'muted' : undefined}
			className={cn('block max-w-full truncate leading-6', !subtitle && 'font-medium', className)}
		>
			{text}
		</Text>
	)
}

/** Props for {@link ChartHeaderLine}. @internal */
type ChartHeaderLineProps = Pick<ChartHeaderTextProps, 'text' | 'subtitle' | 'id'>

/**
 * One line of the inline header, with a reveal tooltip once it overflows. It
 * wears the same {@link useTruncation} affordance the legend entries and grid
 * cells do.
 *
 * @internal
 */
function ChartHeaderLine({ text, subtitle = false, id }: ChartHeaderLineProps) {
	const [ref, truncated] = useTruncation<HTMLSpanElement>()

	return (
		<Tooltip disabled={!truncated}>
			<TooltipTrigger>
				<ChartHeaderText
					ref={ref}
					text={text}
					subtitle={subtitle}
					id={id}
					// The trigger stamps `inline-flex` ahead of this class, and an ellipsis paints only
					// on a block box, so the line restates `block`.
					className={cn('block', truncated && 'cursor-help')}
				/>
			</TooltipTrigger>

			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	)
}

/**
 * Whether an Escape press has put the veil away (WCAG 1.4.13).
 *
 * The veil shows while the chart is hovered or holds focus, and it covers the whole sparkline.
 * A reader who points at the marks to see them, such as with a screen magnifier, therefore needs
 * a way to remove it without a move of the pointer. Escape removes it wherever the focus is, as it
 * closes a `Tooltip`. The veil comes back after the chart is neither hovered nor focused.
 *
 * @param veil - The veil. The hover and the focus of its chart root show it.
 * @returns `shown`, whether the chart is hovered or holds focus, and `dismissed`,
 * whether an Escape press put the veil away since then.
 * @internal
 */
function useVeilDismissed(veil: RefObject<HTMLElement | null>): {
	shown: boolean
	dismissed: boolean
} {
	const [hovered, setHovered] = useState(false)

	const [focused, setFocused] = useState(false)

	const [dismissed, setDismissed] = useState(false)

	const shown = hovered || focused

	// Adjusted during render: the hover or the focus that the press dismissed has ended.
	if (dismissed && !shown) setDismissed(false)

	// Out of the dismiss stack, as a `Tooltip`: the layer below, such as a Dialog, still gets the press.
	useEscapeLayer({
		open: shown && !dismissed,
		layered: false,
		onDismiss: () => setDismissed(true),
	})

	useEffect(() => {
		// The chart root carries the `group/chart` that the reveal classes read.
		const node = veil.current?.closest<HTMLElement>('[data-slot="chart"]')

		if (!node) return

		// The veil can mount under a pointer or a focus that is already on the chart, such as
		// after a resize to the spark tier. No enter event comes then, so the state starts from
		// what the reveal classes read.
		setHovered(node.matches(':hover'))

		setFocused(node.matches(':focus-within'))

		const enter = () => setHovered(true)

		const leave = () => setHovered(false)

		const focusIn = () => setFocused(true)

		const focusOut = (event: FocusEvent) => {
			if (!node.contains(event.relatedTarget as Node | null)) setFocused(false)
		}

		node.addEventListener('pointerenter', enter)

		node.addEventListener('pointerleave', leave)

		node.addEventListener('focusin', focusIn)

		node.addEventListener('focusout', focusOut)

		return () => {
			node.removeEventListener('pointerenter', enter)

			node.removeEventListener('pointerleave', leave)

			node.removeEventListener('focusin', focusIn)

			node.removeEventListener('focusout', focusOut)
		}
	}, [veil])

	return { shown, dismissed }
}

/** Props for {@link ChartHeaderVeil}. @internal */
type ChartHeaderVeilProps = {
	title?: string
	/** The id of the title line, which the chart figure points to for its name. */
	titleId?: string
	subtitle?: string
}

/**
 * The spark tier's header: centered over the marks on a faint surface, and faded out until the
 * chart is hovered or holds focus. Escape puts it away (see {@link useVeilDismissed}).
 *
 * While the veil shows a line that truncates, a tooltip shows the full text of each line that
 * truncates (WCAG 1.4.10). The veil takes no pointer, so a hover of a line cannot open a tooltip,
 * and the veil holds its tooltip open while it shows. Escape puts the two away together. The
 * title names the chart, so the tooltip adds no description.
 *
 * @internal
 */
function ChartHeaderVeil({ title, titleId, subtitle }: ChartHeaderVeilProps) {
	const ref = useRef<HTMLDivElement>(null)

	// The chart root, whose hover or focus shows the veil, arms the measure of each line. The
	// veil takes no pointer, so the contact of a line never comes. The callback ref sets it in
	// the commit, before the effects of the measure bind to it.
	const rootRef = useRef<HTMLElement | null>(null)

	const setVeil = useCallback((node: HTMLDivElement | null) => {
		ref.current = node

		rootRef.current = node?.closest<HTMLElement>('[data-slot="chart"]') ?? null
	}, [])

	const { shown, dismissed } = useVeilDismissed(ref)

	const [titleRef, titleCut] = useTruncation<HTMLSpanElement>({ armRef: rootRef })

	const [subtitleRef, subtitleCut] = useTruncation<HTMLSpanElement>({ armRef: rootRef })

	return (
		<Tooltip disabled={!titleCut && !subtitleCut} open={shown && !dismissed}>
			<TooltipTrigger aria-describedby={undefined}>
				<Box
					ref={setVeil}
					data-slot="chart-header"
					bg="popover"
					radius="sm"
					// `pointer-events-none`, so it never takes the hover of a mark.
					className={cn(
						'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2 text-center opacity-0 transition-opacity duration-150',
						!dismissed && 'group-hover/chart:opacity-100 group-focus-within/chart:opacity-100',
					)}
				>
					{title && <ChartHeaderText ref={titleRef} text={title} id={titleId} />}

					{subtitle && <ChartHeaderText ref={subtitleRef} text={subtitle} subtitle />}
				</Box>
			</TooltipTrigger>

			<TooltipContent>
				{titleCut && title && <span className="block">{title}</span>}

				{subtitleCut && subtitle && <span className="block">{subtitle}</span>}
			</TooltipContent>
		</Tooltip>
	)
}

/** Props for {@link ChartHeader}. @internal */
type ChartHeaderProps = {
	title?: string
	/** The id of the title line, which the chart figure points to for its name. */
	titleId?: string
	subtitle?: string
	/**
	 * The centered hover / focus veil over a spark plot, rather than the inline
	 * header above a framed one. It overlays the marks on a faint surface, faded
	 * out until the chart is pointed at or holds focus. The sparkline therefore
	 * reads as pure marks at rest. Escape puts it away until the chart is neither hovered nor
	 * focused.
	 */
	veil?: boolean
	/** A control at the end of the inline header row, such as the touch menu button. The veil shows none. */
	action?: ReactNode
}

/**
 * The chart's header: a `title` and optional `subtitle`, each clipped to one line
 * with a reveal tooltip. Inline, it bands above the plot inside the aspect box so
 * the drawing fills the height it leaves. As a `veil` it instead overlays the
 * plot centered on a faint surface. That surface is faded out until a pointer or
 * keyboard focus asks what the sparkline is. The `veil` is the spark tier, where
 * the header would crowd the marks. Renders nothing without a title or subtitle.
 *
 * @internal
 */
export function ChartHeader({ title, titleId, subtitle, veil = false, action }: ChartHeaderProps) {
	if (!title && !subtitle) return null

	if (veil) return <ChartHeaderVeil title={title} titleId={titleId} subtitle={subtitle} />

	return (
		<div
			data-slot="chart-header"
			// The row gap is the line gap that the tier reserve reads. It has no effect
			// on this row, and the column of lines applies the same gap.
			className="flex min-w-0 items-start gap-x-2 gap-y-0.5"
		>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{title && <ChartHeaderLine text={title} id={titleId} />}

				{subtitle && <ChartHeaderLine text={subtitle} subtitle />}
			</div>

			{action}
		</div>
	)
}
