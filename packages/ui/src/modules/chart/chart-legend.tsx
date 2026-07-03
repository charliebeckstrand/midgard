'use client'

import { type KeyboardEvent, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks/a11y'
import { k } from '../../recipes/kata/chart'

/** One legend entry: the series name keyed by its mark-mirroring swatch. @internal */
export type ChartLegendItem = {
	label: string
	/** Background class carrying the series colour. */
	swatchClass: string
	/** Swatch shape, mirroring the mark: `rect` for bars and slices, `line` for lines. */
	swatch: 'rect' | 'line'
	/** A trailing readout — the side panel carries each slice's live share. */
	detail?: string
}

/** Props for {@link ChartLegend}. @internal */
export type ChartLegendProps = {
	items: ChartLegendItem[]
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
 * emphasis. Swatches carry the colour, the text stays in ink.
 * @internal
 */
export function ChartLegend({ items, hidden, onToggle, onFocus, panel = false }: ChartLegendProps) {
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
				panel
					? 'flex flex-col items-start gap-1'
					: 'mb-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1',
			)}
		>
			{items.map((item, index) => {
				const off = hidden.has(index)

				return (
					<button
						key={item.label}
						type="button"
						data-slot="chart-legend-item"
						aria-pressed={!off}
						className={cn(k.legendItem)}
						onClick={() => onToggle(index)}
						onPointerEnter={() => onFocus(index)}
						onPointerLeave={() => onFocus(null)}
						onFocus={() => onFocus(index)}
						onBlur={() => onFocus(null)}
					>
						<span
							aria-hidden="true"
							className={cn(
								item.swatch === 'rect' ? 'size-2.5 rounded-xs' : 'h-0.5 w-3 rounded-full',
								item.swatchClass,
								off && 'opacity-40',
							)}
						/>

						<span className={cn(k.label, off && 'line-through opacity-60')}>{item.label}</span>

						{item.detail && (
							<span className={cn(k.label, 'tabular-nums', off && 'opacity-60')}>
								{item.detail}
							</span>
						)}
					</button>
				)
			})}
		</div>
	)
}
