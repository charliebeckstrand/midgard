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
import { useChartEmphasis } from './context'

/** Entries per page once a side panel's switches would clip vertically. @internal */
const PAGE_SIZE = 5

/**
 * A legend entry's label, truncated to one line so a side panel's
 * `max-w-[50%]` can't force the row to overflow. `-webkit-line-clamp` was the
 * first pass, but its legacy box model centers a clamped line that had to wrap
 * internally before being cut — pulling a long label away from its swatch —
 * so a plain single-line `truncate` (`nowrap` + ellipsis) stands in instead;
 * it never wraps, so nothing is left to center. Surfaces the full label in a
 * hover tooltip once that overflow actually clips it.
 *
 * @internal
 */
function ChartLegendItemLabel({ label, off }: { label: string; off: boolean }) {
	const ref = useRef<HTMLSpanElement>(null)

	const [truncated, setTruncated] = useState(false)

	// Re-measures on a label change too, not just a box resize — content can grow
	// or shrink the overflow without the box's own size moving.
	// biome-ignore lint/correctness/useExhaustiveDependencies: label is read via the DOM the effect owns, not referenced directly.
	useLayoutEffect(() => {
		const el = ref.current

		if (!el) return

		const measure = () => setTruncated(el.scrollWidth > el.clientWidth)

		measure()

		const observer = new ResizeObserver(measure)

		observer.observe(el)

		return () => observer.disconnect()
	}, [label])

	return (
		<Tooltip enabled={truncated}>
			<TooltipTrigger>
				<span ref={ref} className="block min-w-0 truncate">
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
	/**
	 * Whether the series' `line` swatch dashes, mirroring a dashed stroke — solid
	 * by default, unlike a reference chip, which dashes by default. Only a `line`
	 * swatch dashes; a `rect` ignores it.
	 * @defaultValue false
	 */
	dashed?: boolean
	/** The slot colour, so a textured legend swatch mirrors the mark's tile; unset for a raw colour. */
	color?: ChartSeriesColor
	/** A trailing readout — the side panel carries each slice's live share. */
	detail?: string
}

/**
 * One legend entry for a reference line — an emphasis chip, not a series switch:
 * the rule's label (or its value, unlabelled) keyed to a line swatch in the
 * rule's colour. It carries no per-line toggle — a rule has no on/off — but
 * pointing or keyboard-focusing it recedes the marks to the rule, the same
 * emphasis as pointing the rule itself; {@link ChartReferenceList} still carries
 * the value parity beside the data table.
 *
 * @internal
 */
export type ChartLegendReference = {
	/**
	 * The rule's own index in the chart's `reference` array — the emphasis keys off
	 * it, not the chip's position, so a non-finite rule dropped from the chips still
	 * lines the emphasis up with the rule the plot draws under that index.
	 */
	index: number
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
 * ring to explain it. Reference lines follow the entries as emphasis chips —
 * a rule has no toggle, so pointing or focusing one recedes the marks to it (the
 * whole-marks equivalent of a series entry's dim) rather than switching anything;
 * {@link ChartReferenceList} still carries the value parity. A panel past five
 * switches pages instead of clipping: the visible page still renders in `items`
 * order, so the roving and emphasis wiring key off its position there rather than
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

	// The reference chips share the recede with the reference rules: a chip's hover
	// or keyboard focus recedes the data marks and the rule's siblings to it, the
	// same emphasis as pointing the rule. Present whenever the legend is inside a
	// chart.
	const { setReferenceActive } = useChartEmphasis()

	// Which rule the pointer's chip names, or none — the rule's own array index, so
	// the emphasis lands on the same rule the plot draws even when a non-finite rule
	// leaves a gap the chips skip.
	const referencePointed = useRef<number | null>(null)

	// Reference emphasis follows the same pointer-vs-focus-visible gate as
	// `syncEmphasis`: a pointed chip names its rule, else a keyboard-focused one
	// (`:focus-visible`, the ring's gate) does, so a click's ring-less focus — or a
	// backgrounded tab's refired focus — recedes nothing without a ring to explain
	// it. Chips render in `references` order, so a focused chip's position names its
	// entry, which carries the rule index the emphasis keys off.
	const syncReference = () => {
		if (referencePointed.current !== null) {
			setReferenceActive(referencePointed.current)

			return
		}

		const chips = ref.current?.querySelectorAll<HTMLButtonElement>(
			'button[data-slot="chart-legend-reference"]',
		)

		const position = chips
			? Array.from(chips).findIndex((chip) => chip.matches(':focus-visible'))
			: -1

		setReferenceActive(position === -1 ? null : (references[position]?.index ?? null))
	}

	// Two or more series make a switchboard; a lone one is a static chip.
	const seriesInteractive = items.length > 1

	// The row is a toolbar — one Tab stop, arrow-key roving, Escape to drop focus —
	// whenever it holds a focusable control: the series switches, or the reference
	// chips, which recede the marks on hover or focus.
	const interactive = seriesInteractive || references.length > 0

	// Rove across the focusable controls — series switches and reference chips
	// alike — so a lone series' static chip keeps its queryable `chart-legend-item`
	// slot without being seated a Tab stop, while the reference chips join the one
	// stop the switches share.
	const onKeyDown = useA11yRoving(ref, {
		itemSelector:
			'button[data-slot="chart-legend-item"], button[data-slot="chart-legend-reference"]',
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
				// The side panel centers its entries down the column, so a legend
				// stretched to the plot's full height reads level with it rather than
				// stacked at the top, and caps at half the chart's width; the wrap row
				// centers its entries on mobile and left-aligns them from sm.
				panel
					? 'flex min-w-0 flex-col items-start justify-center sm:max-w-[50%]'
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
							dashed={item.dashed}
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

				// A lone series can't be switched — nor emphasised, since dimming every
				// other mark against the only one would blank the chart — so it reads as a
				// static identity chip: no button, no toggle, no emphasis. It keeps the
				// `chart-legend-item` slot but stays out of the roving (a span, not a
				// button), so a reference chip beside it is the only Tab stop.
				if (!seriesInteractive) {
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
				// A reference chip mirrors a switch's swatch-and-label layout but recedes
				// the marks instead of toggling a series — a rule has no on/off — so it
				// carries no `aria-pressed` and its pointer / focus path drives the shared
				// reference emphasis through the same gate the switches use. The slot colour
				// rides its currentColor class; a raw colour rides an inline style; and the
				// line swatch dashes to match the rule unless it is drawn solid.
				<Button
					// biome-ignore lint/suspicious/noArrayIndexKey: chips are index-aligned with the reference prop and never reorder.
					key={`reference:${index}`}
					size="sm"
					variant="plain"
					data-slot="chart-legend-reference"
					onPointerEnter={() => {
						referencePointed.current = reference.index

						syncReference()
					}}
					onPointerLeave={() => {
						referencePointed.current = null

						syncReference()
					}}
					onFocus={syncReference}
					onBlur={syncReference}
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
				</Button>
			))}
		</div>
	)
}
