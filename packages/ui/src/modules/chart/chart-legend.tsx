'use client'

import { type KeyboardEvent, useRef } from 'react'
import { Button } from '../../components/button'
import { Swatch } from '../../components/swatch'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks/a11y'
import type { ChartSeriesColor } from '../../recipes/kata/chart'
import { ChartSwatch } from './chart-pattern-defs'

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
 * ring to explain it. Reference lines follow the entries as static,
 * `aria-hidden` identity chips — a rule has no toggle, and
 * {@link ChartReferenceList} carries its parity.
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
							dashed={item.dashed}
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

				// A lone entry can't be switched, so it reads as a static identity
				// chip — no button, no toggle, no emphasis — matching the reference chips.
				if (!interactive) {
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
