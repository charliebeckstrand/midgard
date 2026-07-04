'use client'

import { type KeyboardEvent, useRef } from 'react'
import { Button } from '../../components/button'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks/a11y'
import { k } from '../../recipes/kata/map'

/** One legend entry: a category or overlay named by its mark-mirroring swatch. @internal */
export type MapLegendItem = {
	/** The toggle / emphasis key: `category:<index>` or a registered overlay id. */
	id: string
	label: string
	/** Background class carrying the entry's colour. */
	swatchClass: string
	/** Swatch shape, mirroring the mark: `rect` for regions, `line` for routes and markers, `dot` for points. */
	swatch: 'rect' | 'line' | 'dot'
	/** A trailing readout — a route's mileage, a point's value. */
	detail?: string
}

/** Props for {@link MapLegend}. @internal */
export type MapLegendProps = {
	items: MapLegendItem[]
	/** Entry ids toggled off; their marks fall back or unmount and their text strikes through. */
	hidden: ReadonlySet<string>
	/** Toggles an entry on or off. */
	onToggle: (id: string) => void
	/** Emphasises an entry's marks (`null` clears); other marks dim while set. */
	onFocus: (id: string | null) => void
	/**
	 * Lay the entries out as a single column rather than the centered wrap
	 * row — the static side panel beside the map.
	 */
	panel?: boolean
}

/** The swatch classes per shape, mirroring the mark each entry stands for. @internal */
function swatchShape(swatch: MapLegendItem['swatch']): string {
	if (swatch === 'rect') return 'size-2.5 rounded-xs'

	if (swatch === 'dot') return 'size-2 rounded-full'

	return 'h-0.5 w-3 rounded-full'
}

/**
 * The map's legend — one switchboard merging the region categories with every
 * registered overlay: pointing (or keyboard-focusing) an entry dims all marks
 * outside its group, clicking toggles it off. Plain HTML buttons outside the
 * `role="img"` region, so assistive tech reads and operates them; swatches
 * carry the colour, the text stays in ink.
 *
 * @remarks The row is one Tab stop; the arrow keys rove between entries
 * (Home / End jump to the ends) and Escape drops focus, clearing the
 * emphasis.
 * @internal
 */
export function MapLegend({ items, hidden, onToggle, onFocus, panel = false }: MapLegendProps) {
	const ref = useRef<HTMLDivElement>(null)

	const onKeyDown = useA11yRoving(ref, {
		itemSelector: '[data-slot="map-legend-item"]',
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
			data-slot="map-legend"
			role="toolbar"
			aria-orientation="horizontal"
			onKeyDown={handleKeyDown}
			className={cn(
				// Under the map — the row placements, and the side panel once it
				// stacks below lg — the buttons lay out as a centered grid: fully
				// stacked below sm, an even two columns from sm, so they line up in
				// a block instead of wrapping ragged. The side panel returns to a
				// single left-aligned column beside the map from lg up.
				'mx-auto grid w-fit max-w-full grid-cols-1 justify-items-start gap-x-2 gap-y-1 sm:grid-cols-2',
				panel && 'lg:mx-0 lg:w-full lg:grid-cols-1 lg:gap-x-1',
			)}
		>
			{items.map((item) => {
				const off = hidden.has(item.id)

				return (
					<Button
						key={item.id}
						size="sm"
						variant="plain"
						data-slot="map-legend-item"
						aria-pressed={!off}
						onClick={() => onToggle(item.id)}
						onPointerEnter={() => onFocus(item.id)}
						onPointerLeave={() => onFocus(null)}
						onFocus={() => onFocus(item.id)}
						onBlur={() => onFocus(null)}
					>
						<span
							aria-hidden="true"
							className={cn(swatchShape(item.swatch), item.swatchClass, off && 'opacity-40')}
						/>

						<span className={cn(k.label, off && 'line-through opacity-60')}>{item.label}</span>

						{item.detail && (
							<span className={cn(k.label, 'whitespace-nowrap tabular-nums', off && 'opacity-60')}>
								{item.detail}
							</span>
						)}
					</Button>
				)
			})}
		</div>
	)
}
