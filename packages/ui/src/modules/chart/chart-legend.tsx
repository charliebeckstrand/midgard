'use client'

import { type KeyboardEvent, useRef } from 'react'
import { Button } from '../../components/button'
import { Swatch, type SwatchProps } from '../../components/swatch'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks/a11y'

/** One legend entry: the series name keyed by its mark-mirroring swatch. @internal */
export type ChartLegendItem = {
	label: string
	/** currentColor class carrying the series colour. */
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

/** Maps a mark shape to its {@link Swatch} shape. */
const SWATCH_SHAPE = { rect: 'square', line: 'line' } as const satisfies Record<
	ChartLegendItem['swatch'],
	NonNullable<SwatchProps['shape']>
>

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
					: 'flex flex-wrap items-center justify-center gap-x-2',
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
						<Swatch
							shape={SWATCH_SHAPE[item.swatch]}
							color={item.swatchClass}
							className={cn(off && 'opacity-40')}
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
		</div>
	)
}
