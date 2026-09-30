'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type RefObject, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '../../../../components/button'
import { Icon } from '../../../../components/icon'
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/popover'
import { Swatch } from '../../../../components/swatch'
import { Text } from '../../../../components/text'
import { ariaAttr, cn, dataAttr } from '../../../../core'
import { useA11yRoving } from '../../../../hooks/a11y'
import type { ChartColorSlot } from '../../../../recipes/kata/chart'
import { ChartSwatch } from '../chart-pattern-defs'
import { useChartReferencePoint, useChartSeriesFocus } from '../context'
import { OVERFLOW_CHIP_RESERVE, visibleLegendCount } from './fit'
import { type LegendEmphasis, LegendSwitch, useLegendEmphasis } from './legend-switch'

/** Entries per page once a side panel's switches would clip vertically. @internal */
const PAGE_SIZE = 5

/**
 * How many of a stacked band's controls fit within `maxRows` rows before the
 * rest collapse into a `+N` chip. Measures an invisible ghost row that always
 * holds every control. The cut is therefore exact, and never flashes on resize
 * the way a measure-then-cut of the visible row would. It reads each control's
 * wrapped row and right edge, and packs them through {@link visibleLegendCount}.
 * Returns the full `count` when nothing caps (no ghost, no measurement), so an
 * uncapped or side-panel legend pays nothing.
 *
 * @param labels - The labels of every control in render order, joined. A change
 * of them measures again.
 * @returns The ref of the ghost, and the count of controls that show.
 * @internal
 */
function useLegendFit(
	labels: string,
	count: number,
	maxRows: number | undefined,
): [RefObject<HTMLDivElement | null>, number] {
	const ghostRef = useRef<HTMLDivElement>(null)

	const [visible, setVisible] = useState(count)

	// A layout effect, so the first cut lands before paint — the visible row never
	// flashes its full height then collapses. The ghost holds every control at all
	// times, so the observer refits on resize from a stable measurement rather than
	// the already-cut visible row, which could never reveal that a widened box now
	// fits more. A resize alone can miss an added entry that lands on an existing
	// row without growing the ghost, or a relabel that keeps the ghost's box but
	// moves the wraps. Either one changes `labels`, and the fit measures again.
	useLayoutEffect(() => {
		const ghost = ghostRef.current

		// No labels means no controls, so there is nothing to measure.
		if (!ghost || maxRows === undefined || labels === '') return

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
	}, [labels, maxRows])

	// Never exceed the real count — a stale larger measurement (a control removed
	// between renders) can't over-slice the list.
	return [ghostRef, maxRows === undefined ? count : Math.min(visible, count)]
}

/** The labels of every legend control in render order, joined, so the fit measures again on a change. @internal */
function controlLabels(
	items: readonly ChartLegendItem[],
	references: readonly ChartLegendReference[],
): string {
	return [...items, ...references].map((control) => control.label).join('\u0000')
}

/** The stable empty set a legend without a reference toggle reads for its off chips. @internal */
const EMPTY_HIDDEN: ReadonlySet<number> = new Set()

/** Props for {@link ChartLegendSwatch}. @internal */
type ChartLegendSwatchProps = {
	item: ChartLegendItem
	/** The series is toggled off, so the swatch dims. */
	off: boolean
	/** The `texture` prop is on, so the square swatch hatches in every mode. */
	texture: boolean
}

/**
 * The key of a series switch: the {@link ChartSwatch} that mirrors the marks of
 * the series. The row entry and the overflow switch use it.
 *
 * @internal
 */
function ChartLegendSwatch({ item, off, texture }: ChartLegendSwatchProps) {
	return (
		<ChartSwatch
			swatch={item.swatch}
			swatchClass={item.swatchClass}
			swatchColor={item.swatchColor}
			color={item.color}
			dashed={item.dashed}
			active={texture}
			off={off}
		/>
	)
}

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
	/** The legend's shared pointer and focus emphasis. */
	emphasis: LegendEmphasis<number>
	/**
	 * Renders for measurement only. It is the invisible ghost row a capped band
	 * packs against. It carries a distinct `chart-legend-ghost` slot, so it never
	 * double-counts with the interactive row. It has no reveal tooltip, but the same
	 * box, so its width is the entry's own.
	 * @defaultValue false
	 */
	ghost?: boolean
}

/**
 * One legend entry: a series {@link LegendSwitch} keyed by the swatch that
 * mirrors its marks. A panel entry stretches to the rail, so every row aligns
 * its swatch to the same edge.
 *
 * @remarks
 * Every entry is a switch, a lone series included. Toggling the only one off
 * empties the chart by design. The legend is forced on for a lone series, so it
 * holds the switch that brings the series back. Emphasis then has no sibling marks to
 * dim, so it does nothing.
 * @internal
 */
function ChartLegendEntry({
	item,
	off,
	panel,
	texture,
	onToggle,
	emphasis,
	ghost = false,
}: ChartLegendEntryProps) {
	return (
		<LegendSwitch
			slot={ghost ? 'chart-legend-ghost' : 'chart-legend-item'}
			off={off}
			label={item.label}
			ghost={ghost}
			className={cn(panel && 'w-full min-w-0 justify-start')}
			keys={<ChartLegendSwatch item={item} off={off} texture={texture} />}
			detail={
				item.detail && (
					<Text
						as="span"
						tone="muted"
						size="sm"
						className={cn('text-start leading-tight tabular-nums', off && 'opacity-60')}
					>
						{item.detail}
					</Text>
				)
			}
			onToggle={() => onToggle(item.index)}
			onPoint={(pointed) => emphasis.point(pointed ? item.index : null)}
			onFocusChange={emphasis.sync}
		/>
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
 * hover-emphasis as a row entry. It carries the full label, and none of the row's
 * reveal-tooltip machinery. The popover is a roomy surface with no width
 * pressure, so nothing needs clipping. The row's per-commit
 * {@link useTruncation} layout read would also thrash against the floating
 * surface's own resize and reposition observers. That is a measure-perturbs-layout
 * cycle that never settles. A plain switch sidesteps it: the label wraps if long,
 * and a deep overflow scrolls rather than paginating.
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
			type="button"
			size="sm"
			variant="plain"
			data-slot="chart-legend-item"
			className="w-full min-w-0 justify-start"
			aria-pressed={!off}
			onClick={() => onToggle(item.index)}
			onPointerEnter={() => onEmphasis(item.index)}
			onPointerLeave={() => onEmphasis(null)}
		>
			<ChartLegendSwatch item={item} off={off} texture={texture} />

			<Text
				as="span"
				tone="muted"
				size="sm"
				className={cn('min-w-0 text-start leading-tight', off && 'line-through opacity-60')}
			>
				{item.label}
			</Text>
		</Button>
	)
}

/** Props for {@link ChartLegendReferenceSwitch}. @internal */
type ChartLegendReferenceSwitchProps = {
	reference: ChartLegendReference
	/** The rule is toggled off: the label strikes through and the swatch dims. */
	off: boolean
	/** Toggles the rule on or off by its index. */
	onToggle: (index: number) => void
	/** The legend's shared pointer and focus emphasis of the rules. */
	emphasis: LegendEmphasis<number>
	/**
	 * Renders for measurement only, in the invisible ghost row. It carries a
	 * distinct `chart-legend-reference-ghost` slot and no handlers, so it never
	 * double-counts with the interactive row.
	 * @defaultValue false
	 */
	ghost?: boolean
}

/**
 * One reference chip: a switch keyed to its rule, as a series entry is keyed to
 * its marks. It shows the label of the rule beside a line swatch in the color of
 * the rule.
 *
 * @remarks
 * A click toggles the rule. A pointer or a keyboard focus on a chip that is on
 * recedes the marks to its rule, through the shared reference emphasis. A chip
 * that is off strikes its label and dims its swatch, as a series entry does. Its
 * rule is gone, so it recedes nothing. A palette slot inks the swatch through
 * its `currentColor` class, and a raw color inks it inline. The line dashes to
 * match the rule, unless the rule is solid.
 * @internal
 */
function ChartLegendReferenceSwitch({
	reference,
	off,
	onToggle,
	emphasis,
	ghost = false,
}: ChartLegendReferenceSwitchProps) {
	return (
		<Button
			type="button"
			size="sm"
			variant="plain"
			data-slot={ghost ? 'chart-legend-reference-ghost' : 'chart-legend-reference'}
			aria-pressed={!off}
			{...(ghost
				? {}
				: {
						onClick: () => onToggle(reference.index),
						onPointerEnter: () => emphasis.point(reference.index),
						onPointerLeave: () => emphasis.point(null),
						onFocus: emphasis.sync,
						onBlur: emphasis.sync,
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
				tone="muted"
				size="sm"
				className={cn('text-start leading-tight', off && 'line-through opacity-60')}
			>
				{reference.label}
			</Text>
		</Button>
	)
}

/** One legend entry: the series name keyed by its mark-mirroring swatch. @internal */
export type ChartLegendItem = {
	/**
	 * The series' own index. The toggle, emphasis, and `hidden` set key off it, not
	 * the entry's position. The legend can therefore list its switches in a
	 * different order than the series, without misrouting a click or a color.
	 */
	index: number
	label: string
	/** currentColor class carrying the series color; empty for a raw color, which inks inline. */
	swatchClass: string
	/** A raw series color inked inline on the swatch's `currentColor`; unset for a palette slot. */
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
	/** The slot color, so a textured legend swatch mirrors the mark's tile; unset for a raw color. */
	color?: ChartColorSlot
	/** A trailing readout — the side panel carries each slice's live share. */
	detail?: string
}

/**
 * One legend entry for a reference line, a switch keyed to the rule the way a
 * series entry keys to its marks. It is the rule's label (or its value,
 * unlabeled) beside a line swatch in the rule's color. Clicking it toggles the
 * rule off, pulling it from the plot, the domain, and the keyboard roving.
 * Pointing or keyboard-focusing a still-shown chip recedes the marks to its rule,
 * the same emphasis as pointing the rule itself. {@link ChartReferenceList}
 * carries the value parity beside the data table.
 *
 * @internal
 */
export type ChartLegendReference = {
	/**
	 * The rule's own index in the chart's `reference` array. The emphasis keys off
	 * it, not the chip's position. A non-finite rule dropped from the chips
	 * therefore still lines the emphasis up with the rule the plot draws under that
	 * index.
	 */
	index: number
	label: string
	/** currentColor class carrying a palette slot's color; empty when {@link color} is set. */
	swatchClass: string
	/** A raw CSS color applied inline as currentColor; absent for a palette slot. */
	color?: string
	/**
	 * Whether the rule is dashed, so the chip's line swatch mirrors it — dashed by
	 * default, `false` only for a rule drawn solid.
	 * @defaultValue true
	 */
	dashed?: boolean
	/**
	 * Whether the plot draws the rule. A rule outside a pinned domain draws
	 * nothing, so its chip recedes nothing, as a chip that is off does.
	 * @defaultValue true
	 */
	drawn?: boolean
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
	/**
	 * Lay the entries out as a single column rather than the centered wrap
	 * row — the side rail beside a pie or donut. Reserves a rail that scales with
	 * the chart's container (`min(16rem, 40cqw)`, once it has room for it at
	 * `@sm`). The legend therefore never dominates the plot. It centers the
	 * left-aligned entry block within it. Past five switches it paginates them,
	 * instead of clipping the column.
	 */
	panel?: boolean
	/** The `texture` prop is on, so square swatches hatch in every mode, mirroring the marks. */
	texture?: boolean
	/**
	 * The stacked (wrap-row) band's row cap from the frame's tier. Past it the
	 * overflow controls collapse into a `+N` chip, opening the rest as a popover
	 * switchboard. The band therefore never takes unbounded height from the aspect
	 * box, and never silently clips. Ignored by a side panel, which paginates
	 * instead. Unset or `0` applies no cap, and the row grows freely. A spark frame
	 * passes `0`, its chrome dropped elsewhere.
	 */
	maxRows?: number
	/**
	 * Renders as a static key: the swatches and labels, but no series toggle,
	 * emphasis, or tab stop. It is the identity channel without the switchboard.
	 * @defaultValue false
	 */
	inert?: boolean
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
 * `+N` chip holds. It cuts across the switches then the chips in render order, so
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
 * series switchboard. Pointing (or keyboard-focusing) an entry dims every other
 * series, and clicking toggles its series off. The switches are plain HTML
 * buttons outside the `role="img"` region, so assistive tech reads and operates
 * them. Swatches carry the color, and the text stays in ink. Every entry
 * switches, a lone series included. Toggling the only one off empties the chart
 * by design, with the forced-on legend holding the switch that brings it back.
 * Emphasis is a no-op with no sibling marks to dim.
 *
 * @remarks The row is one Tab stop. The arrow keys rove between the switches
 * (Home / End jump to the ends), and Escape drops focus, clearing the emphasis.
 * Pointer and keyboard share the one emphasis slot: the pointed-at entry wins,
 * and leaving it reverts to a still-held keyboard focus rather than clearing.
 * That focus side rides `:focus-visible`, the same gate as the ring. A pointer
 * click's lingering focus therefore dims nothing without a visible ring to
 * explain it. So does the focus a backgrounded tab re-fires on return. Reference
 * lines follow the entries as their own switches. Clicking one toggles its rule
 * off. Pointing or focusing a still-shown chip recedes the marks to its rule, the
 * whole-marks equivalent of a series entry's dim. An off chip's hover recedes
 * nothing, since its rule is gone. {@link ChartReferenceList} still carries the
 * value parity. A panel past five switches pages instead of clipping. The visible
 * page still renders in `items` order, so the roving and emphasis wiring key off
 * its position there rather than the full list.
 * @internal
 */
export function ChartLegend({
	items,
	references = [],
	hidden,
	referenceHidden = EMPTY_HIDDEN,
	onToggle,
	onToggleReference,
	panel = false,
	texture = false,
	maxRows,
	inert = false,
}: ChartLegendProps) {
	const ref = useRef<HTMLDivElement>(null)

	const [page, setPage] = useState(0)

	// Only a side panel clips vertically — the wrap row just grows. Past one
	// page, the column trades clipping for a prev/next page instead.
	const paginate = panel && items.length > PAGE_SIZE

	const pageCount = paginate ? Math.ceil(items.length / PAGE_SIZE) : 1

	const currentPage = Math.min(page, pageCount - 1)

	const firstPage = currentPage === 0

	const lastPage = currentPage === pageCount - 1

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
	const [ghostRef, visibleCount] = useLegendFit(
		controlLabels(items, references),
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

	// The frame owns the series emphasis, so a hover renders the frame and not the
	// chart body. The setter keeps its identity.
	const onFocus = useChartSeriesFocus()

	// The pointed entry wins, else the keyboard-focused one. Buttons render in
	// `pageItems` order, so a focused button's position names its entry there. The
	// entry carries the series index that the emphasis keys off, which the display
	// order of the legend need not match.
	const emphasis = useLegendEmphasis(
		ref,
		'button[data-slot="chart-legend-item"]',
		(position) => pageItems[position]?.index ?? null,
		onFocus,
	)

	// The reference chips share the recede with the reference rules: a chip's hover
	// or keyboard focus recedes the data marks and the rule's siblings to it, the
	// same emphasis as pointing the rule. Present whenever the legend is inside a
	// chart.
	const setReferenceActive = useChartReferencePoint()

	// The chips take the same pointer and focus rule as the series switches. Chips
	// render in `references` order, so a focused chip's position names its entry.
	// The entry carries the index of the rule in the chart's `reference` array. The
	// emphasis therefore lands on the rule the plot draws, even past a non-finite
	// rule that the chips skip. A chip that is off names a pulled rule, so it is not
	// live and recedes nothing.
	const referenceEmphasis = useLegendEmphasis(
		ref,
		'button[data-slot="chart-legend-reference"]',
		(position) => references[position]?.index ?? null,
		setReferenceActive,
		(index) =>
			!referenceHidden.has(index) &&
			references.find((reference) => reference.index === index)?.drawn !== false,
	)

	// A toggle sets the recede to the state it leaves. The hidden set of this
	// render is the state before the toggle, so the emphasis cannot read it. A rule
	// that comes back recedes the marks to it, because the pointer or the keyboard
	// focus is still on its chip. A rule that goes recedes nothing.
	const toggleReference = (index: number) => {
		const off = referenceHidden.has(index)

		onToggleReference?.(index)

		setReferenceActive(off ? index : null)
	}

	// Escape closes the overflow popover and unmounts the switch under a resting
	// pointer, so no `pointerleave` reaches it. The close therefore clears the
	// pointed switch of both emphases.
	const onOverflowOpenChange = (open: boolean) => {
		if (open) return

		emphasis.point(null)

		referenceEmphasis.point(null)
	}

	// The row is a toolbar — one Tab stop, arrow-key roving, Escape to drop focus —
	// whenever it holds a focusable control: the series switches (every entry is
	// one, a lone series included), or the reference chips, which recede the marks
	// on hover or focus. An inert legend holds none, so it drops the toolbar role
	// with the rest of its interactivity.
	const interactive = !inert && (items.length > 0 || references.length > 0)

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
		escapeBlurs: true,
	})

	// The toolbar role, its orientation, and the roving handler travel together:
	// present whenever the row holds a focusable control, absent for an empty
	// grouping div with no interaction.
	const toolbarProps = interactive
		? ({
				role: 'toolbar',
				'aria-label': 'Legend',
				'aria-orientation': orientation,
				onKeyDown,
			} as const)
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
			emphasis={emphasis}
		/>
	)

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
					{/* A button at the end of the range announces `aria-disabled` and ignores
					    the press. A native `disabled` drops the focus to the body. */}
					<Button
						type="button"
						size="sm"
						variant="plain"
						aria-label="Previous legend entries"
						aria-disabled={ariaAttr(firstPage)}
						data-disabled={dataAttr(firstPage)}
						onClick={() => {
							if (!firstPage) setPage(currentPage - 1)
						}}
					>
						<Icon icon={<ChevronLeft />} className="rtl:-scale-x-100" />
					</Button>

					<Text as="span" tone="muted" size="sm" className="tabular-nums">
						{currentPage + 1} / {pageCount}
					</Text>

					<Button
						type="button"
						size="sm"
						variant="plain"
						aria-label="Next legend entries"
						aria-disabled={ariaAttr(lastPage)}
						data-disabled={dataAttr(lastPage)}
						onClick={() => {
							if (!lastPage) setPage(currentPage + 1)
						}}
					>
						<Icon icon={<ChevronRight />} className="rtl:-scale-x-100" />
					</Button>
				</div>
			)}

			{shownReferences.map((reference) => (
				<ChartLegendReferenceSwitch
					key={`reference:${reference.index}`}
					reference={reference}
					off={referenceHidden.has(reference.index)}
					onToggle={toggleReference}
					emphasis={referenceEmphasis}
				/>
			))}

			{overflowCount > 0 && (
				// The overflow chip: a switch-count badge opening the trimmed controls as
				// a scrolling switchboard, so every switch past the cap stays one click
				// away rather than clipping out of sight — the popover floats free of the
				// aspect box the row is bound to. `autoFocus` seats focus in the panel so a
				// keyboard open lands on the switches it just revealed.
				<Popover placement="bottom" onOpenChange={onOverflowOpenChange}>
					<PopoverTrigger>
						<Button
							type="button"
							size="sm"
							variant="plain"
							aria-label={`Show ${overflowCount} more`}
						>
							<Text as="span" tone="muted" size="sm" className="tabular-nums">
								+{overflowCount}
							</Text>
						</Button>
					</PopoverTrigger>

					<PopoverContent autoFocus aria-label="More legend entries">
						<div
							data-slot="chart-legend-overflow"
							// The popover is outside the legend, so it caps the hit areas of
							// its entries at its own gap (`TouchTarget`).
							className="flex max-h-64 max-w-xs flex-col items-stretch gap-0.5 overflow-y-auto [--touch-target-gap-y:--spacing(0.5)]"
						>
							{overflowItems.map((item) => (
								<ChartLegendOverflowSwitch
									key={item.index}
									item={item}
									off={hidden.has(item.index)}
									texture={texture}
									onToggle={onToggle}
									onEmphasis={emphasis.point}
								/>
							))}

							{overflowReferences.map((reference) => (
								<ChartLegendReferenceSwitch
									key={`reference:${reference.index}`}
									reference={reference}
									off={referenceHidden.has(reference.index)}
									onToggle={toggleReference}
									emphasis={referenceEmphasis}
								/>
							))}
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
			// A static key: the HTML `inert` attribute takes the whole subtree out of
			// the tab order and off the pointer in one place — the switches keep their
			// look but shed the click, hover, and focus, no per-control gating. The
			// series names still reach assistive tech through the chart's data table.
			inert={inert}
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
				// stacks under the plot at full width. The wrap row centers its entries at
				// all widths.
				panel
					? 'flex flex-col items-center justify-center @sm:w-[min(16rem,40cqw)] @sm:shrink-0'
					: 'flex flex-wrap items-center justify-center',
				// The entries touch on both axes, so each hit area keeps to its entry
				// (`TouchTarget`), and two adjacent entries do not overlap.
				'[--touch-target-gap-x:0px] [--touch-target-gap-y:0px]',
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
	// for measurement. A hidden box still takes its space, and the ghost holds many
	// rows. A box of zero height clips it, so it adds no scroll range below the
	// chart. The row inside keeps its full height, which the fit observes. It packs
	// left (`justify-start`) so each control's right edge reads as the width
	// consumed on its row — what the fit math needs — rather than a centered offset.
	return (
		<div className="relative w-full">
			<div
				aria-hidden
				inert
				className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden"
			>
				<div ref={ghostRef} className="flex flex-wrap items-center justify-start">
					{items.map((item) => renderEntry(item, true))}

					{references.map((reference) => (
						<ChartLegendReferenceSwitch
							key={`reference:${reference.index}`}
							reference={reference}
							off={referenceHidden.has(reference.index)}
							ghost
							onToggle={toggleReference}
							emphasis={referenceEmphasis}
						/>
					))}
				</div>
			</div>

			{legend}
		</div>
	)
}
