'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
	type ComponentProps,
	memo,
	type ReactNode,
	type RefObject,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { Button } from '../../../../components/button'
import { Icon } from '../../../../components/icon'
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/popover'
import { Swatch } from '../../../../components/swatch'
import { Text } from '../../../../components/text'
import { ariaAttr } from '../../../../core/aria-attr'
import { cn } from '../../../../core/cn'
import { dataAttr } from '../../../../core/data-attr'
import { isRtl } from '../../../../hooks/a11y/logical-arrow'
import { useA11yRoving } from '../../../../hooks/a11y/use-a11y-roving'
import { useReportedChange } from '../../../../hooks/use-reported-change'
import { useStableEvent } from '../../../../hooks/use-stable-event'
import { useIntl } from '../../../../primitives/intl/use-intl'
import type { ChartColorSlot } from '../../../../recipes/kata/chart'
import type { Orientation } from '../../../../types/orientation'
import { focusDropped } from '../../../../utilities/focus-dropped'
import { observeResizeBeforePaint } from '../../../../utilities/observe-resize-before-paint'
import { chartMessages } from '../chart-messages'
import { ChartSwatch } from '../chart-pattern-defs'
import { useChartActions } from '../context'
import { OVERFLOW_CHIP_RESERVE, visibleLegendCount } from './fit'
import { LEGEND_TOUCH_ROWS, LegendSwitch } from './legend-switch'
import { type LegendEmphasis, useLegendEmphasis } from './use-legend-emphasis'

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
 * A new cut can unmount the control that holds the focus: a switch folds into
 * the `+N` chip, or the chip goes when every control fits. The focus would then
 * fall to the document body. The hook keeps the focused control of the row
 * before each cut, and calls `onFocusLost` after the commit when that control
 * is gone.
 *
 * @param labels - The labels of every control in render order, joined. A change
 * of them measures again.
 * @param row - The visible row, whose focus a cut can drop.
 * @param onFocusLost - Moves the focus after a cut unmounted the focused control.
 * @returns The ref of the ghost, and the count of controls that show.
 * @internal
 */
function useLegendFit(
	labels: string,
	count: number,
	maxRows: number | undefined,
	row: RefObject<HTMLElement | null>,
	onFocusLost: () => void,
): [RefObject<HTMLDivElement | null>, number] {
	const ghostRef = useRef<HTMLDivElement>(null)

	const [visible, setVisible] = useState(count)

	// The control of the row that held the focus when the last cut was set, and
	// that cut.
	const held = useRef<{ control: Element; cut: number } | null>(null)

	// The cut commits before this effect runs, so a control that it unmounted is
	// disconnected here, and the focus is on the body.
	useLayoutEffect(() => {
		if (held.current?.cut !== visible) return

		const { control } = held.current

		held.current = null

		if (control.isConnected) return

		if (focusDropped()) onFocusLost()
	}, [visible, onFocusLost])

	// A layout effect, so the first cut lands before paint: the visible row never
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

		const holdFocus = (cut: number) => {
			const active = document.activeElement

			held.current =
				active !== null && row.current?.contains(active) ? { control: active, cut } : null
		}

		const fit = () => {
			const controls = [...ghost.querySelectorAll<HTMLElement>('button')]

			// A wrapped control drops about a full control-height; a swatch-vs-chip
			// baseline nudge within a row is a pixel or two (the row centers its
			// controls, so a shorter one sits a hair lower). Bucket each top to the
			// nearest control-height so a sub-row offset never reads as its own row and
			// overflows a control that visually fits, then rank the distinct buckets
			// into row indices, so a non-uniform pitch a fixed divisor drifts on still
			// orders correctly.
			const rowHeight = controls[0]?.offsetHeight || 1

			const getBucket = (control: HTMLElement) => Math.round(control.offsetTop / rowHeight)

			const buckets = [...new Set(controls.map(getBucket))].sort((a, b) => a - b)

			// The row packs from its inline start, which is the right edge in RTL.
			// The offset parent of each control is the wrapper of the ghost, which
			// has the width of the ghost.
			const rtl = isRtl(ghost)

			const rects = controls.map((control) => ({
				row: buckets.indexOf(getBucket(control)),
				right: rtl
					? ghost.clientWidth - control.offsetLeft
					: control.offsetLeft + control.offsetWidth,
			}))

			return visibleLegendCount(rects, maxRows, ghost.clientWidth, OVERFLOW_CHIP_RESERVE)
		}

		let shown = fit()

		holdFocus(shown)

		setVisible(shown)

		// A resize commits the cut before the paint, so the frame that narrows the box does
		// not wrap the row past `maxRows`.
		return observeResizeBeforePaint(ghost, () => {
			const next = fit()

			if (next === shown) return

			shown = next

			return () => {
				holdFocus(next)

				setVisible(next)
			}
		})
	}, [labels, maxRows, row])

	// Never exceed the real count: a stale larger measurement (a control removed
	// between renders) can't over-slice the list.
	return [ghostRef, maxRows === undefined ? count : Math.min(visible, count)]
}

/** The series switches and reference chips of a row, in render order. @internal */
const ROW_CONTROLS =
	'button[data-slot="chart-legend-item"], button[data-slot="chart-legend-reference"]'

/** The stable empty list of chips of a legend that shows its rules as notes. @internal */
const NO_REFERENCES: ChartLegendReference[] = []

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
			hollow={item.hollow}
			active={texture}
			off={off}
		/>
	)
}

/** Props for {@link ChartLegendEntry}. @internal */
type ChartLegendEntryProps = ChartLegendItem & {
	/** The series is toggled off: strike the label and dim the swatch. */
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
 *
 * The entry takes the fields of its item as props. Each body run of a chart
 * makes new items, so a new item with the same content renders nothing.
 * @internal
 */
const ChartLegendEntry = memo(function ChartLegendEntry({
	off,
	panel,
	texture,
	onToggle,
	emphasis,
	ghost = false,
	...item
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
})

/** Props for {@link ChartLegendOverflowSwitch}. @internal */
type ChartLegendOverflowSwitchProps = {
	item: ChartLegendItem
	/** The series is toggled off: strike the label and dim the swatch. */
	off: boolean
	/** The `texture` prop is on, so the square swatch hatches in every mode. */
	texture: boolean
	/** Toggles this entry's series on or off. */
	onToggle: (index: number) => void
	/** The legend's shared pointer and focus emphasis. */
	emphasis: LegendEmphasis<number>
}

/**
 * One switch in the `+N` overflow popover: the same series toggle, and the same
 * pointer and focus emphasis, as a row entry. It carries the full label, and none of the row's
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
	emphasis,
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
			// A tap is not a point, as on `LegendSwitch`.
			onPointerEnter={(event) => {
				if (event.pointerType !== 'touch') emphasis.point(item.index)
			}}
			onPointerLeave={() => emphasis.point(null)}
			onFocus={emphasis.sync}
			onBlur={emphasis.sync}
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
type ChartLegendReferenceSwitchProps = ChartLegendReference & {
	/** The rule is toggled off: the label strikes through and the swatch dims. */
	off: boolean
	/** Toggles the rule on or off by its index. */
	onToggle: (index: number) => void
	/** The legend's shared pointer and focus emphasis of the rules. */
	emphasis: LegendEmphasis<number>
	/**
	 * Renders for measurement only, in the invisible ghost row. It carries a
	 * distinct `chart-legend-reference-ghost` slot, so it never double-counts
	 * with the interactive row.
	 * @defaultValue false
	 */
	ghost?: boolean
}

/**
 * One reference chip in a row: a {@link LegendSwitch} keyed to its rule, as a
 * series entry is keyed to its marks. It shows the label of the rule beside a
 * line swatch in the color of the rule, and the value of the rule after the
 * label. It has the box of a series switch, so a row of chips has the height
 * of a row of series switches.
 *
 * @remarks
 * A click toggles the rule. A pointer or a keyboard focus on a chip that is on
 * recedes the marks to its rule, through the shared reference emphasis. A chip
 * that is off strikes its label and dims its swatch and its value, as a series
 * entry does. Its rule is gone, so it recedes nothing.
 *
 * The chip takes the fields of its rule as props, so a new rule with the same
 * content renders nothing, as a series entry does.
 * @internal
 */
const ChartLegendReferenceSwitch = memo(function ChartLegendReferenceSwitch({
	off,
	onToggle,
	emphasis,
	ghost = false,
	...reference
}: ChartLegendReferenceSwitchProps) {
	return (
		<LegendSwitch
			slot={ghost ? 'chart-legend-reference-ghost' : 'chart-legend-reference'}
			off={off}
			label={reference.label}
			ghost={ghost}
			keys={<ChartLegendReferenceSwatch reference={reference} off={off} />}
			detail={<ChartLegendReferenceValue value={reference.value} off={off} />}
			onToggle={() => onToggle(reference.index)}
			onPoint={(pointed) => emphasis.point(pointed ? reference.index : null)}
			onFocusChange={emphasis.sync}
		/>
	)
})

/**
 * One reference chip in the `+N` overflow popover: the same toggle and the same
 * emphasis as a chip in the row. Like {@link ChartLegendOverflowSwitch}, it is a
 * plain switch with no reveal tooltip, because the popover has room for the
 * whole label.
 *
 * @internal
 */
function ChartLegendReferenceOverflowSwitch({
	off,
	onToggle,
	emphasis,
	...reference
}: Omit<ChartLegendReferenceSwitchProps, 'ghost'>) {
	return (
		<Button
			type="button"
			size="sm"
			variant="plain"
			data-slot="chart-legend-reference"
			className="w-full min-w-0 justify-start"
			aria-pressed={!off}
			onClick={() => onToggle(reference.index)}
			// A tap is not a point, as on `LegendSwitch`.
			onPointerEnter={(event) => {
				if (event.pointerType !== 'touch') emphasis.point(reference.index)
			}}
			onPointerLeave={() => emphasis.point(null)}
			onFocus={emphasis.sync}
			onBlur={emphasis.sync}
		>
			<ChartLegendReferenceSwatch reference={reference} off={off} />

			<Text
				as="span"
				tone="muted"
				size="sm"
				className={cn('min-w-0 text-start leading-tight', off && 'line-through opacity-60')}
			>
				{reference.label}
			</Text>

			<ChartLegendReferenceValue value={reference.value} off={off} />
		</Button>
	)
}

/**
 * The value or the category of a rule after its label, one weight lighter
 * than the label. It dims with the label when the rule is off, but does not
 * strike through.
 *
 * @internal
 */
function ChartLegendReferenceValue({ value, off }: { value?: string; off: boolean }) {
	if (value === undefined) return null

	return (
		<Text
			as="span"
			tone="muted"
			size="sm"
			data-slot="chart-legend-reference-value"
			className={cn('leading-tight font-normal tabular-nums', off && 'opacity-60')}
		>
			{value}
		</Text>
	)
}

/**
 * The key of a reference entry: a line {@link Swatch} that runs in the
 * direction of its rule, dashed unless the rule is solid. A palette slot inks
 * it through its `currentColor` class, and a raw color inks it inline. A
 * vertical line takes the width of a horizontal one, so the labels of a column
 * of entries start at one edge.
 *
 * @internal
 */
function ChartLegendReferenceSwatch({
	reference,
	off,
}: {
	reference: ChartLegendReference
	/** The rule is toggled off, so the swatch dims. */
	off: boolean
}) {
	return (
		<Swatch
			shape="line"
			variant={reference.dashed === false ? 'solid' : 'dashed'}
			orientation={reference.orientation}
			color={reference.swatchClass || undefined}
			style={reference.color ? { color: reference.color } : undefined}
			className={cn(off && 'opacity-40')}
		/>
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
	 * Whether the series' `line` swatch dashes, mirroring a dashed stroke: solid
	 * by default, unlike a reference chip, which dashes by default. Only a `line`
	 * swatch dashes; a `rect` ignores it.
	 * @defaultValue false
	 */
	dashed?: boolean
	/**
	 * Whether the `rect` swatch is a frame, not a fill, mirroring a mark drawn
	 * as a ring, such as a seat that is not called. A hollow swatch takes no
	 * texture.
	 * @defaultValue false
	 */
	hollow?: boolean
	/** The slot color, so a textured legend swatch mirrors the mark's tile; unset for a raw color. */
	color?: ChartColorSlot
	/** A trailing readout: the side panel carries each slice's live share. */
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
	 * Whether the rule is dashed, so the chip's line swatch mirrors it: dashed by
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
	/**
	 * The value of a labeled value rule, or the category of a labeled category
	 * rule, as text. The entry shows it after the label, one weight lighter.
	 * Absent where the label is the value, or where the legend shows no value.
	 */
	value?: string
	/** The description of the rule, which a note shows under its label. */
	description?: string
	/** The direction the rule runs on the plot, so the swatch runs the same way. */
	orientation: Orientation
}

/** Props for {@link ChartLegend}. @internal */
export type ChartLegendProps = {
	items: ChartLegendItem[]
	/**
	 * The reference-line entries, drawn in their own group after the series:
	 * a row under the series row, or a section under the series in a side
	 * panel. Empty (the default) draws none.
	 */
	references?: ChartLegendReference[]
	/**
	 * How the group shows the reference entries: a switch for each rule
	 * (`'chips'`), or a note for each rule that does not toggle (`'notes'`).
	 * @defaultValue 'chips'
	 */
	referenceVariant?: 'chips' | 'notes'

	/** Item indexes toggled off; their marks are hidden and their text struck through. */
	hidden: ReadonlySet<number>
	/**
	 * Reference indexes toggled off: struck through the way a hidden series
	 * entry is, and gated so an off chip's hover recedes nothing. Empty by default.
	 */
	referenceHidden?: ReadonlySet<number>
	/** Toggles an item's series on or off. */
	onToggle: (index: number) => void
	/** Toggles a reference rule on or off by its index; omitted, the chips are static. */
	onToggleReference?: (index: number) => void
	/**
	 * Lay the entries out as a single column rather than the centered wrap
	 * row: the side rail beside a pie or donut. Reserves a rail that scales with
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

/** A group of legend controls that a row cap can cut. @internal */
type LegendGroup<T> = {
	/** The visible row, whose focus a cut can drop. */
	rowRef: RefObject<HTMLDivElement | null>
	/** The ghost row that the fit measures ({@link useLegendFit}). */
	ghostRef: RefObject<HTMLDivElement | null>
	/** The controls that show in the row. */
	shown: T[]
	/** The controls that the `+N` chip holds. */
	overflow: T[]
}

/**
 * The fit of one group of legend controls: the series switches, or the
 * reference chips. Each group fits against `maxRows` on its own, so the
 * controls of one group never fold into the `+N` chip of the other. Uncapped
 * (`maxRows` undefined), every control shows.
 *
 * @param rowRef - The visible row of the group.
 * @param onFocusLost - Runs after the focus moves back into the row, when a
 * cut unmounted the focused control.
 * @internal
 */
function useLegendGroup<T extends { label: string }>(
	list: T[],
	maxRows: number | undefined,
	rowRef: RefObject<HTMLDivElement | null>,
	onFocusLost: () => void,
): LegendGroup<T> {
	// A cut that unmounts the focused control moves the focus to the `+N` chip of
	// the row, else to the last control that stays.
	const reseat = useStableEvent(() => {
		const row = rowRef.current

		const target =
			row?.querySelector<HTMLElement>('[data-slot="chart-legend-more"]') ??
			[...(row?.querySelectorAll<HTMLElement>(ROW_CONTROLS) ?? [])].at(-1)

		target?.focus()

		onFocusLost()
	})

	const [ghostRef, count] = useLegendFit(
		list.map((control) => control.label).join('\u0000'),
		list.length,
		maxRows,
		rowRef,
		reseat,
	)

	return { rowRef, ghostRef, shown: list.slice(0, count), overflow: list.slice(count) }
}

/**
 * The invisible ghost row of a capped group, which always holds every control
 * of the group. The cut measures it, so the cut is exact and never flashes on
 * resize the way a measure-then-cut of the visible row would. It overlays the
 * legend from the top of a relative wrapper the width of the legend, and sits
 * out of flow (`absolute`), so it adds no height. `inert` and `invisible` keep it unpainted and out of the
 * a11y tree while it still lays out for measurement. A box of zero height clips
 * it, so it adds no scroll range below the chart. The row inside keeps its full
 * height, which the fit observes. It packs to the inline start
 * (`justify-start`), so the far edge of each control reads as the width
 * consumed on its row, which the fit math needs.
 *
 * @internal
 */
function LegendGhost({
	ghostRef,
	children,
}: {
	ghostRef: RefObject<HTMLDivElement | null>
	children: ReactNode
}) {
	return (
		<div
			aria-hidden
			inert
			className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden"
		>
			<div ref={ghostRef} className="flex flex-wrap items-center justify-start">
				{children}
			</div>
		</div>
	)
}

/** Props for {@link LegendOverflow}. @internal */
type LegendOverflowProps = {
	/** The count of the controls that the chip holds. */
	count: number
	/** The list of the popover, which the emphasis of the legend reads. */
	listRef: RefObject<HTMLDivElement | null>
	/** Clears the emphasis when the popover closes. */
	onClose: () => void
	/** The overflow controls. */
	children: ReactNode
}

/**
 * The `+N` chip of a capped group, opening the controls that do not fit as a
 * popover switchboard. The popover is a roomy surface, so a long label wraps,
 * and a deep overflow scrolls rather than paginating.
 *
 * @internal
 */
function LegendOverflow({ count, listRef, onClose, children }: LegendOverflowProps) {
	const intl = useIntl()

	return (
		<Popover
			placement="bottom"
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
		>
			<PopoverTrigger>
				<Button
					type="button"
					size="sm"
					variant="plain"
					className="pointer-coarse:min-w-11"
					data-slot="chart-legend-more"
					aria-label={intl.formatMessage(chartMessages.showMore, { count })}
				>
					<Text as="span" tone="muted" size="sm" className="tabular-nums">
						{intl.formatNumber(count, { signDisplay: 'always' })}
					</Text>
				</Button>
			</PopoverTrigger>

			<PopoverContent autoFocus aria-label={intl.formatMessage(chartMessages.moreEntries)}>
				<div
					ref={listRef}
					data-slot="chart-legend-overflow"
					className={cn(
						'flex max-h-64 max-w-xs flex-col items-stretch touch-gap-y-0.5 overflow-y-auto overscroll-contain',
						LEGEND_TOUCH_ROWS,
					)}
				>
					{children}
				</div>
			</PopoverContent>
		</Popover>
	)
}

/**
 * The heading of a section of a side panel: the series, or the reference
 * rules. A panel shows them only when it holds both.
 *
 * @internal
 */
function LegendHeading({ children }: { children: ReactNode }) {
	return (
		<Text
			as="span"
			data-slot="chart-legend-heading"
			tone="muted"
			size="xs"
			className="px-2 pt-2 pb-0.5 font-medium"
		>
			{children}
		</Text>
	)
}

/** Props for {@link ChartLegendNotes}. @internal */
type ChartLegendNotesProps = {
	references: ChartLegendReference[]
	/** Panel layout: the notes fill the rail. Off, the block centers under the figure. */
	panel?: boolean
}

/**
 * The notes of the reference rules (`legend.references.variant: 'notes'`): a
 * line for each rule with its swatch, its label, and its value, and its
 * description under them, one text step smaller. A note is not a switch, so
 * it takes no tab stop and toggles nothing. Pointing a note recedes the marks
 * to its rule, as pointing a chip does, unless the rule draws nothing. A stacked legend puts the notes
 * under the figure, out of the aspect box, and a side panel puts them in its
 * References section.
 *
 * @internal
 */
export function ChartLegendNotes({ references, panel = false }: ChartLegendNotesProps) {
	const { pointReference } = useChartActions()

	return (
		<ul
			data-slot="chart-legend-notes"
			className={cn(
				'grid gap-1',
				panel ? 'w-full min-w-0 px-2' : 'mx-auto w-fit max-w-full min-w-0',
			)}
		>
			{references.map((reference) => (
				<li
					key={reference.index}
					data-slot="chart-legend-note"
					className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-start text-sm leading-5"
					// A tap is not a point, as on `LegendSwitch`.
					onPointerEnter={(event) => {
						if (event.pointerType !== 'touch' && reference.drawn !== false) {
							pointReference(reference.index)
						}
					}}
					onPointerLeave={() => pointReference(null)}
				>
					<span className="flex h-5 items-center">
						<ChartLegendReferenceSwatch reference={reference} off={false} />
					</span>

					<span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
						<Text as="span" tone="muted" className="font-medium">
							{reference.label}
						</Text>

						<ChartLegendReferenceValue value={reference.value} off={false} />
					</span>

					{reference.description && (
						<Text as="span" tone="muted" size="xs" className="col-start-2 min-w-0">
							{reference.description}
						</Text>
					)}
				</li>
			))}
		</ul>
	)
}

/**
 * The legend: the dependable identity channel for the series, and the chart's
 * series switchboard. Pointing (or keyboard-focusing) an entry dims every other
 * series, and clicking toggles its series off. The switches are plain HTML
 * buttons outside the `role="img"` region, so assistive tech reads and operates
 * them. Swatches carry the color, and the text stays in ink. Every entry
 * switches, a lone series included. Toggling the only one off empties the chart
 * by design, with the forced-on legend holding the switch that brings it back.
 * Emphasis is a no-op with no sibling marks to dim.
 *
 * @remarks The legend is one Tab stop. The arrow keys rove between its
 * controls: the switches, the page buttons, and the `+N` chips (Home / End
 * jump to the ends). Escape drops focus, clearing the emphasis.
 * Pointer and keyboard share the one emphasis slot: the pointed-at entry wins,
 * and leaving it reverts to a still-held keyboard focus rather than clearing.
 * That focus side rides `:focus-visible`, the same gate as the ring. A pointer
 * click's lingering focus therefore dims nothing without a visible ring to
 * explain it. So does the focus a backgrounded tab re-fires on return.
 *
 * The reference lines take their own group after the series: a row under the
 * series row, or a section under the series in a side panel, with a heading
 * on each section. Each row fits against `maxRows` on its own, with its own
 * `+N` chip. As chips, the entries are switches: clicking one toggles its rule
 * off, and pointing or focusing a still-shown chip recedes the marks to its
 * rule, the whole-marks equivalent of a series entry's dim. An off chip's hover
 * recedes nothing, since its rule is gone. As notes, the entries do not toggle
 * ({@link ChartLegendNotes}). {@link ChartReferenceList} still carries the
 * value parity. A panel past five series switches pages instead of clipping.
 * The visible page still renders in `items` order, so the roving and emphasis
 * wiring key off its position there rather than the full list.
 * @internal
 */
export function ChartLegend({
	items,
	references = [],
	referenceVariant = 'chips',
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

	const seriesOverflowRef = useRef<HTMLDivElement>(null)

	const referenceOverflowRef = useRef<HTMLDivElement>(null)

	const seriesRowRef = useRef<HTMLDivElement>(null)

	const chipRowRef = useRef<HTMLDivElement>(null)

	const pages = useLegendPages(items, panel)

	const cap = !panel && maxRows !== undefined && maxRows > 0 ? maxRows : undefined

	const notes = referenceVariant === 'notes'

	const { focusSeries: setSeriesFocus, pointReference: setReferenceActive } = useChartActions()

	const containers = [ref, seriesOverflowRef, referenceOverflowRef]

	const emphasis = useLegendEmphasis(
		containers,
		'button[data-slot="chart-legend-item"]',
		(position) => pages.items[position]?.index ?? null,
		setSeriesFocus,
	)

	const referenceEmphasis = useLegendEmphasis(
		containers,
		'button[data-slot="chart-legend-reference"]',
		(position) => references[position]?.index ?? null,
		setReferenceActive,
		(index) =>
			!referenceHidden.has(index) &&
			references.find((reference) => reference.index === index)?.drawn !== false,
	)

	const syncEmphasis = useStableEvent(() => {
		emphasis.sync()

		referenceEmphasis.sync()
	})

	const grouped = references.length > 0

	// A legend with no rule is the series row itself, as a legend of series alone.
	const series = useLegendGroup(
		pages.items,
		cap,
		grouped || panel ? seriesRowRef : ref,
		syncEmphasis,
	)

	// A note is not a control, so the notes take no fit.
	const chipList = notes ? NO_REFERENCES : references

	const chips = useLegendGroup(chipList, cap, chipRowRef, syncEmphasis)

	const toggleReference = useStableEvent((index: number) => {
		const off = referenceHidden.has(index)

		onToggleReference?.(index)

		if (!off) setReferenceActive(null)
	})

	useReportedChange(referenceHidden, referenceEmphasis.sync)

	const closeOverflow = () => {
		emphasis.point(null)

		referenceEmphasis.point(null)

		setSeriesFocus(null)

		setReferenceActive(null)
	}

	const toolbarProps = useLegendToolbar(
		ref,
		panel,
		!inert && (items.length > 0 || (references.length > 0 && !notes)),
	)

	const renderEntry = (item: ChartLegendItem, ghost: boolean) => (
		<ChartLegendEntry
			key={item.index}
			{...item}
			off={hidden.has(item.index)}
			panel={panel}
			texture={texture}
			ghost={ghost}
			onToggle={onToggle}
			emphasis={emphasis}
		/>
	)

	const renderChip = (reference: ChartLegendReference, ghost: boolean) => (
		<ChartLegendReferenceSwitch
			key={`reference:${reference.index}`}
			{...reference}
			off={referenceHidden.has(reference.index)}
			ghost={ghost}
			onToggle={toggleReference}
			emphasis={referenceEmphasis}
		/>
	)

	const seriesControls = (
		<LegendControls
			group={series}
			listRef={seriesOverflowRef}
			onClose={closeOverflow}
			renderShown={(item) => renderEntry(item, false)}
			renderOverflow={(item) => (
				<ChartLegendOverflowSwitch
					key={item.index}
					item={item}
					off={hidden.has(item.index)}
					texture={texture}
					onToggle={onToggle}
					emphasis={emphasis}
				/>
			)}
		/>
	)

	const referenceControls = notes ? (
		<ChartLegendNotes references={references} panel={panel} />
	) : (
		<LegendControls
			group={chips}
			listRef={referenceOverflowRef}
			onClose={closeOverflow}
			renderShown={(reference) => renderChip(reference, false)}
			renderOverflow={(reference) => (
				<ChartLegendReferenceOverflowSwitch
					key={`reference:${reference.index}`}
					{...reference}
					off={referenceHidden.has(reference.index)}
					onToggle={toggleReference}
					emphasis={referenceEmphasis}
				/>
			)}
		/>
	)

	const rootProps = { ref, 'data-slot': 'chart-legend', inert, ...toolbarProps }

	if (panel) {
		return (
			<ChartLegendPanel
				rootProps={rootProps}
				series={series}
				chips={grouped ? chips : undefined}
				pagination={
					pages.count > 1 && (
						<LegendPagination page={pages.page} pageCount={pages.count} onPage={pages.setPage} />
					)
				}
				seriesControls={seriesControls}
				referenceControls={referenceControls}
			/>
		)
	}

	return (
		<ChartLegendStack
			rootProps={rootProps}
			seriesRowRef={seriesRowRef}
			chipRowRef={chipRowRef}
			grouped={grouped}
			ghosts={
				cap !== undefined && (
					<>
						<LegendGhost ghostRef={series.ghostRef}>
							{items.map((item) => renderEntry(item, true))}
						</LegendGhost>

						{chipList.length > 0 && (
							<LegendGhost ghostRef={chips.ghostRef}>
								{chipList.map((reference) => renderChip(reference, true))}
							</LegendGhost>
						)}
					</>
				)
			}
			seriesControls={seriesControls}
			referenceControls={referenceControls}
		/>
	)
}

/** Props for {@link ChartLegendStack}. @internal */
type ChartLegendStackProps = {
	/** The ref, the slot, and the toolbar props of the legend. */
	rootProps: ComponentProps<'div'>
	/** The series row of a legend that names rules. */
	seriesRowRef: RefObject<HTMLDivElement | null>
	/** The row of the reference entries. */
	chipRowRef: RefObject<HTMLDivElement | null>
	/** The legend names rules, so it shows a row of them under the series row. */
	grouped: boolean
	/** The ghost of each capped row, if the rows take a cap. */
	ghosts: ReactNode
	seriesControls: ReactNode
	referenceControls: ReactNode
}

/**
 * The stacked legend, above or below the plot. A legend of series alone is one
 * centered wrapping row. A legend that names rules is a column: the series row,
 * and the row of the reference entries under it. Each capped row measures its
 * own ghost. The ghosts sit outside the legend, so they never count as its
 * controls.
 *
 * @internal
 */
function ChartLegendStack({
	rootProps,
	seriesRowRef,
	chipRowRef,
	grouped,
	ghosts,
	seriesControls,
	referenceControls,
}: ChartLegendStackProps) {
	const legend = grouped ? (
		<div
			{...rootProps}
			className={cn(
				'flex w-full flex-col items-center',
				'[--touch-target-gap-x:0px] [--touch-target-gap-y:0px]',
			)}
		>
			<LegendRow rowRef={seriesRowRef} slot="chart-legend-series">
				{seriesControls}
			</LegendRow>

			<LegendRow rowRef={chipRowRef} slot="chart-legend-references">
				{referenceControls}
			</LegendRow>
		</div>
	) : (
		<div
			{...rootProps}
			className={cn(
				'flex flex-wrap items-center justify-center',
				'[--touch-target-gap-x:0px] [--touch-target-gap-y:0px]',
				LEGEND_TOUCH_ROWS,
			)}
		>
			{seriesControls}
		</div>
	)

	if (!ghosts) return legend

	return (
		<div className="relative w-full">
			{ghosts}

			{legend}
		</div>
	)
}

/** The page of series switches that a side panel shows. @internal */
type LegendPages = {
	/** The series switches of the page that shows: every switch when the legend does not page. */
	items: ChartLegendItem[]
	/** The page that shows, from `0`. */
	page: number
	/** The count of pages: `1` when the legend does not page. */
	count: number
	/** Shows a page. */
	setPage: (page: number) => void
}

/**
 * The pages of a side panel past five series switches. A stacked legend does
 * not page: it caps its rows instead.
 *
 * @internal
 */
function useLegendPages(items: ChartLegendItem[], panel: boolean): LegendPages {
	const [page, setPage] = useState(0)

	const count = panel ? Math.max(1, Math.ceil(items.length / PAGE_SIZE)) : 1

	const current = Math.min(page, count - 1)

	return {
		items: count > 1 ? items.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE) : items,
		page: current,
		count,
		setPage,
	}
}

/**
 * The toolbar props of a legend with a control: one Tab stop, with the arrow
 * keys roving between its controls. A legend with no control, such as an inert
 * key or a legend of notes alone, takes none.
 *
 * @internal
 */
function useLegendToolbar(
	ref: RefObject<HTMLDivElement | null>,
	panel: boolean,
	interactive: boolean,
) {
	const intl = useIntl()

	const orientation = panel ? 'vertical' : 'horizontal'

	const onKeyDown = useA11yRoving(ref, {
		itemSelector: [
			'button[data-slot="chart-legend-item"]',
			'button[data-slot="chart-legend-page"]',
			'button[data-slot="chart-legend-reference"]',
			'button[data-slot="chart-legend-more"]',
		].join(', '),
		orientation,
		manageTabIndex: true,
		escapeBlurs: true,
	})

	if (!interactive) return {}

	return {
		role: 'toolbar',
		'aria-label': intl.formatMessage(chartMessages.legend),
		'aria-orientation': orientation,
		onKeyDown,
	} as const
}

/** Props for {@link LegendControls}. @internal */
type LegendControlsProps<T> = {
	/** The group, cut by its fit. */
	group: LegendGroup<T>
	/** The list of the overflow popover. */
	listRef: RefObject<HTMLDivElement | null>
	/** Clears the emphasis when the popover closes. */
	onClose: () => void
	/** Renders a control that shows in the row. */
	renderShown: (control: T) => ReactNode
	/** Renders a control in the overflow popover. */
	renderOverflow: (control: T) => ReactNode
}

/**
 * The controls of one group that show, and the `+N` chip of the rest.
 *
 * @internal
 */
function LegendControls<T>({
	group,
	listRef,
	onClose,
	renderShown,
	renderOverflow,
}: LegendControlsProps<T>) {
	return (
		<>
			{group.shown.map(renderShown)}

			{group.overflow.length > 0 && (
				<LegendOverflow count={group.overflow.length} listRef={listRef} onClose={onClose}>
					{group.overflow.map(renderOverflow)}
				</LegendOverflow>
			)}
		</>
	)
}

/** Props for {@link ChartLegendPanel}. @internal */
type ChartLegendPanelProps = {
	/** The ref, the slot, and the toolbar props of the legend. */
	rootProps: ComponentProps<'div'>
	/** The series group. */
	series: LegendGroup<ChartLegendItem>
	/** The reference group. Absent, the panel names no rule and shows no headings. */
	chips?: LegendGroup<ChartLegendReference>
	/** The page buttons, if the series page. */
	pagination: ReactNode
	seriesControls: ReactNode
	referenceControls: ReactNode
}

/**
 * The side panel of a legend: a column of the series switches, and a column of
 * the reference entries under it, each under its heading.
 *
 * @internal
 */
function ChartLegendPanel({
	rootProps,
	series,
	chips,
	pagination,
	seriesControls,
	referenceControls,
}: ChartLegendPanelProps) {
	const intl = useIntl()

	return (
		<div
			{...rootProps}
			className={cn(
				'flex flex-col items-center justify-center @sm:w-[min(16rem,40cqw)] @sm:shrink-0',
				'[--touch-target-gap-x:0px] [--touch-target-gap-y:0px]',
			)}
		>
			<div
				data-slot="chart-legend-items"
				className={cn('flex w-fit min-w-0 max-w-full flex-col items-start', LEGEND_TOUCH_ROWS)}
			>
				<LegendSection
					heading={chips ? intl.formatMessage(chartMessages.series) : undefined}
					rowRef={series.rowRef}
					slot="chart-legend-series"
				>
					{seriesControls}

					{pagination}
				</LegendSection>

				{chips && (
					<LegendSection
						heading={intl.formatMessage(chartMessages.references)}
						rowRef={chips.rowRef}
						slot="chart-legend-references"
					>
						{referenceControls}
					</LegendSection>
				)}
			</div>
		</div>
	)
}

/** Props for {@link LegendRow}. @internal */
type LegendRowProps = {
	/** The row, whose focus a cut can drop. */
	rowRef: RefObject<HTMLDivElement | null>
	/** The `data-slot` of the row. */
	slot: string
	/** The controls that show, and the `+N` chip. */
	children: ReactNode
}

/**
 * One centered wrapping row of a stacked legend that names rules: the series,
 * or the reference entries.
 *
 * @internal
 */
function LegendRow({ rowRef, slot, children }: LegendRowProps) {
	return (
		<div
			ref={rowRef}
			data-slot={slot}
			className={cn('flex w-full flex-wrap items-center justify-center', LEGEND_TOUCH_ROWS)}
		>
			{children}
		</div>
	)
}

/** Props for {@link LegendSection}. @internal */
type LegendSectionProps = {
	/** The heading over the section. Absent, the section shows no heading. */
	heading?: string
	/** The column of the section, whose focus a cut can drop. */
	rowRef: RefObject<HTMLDivElement | null>
	/** The `data-slot` of the column. */
	slot: string
	children: ReactNode
}

/**
 * One section of a side panel: a heading over a column of entries. A panel
 * shows the headings only when it holds both the series and the rules.
 *
 * @internal
 */
function LegendSection({ heading, rowRef, slot, children }: LegendSectionProps) {
	return (
		<>
			{heading && <LegendHeading>{heading}</LegendHeading>}

			<div
				ref={rowRef}
				data-slot={slot}
				className={cn('flex w-full min-w-0 flex-col items-start', LEGEND_TOUCH_ROWS)}
			>
				{children}
			</div>
		</>
	)
}

/** Props for {@link LegendPagination}. @internal */
type LegendPaginationProps = {
	/** The page that shows, from `0`. */
	page: number
	pageCount: number
	/** Shows a page. */
	onPage: (page: number) => void
}

/**
 * The page buttons of a side panel past five series switches, with the page
 * between them.
 *
 * @internal
 */
function LegendPagination({ page, pageCount, onPage }: LegendPaginationProps) {
	const intl = useIntl()

	const firstPage = page === 0

	const lastPage = page === pageCount - 1

	return (
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
				data-slot="chart-legend-page"
				aria-label={intl.formatMessage(chartMessages.previousEntries)}
				aria-disabled={ariaAttr(firstPage)}
				data-disabled={dataAttr(firstPage)}
				onClick={() => {
					if (!firstPage) onPage(page - 1)
				}}
			>
				<Icon icon={<ChevronLeft />} className="rtl:-scale-x-100" />
			</Button>

			{/* A screen reader reads "Page 2 of 3", not "2 slash 3", in the language of the reader. */}
			<Text as="span" tone="muted" size="sm" className="tabular-nums">
				<span aria-hidden="true">
					{intl.formatNumber(page + 1)} / {intl.formatNumber(pageCount)}
				</span>
				<span className="sr-only">
					{intl.formatMessage(chartMessages.entriesPage, { page: page + 1, count: pageCount })}
				</span>
			</Text>

			<Button
				type="button"
				size="sm"
				variant="plain"
				data-slot="chart-legend-page"
				aria-label={intl.formatMessage(chartMessages.nextEntries)}
				aria-disabled={ariaAttr(lastPage)}
				data-disabled={dataAttr(lastPage)}
				onClick={() => {
					if (!lastPage) onPage(page + 1)
				}}
			>
				<Icon icon={<ChevronRight />} className="rtl:-scale-x-100" />
			</Button>
		</div>
	)
}
