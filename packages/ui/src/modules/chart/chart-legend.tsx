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
	label: string
	/** currentColor class carrying the series colour. */
	swatchClass: string
	/** Swatch shape, mirroring the mark: `rect` for bars and slices, `line` for lines. */
	swatch: 'rect' | 'line'
	/** The slot colour, so a textured legend swatch mirrors the mark's tile. */
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
 * dims every other series, clicking toggles its series off. Plain HTML
 * buttons outside the `role="img"` region, so assistive tech reads and
 * operates them; swatches carry the colour, the text stays in ink.
 *
 * @remarks The row is one Tab stop; the arrow keys rove between entries
 * (Home / End jump to the ends) and Escape drops focus, clearing the
 * emphasis. Swatches carry the colour, the text stays in ink. Reference lines
 * follow the series switches as static, `aria-hidden` identity chips — a rule
 * has no toggle, and {@link ChartReferenceList} carries its parity.
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

	const onKeyDown = useA11yRoving(ref, {
		itemSelector: '[data-slot="chart-legend-item"]',
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

	return (
		<div
			ref={ref}
			data-slot="chart-legend"
			role="toolbar"
			aria-orientation="horizontal"
			onKeyDown={handleKeyDown}
			className={cn(
				panel ? 'flex flex-col items-start' : 'flex flex-wrap items-center justify-center',
			)}
		>
			{items.map((item, index) => {
				const off = hidden.has(index)

				return (
					<Button
						key={item.label}
						size="sm"
						variant="plain"
						data-slot="chart-legend-item"
						aria-pressed={!off}
						onClick={() => onToggle(index)}
						onPointerEnter={() => onFocus(index)}
						onPointerLeave={() => onFocus(null)}
						onFocus={() => onFocus(index)}
						onBlur={() => onFocus(null)}
					>
						<ChartSwatch
							swatch={item.swatch}
							swatchClass={item.swatchClass}
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
					</Button>
				)
			})}

			{references.map((reference, index) => (
				// A reference chip mirrors an entry's swatch-and-label layout without the
				// button chrome — it names a rule, it doesn't switch a series. The slot
				// colour rides its currentColor class; a raw colour rides an inline style.
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: chips are index-aligned with the reference prop and never reorder.
					key={`reference:${index}`}
					data-slot="chart-legend-reference"
					aria-hidden="true"
					className="inline-flex items-center gap-1 px-2 py-1"
				>
					<Swatch
						shape="line"
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
