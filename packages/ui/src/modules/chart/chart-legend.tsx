'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type KeyboardEvent, type RefObject, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { Swatch } from '../../components/swatch'
import { Text } from '../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks/a11y'
import { useTruncation } from '../../hooks/use-truncation'
import type { ChartSeriesColor } from '../../recipes/kata/chart'
import { OVERFLOW_CHIP_RESERVE, visibleLegendCount } from './chart-legend-fit'
import { ChartSwatch } from './chart-pattern-defs'
import { useChartEmphasis } from './context'

/** Entries per page once a side panel's switches would clip vertically. @internal */
const PAGE_SIZE = 5

/**
 * How many of a stacked band's controls fit within `maxRows` rows before the
 * rest collapse into a `+N` chip. Measures an invisible ghost row that always
 * holds every control — so the cut is exact and never flashes on resize the way a
 * measure-then-cut of the visible row would — reading each control's wrapped row
 * and right edge and packing them through {@link visibleLegendCount}. Returns the
 * full `count` when nothing caps (no ghost, no measurement), so an uncapped or
 * side-panel legend pays nothing.
 *
 * @internal
 */
function useLegendFit(
	ghostRef: RefObject<HTMLDivElement | null>,
	count: number,
	maxRows: number | undefined,
): number {
	const [visible, setVisible] = useState(count)

	// A layout effect, so the first cut lands before paint — the visible row never
	// flashes its full height then collapses. The ghost holds every control at all
	// times, so the observer refits on resize from a stable measurement rather than
	// the already-cut visible row, which could never reveal that a widened box now
	// fits more.
	useLayoutEffect(() => {
		const ghost = ghostRef.current

		// `count` re-runs the measure when the control set changes — a resize alone
		// can miss an added entry that lands on an existing row without growing the
		// ghost, so the row count is a dependency, not just the observed size.
		if (!ghost || maxRows === undefined || count === 0) return

		const measure = () => {
			const controls = [...ghost.querySelectorAll<HTMLElement>('button')]

			// A wrapped control drops about a full control-height; a swatch-vs-chip
			// baseline nudge within a row is a pixel or two (the row centers its
			// controls, so a shorter one sits a hair lower). Bucket each top to the
			// nearest control-height so a sub-row offset never reads as its own row and
			// overflows a control that visually fits — then rank the distinct buckets
			// into row indices, so a non-uniform pitch a fixed divisor drifts on still
			// orders correctly.
			const rowHeight = controls[0]?.offsetHeight || 1

			const bucketOf = (control: HTMLElement) => Math.round(control.offsetTop / rowHeight)

			const buckets = [...new Set(controls.map(bucketOf))].sort((a, b) => a - b)

			const rects = controls.map((control) => ({
				row: buckets.indexOf(bucketOf(control)),
				right: control.offsetLeft + control.offsetWidth,
			}))

			setVisible(visibleLegendCount(rects, maxRows, ghost.clientWidth, OVERFLOW_CHIP_RESERVE))
		}

		measure()

		const observer = new ResizeObserver(measure)

		observer.observe(ghost)

		return () => observer.disconnect()
	}, [ghostRef, count, maxRows])

	// Never exceed the real count — a stale larger measurement (a control removed
	// between renders) can't over-slice the list.
	return maxRows === undefined ? count : Math.min(visible, count)
}

/** The stable empty set a legend without a reference toggle reads for its off chips. @internal */
const EMPTY_HIDDEN: ReadonlySet<number> = new Set()

/** Props for {@link ChartLegendEntry}. @internal */
type ChartLegendEntryProps = {
	item: ChartLegendItem
	/** The series is toggled off — strike the label and dim the swatch. */
	off: boolean
	/** Panel layout: the entry stretches full-width and left-justifies its content. */
	panel: boolean
	/** The `texture` prop is on, so the square swatch hatches in every mode. */
	texture: boolean
	/** Toggles this entry's series on or off. */
	onToggle: (index: number) => void
	/** Pointer enter/leave emphasis: the series index while pointed, `null` on leave. */
	onPointerEmphasis: (index: number | null) => void
	/** Focus/blur emphasis, resolved through the shared `:focus-visible` gate. */
	onFocusEmphasis: () => void
	/**
	 * Render for measurement only — the invisible ghost row a capped band packs
	 * against: a distinct `chart-legend-ghost` slot (so it never double-counts with
	 * the interactive row) and no reveal tooltip, but the same box, so its width is
	 * the entry's own.
	 * @defaultValue false
	 */
	ghost?: boolean
}

/**
 * One legend entry: a series switch whose label truncates
 * to one line so a side panel's static width can't force the row to overflow, with
 * a hover/focus tooltip that reveals the full label once the column clips it.
 * `-webkit-line-clamp` was the first pass, but its legacy box model centers a
 * clamped line that had to wrap internally before being cut — pulling a long label
 * away from its swatch — so a plain single-line `truncate` (`nowrap` + ellipsis)
 * stands in instead; it never wraps, so nothing is left to center.
 *
 * @remarks The tooltip wraps the whole control rather than the label span: a
 * switch is a {@link Button}, whose {@link TouchTarget} hit-area overlay captures
 * pointer events and forwards them to the button by bubbling, so a tooltip
 * anchored to an inner span would never see the hover. Overflow is still measured
 * on the label span through the shared {@link useTruncation} detector — the same
 * measure the grid's cells use — and the closed (untruncated) tooltip renders no
 * surface, so a fitting entry adds no DOM.
 * @internal
 */
function ChartLegendEntry({
	item,
	off,
	panel,
	texture,
	onToggle,
	onPointerEmphasis,
	onFocusEmphasis,
	ghost = false,
}: ChartLegendEntryProps) {
	const [labelRef, truncated] = useTruncation<HTMLSpanElement>()

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

			<span ref={labelRef} className="block min-w-0 truncate">
				<Text
					as="span"
					severity="muted"
					size="sm"
					className={cn('text-left leading-tight', off && 'line-through opacity-60')}
				>
					{item.label}
				</Text>
			</span>

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

	// Every entry is a switch, a lone series included: toggling the only one off
	// empties the chart by design — the legend, forced on for a lone series, holds
	// the switch that brings it back. Emphasis has no sibling marks to dim then, so
	// it reads as a harmless no-op rather than a reason to drop the button.
	const control = (
		<Button
			size="sm"
			variant="plain"
			data-slot={ghost ? 'chart-legend-ghost' : 'chart-legend-item'}
			block={panel}
			// Button's own base centers its content; a panel entry stretches to
			// `w-full` so every row can align its swatch to the same edge, not center
			// a shorter row's content under a longer one's.
			className={cn(panel && 'min-w-0 justify-start')}
			aria-pressed={!off}
			onClick={() => onToggle(item.index)}
			onPointerEnter={() => onPointerEmphasis(item.index)}
			onPointerLeave={() => onPointerEmphasis(null)}
			// Focus and blur resolve through the same path as hover: a keyboard focus
			// (`:focus-visible`, the same gate the ring rides) emphasises, while a
			// pointer click's ring-less focus — or the focus a backgrounded tab re-fires
			// on return — resolves to nothing.
			onFocus={onFocusEmphasis}
			onBlur={onFocusEmphasis}
		>
			{content}
		</Button>
	)

	// The ghost measures width alone, so it skips the reveal tooltip; the visible
	// entry wears it, opening only while the label actually clips.
	if (ghost) return control

	return (
		<Tooltip enabled={truncated}>
			<TooltipTrigger>{control}</TooltipTrigger>

			<TooltipContent>{item.label}</TooltipContent>
		</Tooltip>
	)
}

/** Props for {@link ChartLegendOverflowSwitch}. @internal */
type ChartLegendOverflowSwitchProps = {
	item: ChartLegendItem
	/** The series is toggled off — strike the label and dim the swatch. */
	off: boolean
	/** The `texture` prop is on, so the square swatch hatches in every mode. */
	texture: boolean
	/** Toggles this entry's series on or off. */
	onToggle: (index: number) => void
	/** Pointer enter/leave emphasis: the series index while pointed, `null` on leave. */
	onEmphasis: (index: number | null) => void
}

/**
 * One switch in the `+N` overflow popover: the same series toggle and
 * hover-emphasis as a row entry, but with the full label and none of the row's
 * reveal-tooltip machinery. The popover is a roomy surface with no width
 * pressure, so nothing needs clipping — and the row's per-commit {@link
 * useTruncation} layout read would thrash against the floating surface's own
 * resize and reposition observers, a measure-perturbs-layout cycle that never
 * settles. A plain switch sidesteps it: the label wraps if long, and a deep
 * overflow scrolls rather than paginating.
 *
 * @internal
 */
function ChartLegendOverflowSwitch({
	item,
	off,
	texture,
	onToggle,
	onEmphasis,
}: ChartLegendOverflowSwitchProps) {
	return (
		<Button
			size="sm"
			variant="plain"
			data-slot="chart-legend-item"
			block
			className="min-w-0 justify-start"
			aria-pressed={!off}
			onClick={() => onToggle(item.index)}
			onPointerEnter={() => onEmphasis(item.index)}
			onPointerLeave={() => onEmphasis(null)}
		>
			<ChartSwatch
				swatch={item.swatch}
				swatchClass={item.swatchClass}
				swatchColor={item.swatchColor}
				color={item.color}
				dashed={item.dashed}
				active={texture}
				off={off}
			/>

			<Text
				as="span"
				severity="muted"
				size="sm"
				className={cn('min-w-0 text-left leading-tight', off && 'line-through opacity-60')}
			>
				{item.label}
			</Text>
		</Button>
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
 * One legend entry for a reference line — a switch keyed to the rule the way a
 * series entry keys to its marks: the rule's label (or its value, unlabelled)
 * beside a line swatch in the rule's colour. Clicking it toggles the rule off,
 * pulling it from the plot, the domain, and the keyboard roving; pointing or
 * keyboard-focusing a still-shown chip recedes the marks to its rule, the same
 * emphasis as pointing the rule itself. {@link ChartReferenceList} carries the
 * value parity beside the data table.
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
	 * The reference-line entries, drawn after the series switches as their own
	 * switches. Empty — the default — draws none.
	 */
	references?: ChartLegendReference[]
	/** Item indexes toggled off; their marks are hidden and their text struck through. */
	hidden: ReadonlySet<number>
	/**
	 * Reference indexes toggled off — struck through the way a hidden series
	 * entry is, and gated so an off chip's hover recedes nothing. Empty by default.
	 */
	referenceHidden?: ReadonlySet<number>
	/** Toggles an item's series on or off. */
	onToggle: (index: number) => void
	/** Toggles a reference rule on or off by its index; omitted, the chips are static. */
	onToggleReference?: (index: number) => void
	/** Emphasises an item's series (`null` clears); other marks dim while set. */
	onFocus: (index: number | null) => void
	/**
	 * Lay the entries out as a single column rather than the centered wrap
	 * row — the side rail beside a pie or donut. Reserves a rail that scales with
	 * the chart's container (`min(16rem, 40cqw)`, once it has room for it at `@sm`)
	 * so the legend never dominates the plot, centers the left-aligned entry block
	 * within it, and past five switches paginates them instead of clipping the
	 * column.
	 */
	panel?: boolean
	/** The `texture` prop is on, so square swatches hatch in every mode, mirroring the marks. */
	texture?: boolean
	/**
	 * The stacked (wrap-row) band's row cap from the frame's tier: past it the
	 * overflow controls collapse into a `+N` chip opening the rest as a popover
	 * switchboard, so the band never takes unbounded height from the aspect box and
	 * never silently clips. Ignored by a side panel (it paginates instead); unset or
	 * `0` applies no cap — the row grows freely (a spark frame passes `0`, its
	 * chrome dropped elsewhere).
	 */
	maxRows?: number
}

/** The switches and chips split into the run that shows and the overflow the `+N` chip holds. @internal */
type LegendSplit = {
	shownItems: ChartLegendItem[]
	shownReferences: ChartLegendReference[]
	overflowItems: ChartLegendItem[]
	overflowReferences: ChartLegendReference[]
}

/**
 * Splits the switches and chips into the run that shows and the overflow the
 * `+N` chip holds, cutting across the switches then the chips in render order so
 * the first `visibleCount` controls show. Uncapped, everything shows — the
 * paginated page a side panel passes as `pageItems` — and nothing overflows.
 *
 * @internal
 */
function splitLegend(
	items: ChartLegendItem[],
	references: ChartLegendReference[],
	pageItems: ChartLegendItem[],
	capped: boolean,
	visibleCount: number,
): LegendSplit {
	if (!capped) {
		return {
			shownItems: pageItems,
			shownReferences: references,
			overflowItems: [],
			overflowReferences: [],
		}
	}

	const shownItemCount = Math.min(visibleCount, items.length)

	const shownReferenceCount = Math.max(0, visibleCount - items.length)

	return {
		shownItems: items.slice(0, shownItemCount),
		shownReferences: references.slice(0, shownReferenceCount),
		overflowItems: items.slice(shownItemCount),
		overflowReferences: references.slice(shownReferenceCount),
	}
}

/**
 * The legend — the dependable identity channel for the series, and the chart's
 * series switchboard: pointing (or keyboard-focusing) an entry dims every other
 * series, clicking toggles its series off. The switches are plain HTML buttons
 * outside the `role="img"` region, so assistive tech reads and operates them;
 * swatches carry the colour, the text stays in ink. Every entry switches, a lone
 * series included — toggling the only one off empties the chart by design, with
 * the forced-on legend holding the switch that brings it back, and emphasis a
 * no-op with no sibling marks to dim.
 *
 * @remarks The row is one Tab stop; the arrow keys
 * rove between the switches (Home / End jump to the ends) and Escape drops
 * focus, clearing the emphasis. Pointer and keyboard share the one emphasis
 * slot: the pointed-at entry wins, and leaving it reverts to a still-held
 * keyboard focus rather than clearing. That focus side rides `:focus-visible`,
 * the same gate as the ring, so a pointer click's lingering focus — or the
 * focus a backgrounded tab re-fires on return — dims nothing without a visible
 * ring to explain it. Reference lines follow the entries as their own switches:
 * clicking one toggles its rule off, and pointing or focusing a still-shown chip
 * recedes the marks to its rule (the whole-marks equivalent of a series entry's
 * dim); an off chip's hover recedes nothing, since its rule is gone.
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
	referenceHidden = EMPTY_HIDDEN,
	onToggle,
	onToggleReference,
	onFocus,
	panel = false,
	texture = false,
	maxRows,
}: ChartLegendProps) {
	const ref = useRef<HTMLDivElement>(null)

	const ghostRef = useRef<HTMLDivElement>(null)

	const [page, setPage] = useState(0)

	// Only a side panel clips vertically — the wrap row just grows. Past one
	// page, the column trades clipping for a prev/next page instead.
	const paginate = panel && items.length > PAGE_SIZE

	const pageCount = paginate ? Math.ceil(items.length / PAGE_SIZE) : 1

	const currentPage = Math.min(page, pageCount - 1)

	const pageItems = paginate
		? items.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)
		: items

	// The stacked wrap row caps to the tier's row budget, folding the rest into a
	// `+N` chip; a side panel paginates instead, and an unset or zero budget (a
	// spark frame passes zero) lets the row grow freely.
	const capped = !panel && maxRows !== undefined && maxRows > 0

	// How many of the switches and chips together show before the `+N` chip,
	// measured off the ghost row that always holds them all; the full count when
	// nothing caps.
	const visibleCount = useLegendFit(
		ghostRef,
		items.length + references.length,
		capped ? maxRows : undefined,
	)

	// The cut runs across the switches then the chips in render order: the first
	// `visibleCount` controls show, the rest fold into the chip. A side panel shows
	// its paginated page instead; an uncapped row shows everything.
	const { shownItems, shownReferences, overflowItems, overflowReferences } = splitLegend(
		items,
		references,
		pageItems,
		capped,
		visibleCount,
	)

	const overflowCount = overflowItems.length + overflowReferences.length

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
	// entry, which carries the rule index the emphasis keys off. An off chip names a
	// pulled rule, so it holds focus after a keyboard toggle but recedes nothing.
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

		const focusedIndex = position === -1 ? null : (references[position]?.index ?? null)

		setReferenceActive(
			focusedIndex !== null && !referenceHidden.has(focusedIndex) ? focusedIndex : null,
		)
	}

	// The row is a toolbar — one Tab stop, arrow-key roving, Escape to drop focus —
	// whenever it holds a focusable control: the series switches (every entry is
	// one, a lone series included), or the reference chips, which recede the marks
	// on hover or focus.
	const interactive = items.length > 0 || references.length > 0

	// A side panel stacks its controls in a column, so the arrows that rove them
	// follow the layout — Up/Down down the panel, Left/Right across the wrap row.
	const orientation = panel ? 'vertical' : 'horizontal'

	// Rove across the focusable controls — series switches and reference chips
	// alike — sharing the one Tab stop the toolbar exposes.
	const onKeyDown = useA11yRoving(ref, {
		itemSelector:
			'button[data-slot="chart-legend-item"], button[data-slot="chart-legend-reference"]',
		orientation,
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
	// present whenever the row holds a focusable control, absent for an empty
	// grouping div with no interaction.
	const toolbarProps = interactive
		? ({ role: 'toolbar', 'aria-orientation': orientation, onKeyDown: handleKeyDown } as const)
		: {}

	// One series switch, in the visible row or the invisible ghost that measures
	// the cut — the same box either way, so the ghost's width is the entry's own.
	const renderEntry = (item: ChartLegendItem, ghost: boolean) => (
		<ChartLegendEntry
			key={item.index}
			item={item}
			off={hidden.has(item.index)}
			panel={panel}
			texture={texture}
			ghost={ghost}
			onToggle={onToggle}
			onPointerEmphasis={(index) => {
				hovered.current = index

				syncEmphasis()
			}}
			onFocusEmphasis={syncEmphasis}
		/>
	)

	// One reference chip, likewise in the visible row or the ghost. A reference
	// chip is a switch keyed to its rule the way a series entry is to its marks:
	// clicking toggles the rule off, and pointing or focusing a still-shown chip
	// recedes the marks to it through the shared reference emphasis. An off chip
	// strikes its label and dims its swatch — the same off treatment a series entry
	// takes — and its pointer / focus path recedes nothing, since its rule is gone.
	// The slot colour rides its currentColor class; a raw colour rides an inline
	// style; and the line swatch dashes to match the rule unless it is drawn solid.
	// The ghost copy measures width alone, so it drops the handlers its inert row
	// would never fire and takes a distinct slot so it never double-counts.
	const renderReference = (reference: ChartLegendReference, ghost: boolean) => {
		const off = referenceHidden.has(reference.index)

		return (
			<Button
				key={`reference:${reference.index}`}
				size="sm"
				variant="plain"
				data-slot={ghost ? 'chart-legend-reference-ghost' : 'chart-legend-reference'}
				aria-pressed={!off}
				{...(ghost
					? {}
					: {
							onClick: () => {
								onToggleReference?.(reference.index)

								// Drive the recede to the toggle's resulting state directly: off
								// pulls the rule so nothing recedes, on emphasises the chip the
								// pointer or keyboard focus still holds. Setting it here — rather
								// than through syncReference — sidesteps the toggle's
								// not-yet-applied hidden set.
								const active = off ? reference.index : null

								referencePointed.current = active

								setReferenceActive(active)
							},
							onPointerEnter: () => {
								referencePointed.current = off ? null : reference.index

								syncReference()
							},
							onPointerLeave: () => {
								referencePointed.current = null

								syncReference()
							},
							onFocus: syncReference,
							onBlur: syncReference,
						})}
			>
				<Swatch
					shape="line"
					variant={reference.dashed === false ? 'solid' : 'dashed'}
					color={reference.swatchClass || undefined}
					style={reference.color ? { color: reference.color } : undefined}
					className={cn(off && 'opacity-60')}
				/>

				<Text
					as="span"
					severity="muted"
					size="sm"
					className={cn('text-left leading-tight', off && 'line-through opacity-60')}
				>
					{reference.label}
				</Text>
			</Button>
		)
	}

	// The shown switches, an optional pagination row, the shown reference chips,
	// and — once the cap trims the row — the `+N` chip that opens the rest as a
	// popover switchboard. Rendered inline in the wrap row; in panel mode they nest
	// in a shrink-to-content, left-aligned inner block so the reserved column can
	// center that block rather than pin it to the plot.
	const legendBody = (
		<>
			{shownItems.map((item) => renderEntry(item, false))}

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

			{shownReferences.map((reference) => renderReference(reference, false))}

			{overflowCount > 0 && (
				// The overflow chip: a switch-count badge opening the trimmed controls as
				// a scrolling switchboard, so every switch past the cap stays one click
				// away rather than clipping out of sight — the popover floats free of the
				// aspect box the row is bound to. `autoFocus` seats focus in the panel so a
				// keyboard open lands on the switches it just revealed.
				<Popover placement="bottom">
					<PopoverTrigger>
						<Button size="sm" variant="plain" aria-label={`Show ${overflowCount} more`}>
							<Text as="span" severity="muted" size="sm" className="tabular-nums">
								+{overflowCount}
							</Text>
						</Button>
					</PopoverTrigger>

					<PopoverContent autoFocus aria-label="More legend entries">
						<div
							data-slot="chart-legend-overflow"
							className="flex max-h-64 max-w-xs flex-col items-stretch gap-0.5 overflow-y-auto"
						>
							{overflowItems.map((item) => (
								<ChartLegendOverflowSwitch
									key={item.index}
									item={item}
									off={hidden.has(item.index)}
									texture={texture}
									onToggle={onToggle}
									onEmphasis={(index) => {
										hovered.current = index

										syncEmphasis()
									}}
								/>
							))}

							{overflowReferences.map((reference) => renderReference(reference, false))}
						</div>
					</PopoverContent>
				</Popover>
			)}
		</>
	)

	const legend = (
		<div
			ref={ref}
			data-slot="chart-legend"
			{...toolbarProps}
			className={cn(
				// The side panel reserves a rail that scales with the chart's own
				// container — `min(16rem, 40cqw)`, so it is at most a third-ish of a wide
				// chart and shrinks in a narrow one rather than a fixed column that would
				// dominate — once the container has room for it (`@sm`, the same 384px the
				// tier reads as compact). It centers its entries — vertically down the
				// column so a legend stretched to the plot's full height reads level with
				// it, and horizontally so the left-aligned block sits centered in the
				// reserved width rather than pinned to the plot. Below that width the panel
				// stacks under the plot at full width. The wrap row centers its entries on
				// mobile and justifies them edge to edge from sm.
				panel
					? 'flex flex-col items-center justify-center @sm:w-[min(16rem,40cqw)] @sm:shrink-0'
					: 'flex flex-wrap items-center justify-center',
			)}
		>
			{panel ? (
				// The left-aligned entry block, shrink-wrapped to its content and capped at
				// the reserved column, so the column's `items-center` centers it while each
				// entry stretches to the block's width to share one swatch edge.
				<div
					data-slot="chart-legend-items"
					className="flex w-fit min-w-0 max-w-full flex-col items-start"
				>
					{legendBody}
				</div>
			) : (
				legendBody
			)}
		</div>
	)

	if (!capped) return legend

	// The cap measures an invisible ghost row that always holds every control, so
	// the cut is exact and never flashes on resize the way a measure-then-cut of the
	// visible row would. The ghost overlays the row from the top of a relative
	// wrapper and sits out of flow (`absolute`), so it adds no height; `inert` and
	// `invisible` keep it unpainted and out of the a11y tree while it still lays out
	// for measurement. It packs left (`justify-start`) so each control's right edge
	// reads as the width consumed on its row — what the fit math needs — rather than
	// a centered offset.
	return (
		<div className="relative w-full">
			<div
				ref={ghostRef}
				aria-hidden
				inert
				className="pointer-events-none invisible absolute inset-x-0 top-0 flex flex-wrap items-center justify-start"
			>
				{items.map((item) => renderEntry(item, true))}

				{references.map((reference) => renderReference(reference, true))}
			</div>

			{legend}
		</div>
	)
}
