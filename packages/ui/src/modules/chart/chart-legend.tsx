'use client'

import { type KeyboardEvent, useRef } from 'react'
import { Button } from '../../components/button'
import { Swatch } from '../../components/swatch'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks/a11y'
import type { ChartSeriesColor } from '../../recipes/kata/chart'
import { ChartSwatch } from './chart-pattern-defs'
import { useChartEmphasis } from './context'

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
	 * row — the static side panel beside a pie or donut.
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
 * {@link ChartReferenceList} still carries the value parity.
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

		// Buttons render in `items` order, so a focused button's position names its
		// entry — and the entry carries the series index the emphasis keys off,
		// which the legend's display order need not match.
		onFocus(position === -1 ? null : (items[position]?.index ?? null))
	}

	// The reference chips share the marks' recede with the reference rules: a
	// chip's hover or keyboard focus recedes the whole marks group to it, the same
	// emphasis as pointing the rule. Present whenever the legend is inside a chart.
	const { setReferenceActive } = useChartEmphasis()

	// Which reference chip the pointer is over, or none. Reference emphasis is a
	// single boolean, so — unlike the series slot — it need only track whether any
	// chip is live, not which.
	const referencePointed = useRef(false)

	// Reference emphasis follows the same pointer-vs-focus-visible gate as
	// `syncEmphasis`: a pointed chip recedes the marks, else a keyboard-focused one
	// (`:focus-visible`, the ring's gate) does, so a click's ring-less focus — or a
	// backgrounded tab's refired focus — recedes nothing without a ring to explain
	// it. Any chip going live recedes the marks; the last one leaving restores them.
	const syncReference = () => {
		if (referencePointed.current) {
			setReferenceActive(true)

			return
		}

		const chips = ref.current?.querySelectorAll<HTMLButtonElement>(
			'button[data-slot="chart-legend-reference"]',
		)

		setReferenceActive(
			chips ? Array.from(chips).some((chip) => chip.matches(':focus-visible')) : false,
		)
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
				panel ? 'flex flex-col items-start' : 'flex flex-wrap items-center justify-center',
			)}
		>
			{items.map((item) => {
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

						<Text
							as="span"
							severity="muted"
							size="sm"
							className={cn('text-left leading-tight', off && 'line-through opacity-60')}
						>
							{item.label}
						</Text>

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
							className="inline-flex items-center gap-1 px-2 py-1"
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
						referencePointed.current = true

						syncReference()
					}}
					onPointerLeave={() => {
						referencePointed.current = false

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
