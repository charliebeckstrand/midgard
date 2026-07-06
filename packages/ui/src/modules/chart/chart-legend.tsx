'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type KeyboardEvent, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Swatch } from '../../components/swatch'
import { Text } from '../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks/a11y'
import type { ChartSeriesColor } from '../../recipes/kata/chart'
import { ChartSwatch } from './chart-pattern-defs'

/** Entries per page once a side panel's switches would clip vertically. @internal */
const PAGE_SIZE = 5

/**
 * A legend entry's label, line-clamped to one line so a side panel's
 * `max-w-[50%]` can't force the row to overflow. Detects the clamp by its
 * clipped line spilling past the box's own height — `line-clamp` wraps rather
 * than widens, so overflow reads on the vertical axis, not the horizontal one
 * a plain single-line truncate would compare — and surfaces the full label in
 * a hover tooltip once that clip fires.
 *
 * @internal
 */
function ChartLegendItemLabel({ label, off }: { label: string; off: boolean }) {
	const ref = useRef<HTMLSpanElement>(null)

	const [truncated, setTruncated] = useState(false)

	// Re-measures on a label change too, not just a box resize — content can grow
	// or shrink the clamped line's overflow without the box's own size moving.
	// biome-ignore lint/correctness/useExhaustiveDependencies: label is read via the DOM the effect owns, not referenced directly.
	useLayoutEffect(() => {
		const el = ref.current

		if (!el) return

		const measure = () => setTruncated(el.scrollHeight > el.clientHeight)

		measure()

		const observer = new ResizeObserver(measure)

		observer.observe(el)

		return () => observer.disconnect()
	}, [label])

	return (
		<Tooltip enabled={truncated}>
			<TooltipTrigger>
				<span ref={ref} className="min-w-0 line-clamp-1">
					<Text
						as="span"
						severity="muted"
						size="sm"
						className={cn('text-left leading-tight', off && 'line-through opacity-60')}
					>
						{label}
					</Text>
				</span>
			</TooltipTrigger>

			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}

/** One legend entry: the series name keyed by its mark-mirroring swatch. @internal */
export type ChartLegendItem = {
	/**
	 * The series' own index — the toggle, emphasis, and `hidden` set key off it,
	 * not the entry's position, so the legend can list its switches in a
	 * different order than the series without misrouting a click or a colour.
	 */
	index: number
	label: string
	/** currentColor class carrying the series colour; empty for a raw colour, which inks inline. */
	swatchClass: string
	/** A raw series colour inked inline on the swatch's `currentColor`; unset for a palette slot. */
	swatchColor?: string
	/** Swatch shape, mirroring the mark: `rect` for bars and slices, `line` for lines. */
	swatch: 'rect' | 'line'
	/** The slot colour, so a textured legend swatch mirrors the mark's tile; unset for a raw colour. */
	color?: ChartSeriesColor
	/** A trailing readout — the side panel carries each slice's live share. */
	detail?: string
}

/**
 * One legend entry for a reference line — a static identity chip, not a series
 * switch: the rule's label (or its value, unlabelled) keyed to a line swatch in
 * the rule's colour. Non-interactive and `aria-hidden`, since a reference has no
 * per-line toggle and {@link ChartReferenceList} already carries the
 * assistive-tech parity beside the data table.
 *
 * @internal
 */
export type ChartLegendReference = {
	label: string
	/** currentColor class carrying a palette slot's colour; empty when {@link color} is set. */
	swatchClass: string
	/** A raw CSS colour applied inline as currentColor; absent for a palette slot. */
	color?: string
	/**
	 * Whether the rule is dashed, so the chip's line swatch mirrors it — dashed by
	 * default, `false` only for a rule drawn solid.
	 * @defaultValue true
	 */
	dashed?: boolean
}

/** Props for {@link ChartLegend}. @internal */
export type ChartLegendProps = {
	items: ChartLegendItem[]
	/**
	 * The reference-line entries, drawn after the series switches as static
	 * identity chips. Empty — the default — draws none.
	 */
	references?: ChartLegendReference[]
	/** Item indexes toggled off; their marks are hidden and their text struck through. */
	hidden: ReadonlySet<number>
	/** Toggles an item's series on or off. */
	onToggle: (index: number) => void
	/** Emphasises an item's series (`null` clears); other marks dim while set. */
	onFocus: (index: number | null) => void
	/**
	 * Lay the entries out as a single column rather than the centered wrap
	 * row — the static side panel beside a pie or donut. Caps the panel at
	 * half the chart's width and, past five switches, paginates them instead
	 * of clipping the column.
	 */
	panel?: boolean
	/** The `texture` prop is on, so square swatches hatch in every mode, mirroring the marks. */
	texture?: boolean
}

/**
 * The legend — the dependable identity channel for two or more series, and
 * the chart's series switchboard: pointing (or keyboard-focusing) an entry
 * dims every other series, clicking toggles its series off. The switches are
 * plain HTML buttons outside the `role="img"` region, so assistive tech reads
 * and operates them; swatches carry the colour, the text stays in ink. A lone
 * entry has nothing to switch against — toggling it would blank the chart and
 * emphasis would dim nothing — so it drops the button and reads as a static
 * chip; the `toolbar` role and its roving appear only for two or more.
 *
 * @remarks With two or more entries the row is one Tab stop; the arrow keys
 * rove between the switches (Home / End jump to the ends) and Escape drops
 * focus, clearing the emphasis. Pointer and keyboard share the one emphasis
 * slot: the pointed-at entry wins, and leaving it reverts to a still-held
 * keyboard focus rather than clearing. That focus side rides `:focus-visible`,
 * the same gate as the ring, so a pointer click's lingering focus — or the
 * focus a backgrounded tab re-fires on return — dims nothing without a visible
 * ring to explain it. Reference lines follow the entries as static,
 * `aria-hidden` identity chips — a rule has no toggle, and
 * {@link ChartReferenceList} carries its parity. A panel past five switches
 * pages instead of clipping: the visible page still renders in `items` order,
 * so the roving and emphasis wiring key off its position there rather than
 * the full list.
 * @internal
 */
export function ChartLegend({
	items,
	references = [],
	hidden,
	onToggle,
	onFocus,
	panel = false,
	texture = false,
}: ChartLegendProps) {
	const ref = useRef<HTMLDivElement>(null)

	const [page, setPage] = useState(0)

	// Only a side panel clips vertically — the wrap row just grows. Past one
	// page, the column trades clipping for a prev/next page instead.
	const paginate = panel && items.length > PAGE_SIZE

	const pageCount = paginate ? Math.ceil(items.length / PAGE_SIZE) : 1

	const currentPage = Math.min(page, pageCount - 1)

	const pageItems = paginate
		? items.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)
		: items

	// Which series the pointer is over, or null. Emphasis draws on this and the
	// keyboard focus together, so the two inputs share the one slot instead of
	// clobbering it.
	const hovered = useRef<number | null>(null)

	// Emphasis follows whichever input is live: the pointed-at entry wins, else
	// the keyboard-focused one. The keyboard side reads `:focus-visible` from the
	// DOM rather than a tracked index, so a focus that silently stops being
	// visible — a click landing on a focused switch, a backgrounded tab returning
	// — resolves to nothing without needing an event to announce it. Every pointer
	// and focus transition recomputes, so leaving a hover reverts to a still-held
	// keyboard focus rather than clearing the emphasis out from under it.
	const syncEmphasis = () => {
		if (hovered.current !== null) {
			onFocus(hovered.current)

			return
		}

		const buttons = ref.current?.querySelectorAll<HTMLButtonElement>(
			'button[data-slot="chart-legend-item"]',
		)

		const position = buttons
			? Array.from(buttons).findIndex((button) => button.matches(':focus-visible'))
			: -1

		// Buttons render in `pageItems` order — `items` itself, less any page not
		// currently visible — so a focused button's position names its entry there;
		// the entry carries the series index the emphasis keys off, which the
		// legend's display order need not match.
		onFocus(position === -1 ? null : (pageItems[position]?.index ?? null))
	}

	// Two or more entries make a switchboard; a lone one is a static chip.
	const interactive = items.length > 1

	// Scope the roving to the actual switch buttons, so a static chip keeps its
	// queryable `chart-legend-item` slot without being seated a Tab stop.
	const onKeyDown = useA11yRoving(ref, {
		itemSelector: 'button[data-slot="chart-legend-item"]',
		orientation: 'horizontal',
		manageTabIndex: true,
	})

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Escape') {
			;(document.activeElement as HTMLElement | null)?.blur()

			return
		}

		onKeyDown(event)
	}

	// The toolbar role, its orientation, and the roving handler travel together:
	// present for a switchboard, absent for a lone static chip (a plain grouping
	// div with no interaction).
	const toolbarProps = interactive
		? ({ role: 'toolbar', 'aria-orientation': 'horizontal', onKeyDown: handleKeyDown } as const)
		: {}

	return (
		<div
			ref={ref}
			data-slot="chart-legend"
			{...toolbarProps}
			className={cn(
				panel
					? 'flex min-w-0 flex-col items-start sm:max-w-[50%]'
					: 'flex flex-wrap items-center justify-center sm:justify-start',
			)}
		>
			{pageItems.map((item) => {
				const off = hidden.has(item.index)

				const content = (
					<>
						<ChartSwatch
							swatch={item.swatch}
							swatchClass={item.swatchClass}
							swatchColor={item.swatchColor}
							color={item.color}
							active={texture}
							off={off}
						/>

						<ChartLegendItemLabel label={item.label} off={off} />

						{item.detail && (
							<Text
								as="span"
								severity="muted"
								size="sm"
								className={cn('text-left leading-tight tabular-nums', off && 'opacity-60')}
							>
								{item.detail}
							</Text>
						)}
					</>
				)

				// A lone entry can't be switched, so it reads as a static identity
				// chip — no button, no toggle, no emphasis — matching the reference chips.
				if (!interactive) {
					return (
						<span
							key={item.label}
							data-slot="chart-legend-item"
							className={cn('inline-flex items-center gap-1 px-2 py-1', panel && 'w-full min-w-0')}
						>
							{content}
						</span>
					)
				}

				return (
					<Button
						key={item.label}
						size="sm"
						variant="plain"
						data-slot="chart-legend-item"
						block={panel}
						// Button's own base centers its content; a panel entry stretches
						// to `w-full` so every row can align its swatch to the same edge,
						// not center a shorter row's content under a longer one's.
						className={cn(panel && 'min-w-0 justify-start')}
						aria-pressed={!off}
						onClick={() => onToggle(item.index)}
						onPointerEnter={() => {
							hovered.current = item.index

							syncEmphasis()
						}}
						onPointerLeave={() => {
							hovered.current = null

							syncEmphasis()
						}}
						// Focus and blur resolve through the same path as hover: a keyboard
						// focus (`:focus-visible`, the same gate the ring rides) emphasises,
						// while a pointer click's ring-less focus — or the focus a backgrounded
						// tab re-fires on return — resolves to nothing.
						onFocus={syncEmphasis}
						onBlur={syncEmphasis}
					>
						{content}
					</Button>
				)
			})}

			{paginate && (
				<div
					data-slot="chart-legend-pagination"
					className="flex w-full items-center justify-between gap-1 pt-1"
				>
					<Button
						size="sm"
						variant="plain"
						aria-label="Previous legend entries"
						disabled={currentPage === 0}
						onClick={() => setPage(currentPage - 1)}
					>
						<Icon icon={<ChevronLeft />} />
					</Button>

					<Text as="span" severity="muted" size="sm" className="tabular-nums">
						{currentPage + 1} / {pageCount}
					</Text>

					<Button
						size="sm"
						variant="plain"
						aria-label="Next legend entries"
						disabled={currentPage === pageCount - 1}
						onClick={() => setPage(currentPage + 1)}
					>
						<Icon icon={<ChevronRight />} />
					</Button>
				</div>
			)}

			{references.map((reference, index) => (
				// A reference chip mirrors an entry's swatch-and-label layout without the
				// button chrome — it names a rule, it doesn't switch a series. The slot
				// colour rides its currentColor class; a raw colour rides an inline style;
				// and the line swatch dashes to match the rule unless it is drawn solid.
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: chips are index-aligned with the reference prop and never reorder.
					key={`reference:${index}`}
					data-slot="chart-legend-reference"
					aria-hidden="true"
					className="inline-flex items-center gap-1 px-2 py-1"
				>
					<Swatch
						shape="line"
						variant={reference.dashed === false ? 'solid' : 'dashed'}
						color={reference.swatchClass || undefined}
						style={reference.color ? { color: reference.color } : undefined}
					/>

					<Text as="span" severity="muted" size="sm" className="text-left leading-tight">
						{reference.label}
					</Text>
				</span>
			))}
		</div>
	)
}
