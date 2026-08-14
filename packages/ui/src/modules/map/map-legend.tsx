'use client'

import { type KeyboardEvent, useRef } from 'react'
import { Button } from '../../components/button'
import { Swatch } from '../../components/swatch'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks/a11y'
import type { MapLegendItem } from './engine/map-legend/items'
import { mapSwatchShapes } from './map-swatch'

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

	// The side panel lays the entries in a column, so the arrows rove vertically
	// there and horizontally under the map — the axis matches the layout.
	const orientation = panel ? 'vertical' : 'horizontal'

	const onKeyDown = useA11yRoving(ref, {
		itemSelector: '[data-slot="map-legend-item"]',
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

	return (
		<div
			ref={ref}
			data-slot="map-legend"
			role="toolbar"
			aria-orientation={orientation}
			onKeyDown={handleKeyDown}
			className={cn(
				// Layout the legend as a grid; the side panel modifies the
				// spacing and width at larger breakpoints.
				'mx-auto grid w-fit max-w-full justify-items-start',
				panel && 'lg:mx-0 lg:w-full',
			)}
		>
			{items.map((item) => {
				const off = hidden.has(item.id)

				return (
					<Button
						type="button"
						key={item.id}
						size="sm"
						variant="plain"
						data-slot="map-legend-item"
						aria-pressed={!off}
						// Aligned to the top rather than centered: a label long enough to wrap
						// used to carry its swatch down to the middle of the block with it,
						// leaving one key off the line every other key sits on. The panel's
						// entries stretch to its width so the trailing readouts share one right
						// edge; the centered row keeps each entry its own width.
						className={cn('items-start gap-2', panel && 'lg:w-full lg:justify-start')}
						onClick={() => onToggle(item.id)}
						onPointerEnter={() => onFocus(item.id)}
						onPointerLeave={() => onFocus(null)}
						onFocus={() => onFocus(item.id)}
						onBlur={() => onFocus(null)}
					>
						{/* One key per distinct mark shape the entry stands for — a lone swatch
						    for a category or an ungrouped mark, a square beside a dot where a
						    zone and the mark inside it merged into one place. Padded to the
						    first line's middle, which is what the top alignment above costs and
						    what a wrapped label made worth paying. */}
						<span data-slot="map-legend-keys" className="flex shrink-0 items-center gap-1 pt-1">
							{item.swatches.map((swatch) => (
								<Swatch
									key={swatch.shape}
									shape={mapSwatchShapes[swatch.shape]}
									color={swatch.className}
									style={swatch.color ? { color: swatch.color } : undefined}
									className={cn(off && 'opacity-40')}
								/>
							))}
						</span>

						{/* Beside the label rather than under it: the readout is a short,
						    predictable word — a mileage, a count, a service class — so it holds
						    its own right-hand column, where stacking the two spent a second line
						    on every entry that carried one.

						    The row wraps rather than the name. Neither half shrinks, so a pair
						    too wide for the rail drops the READOUT to a second line with the
						    name intact — the old stack, but only where it is earned. Letting
						    the name take the slack instead broke "Los Angeles" across two lines
						    to keep a readout beside it, which is the wrong half to give up: the
						    name is what a reader matches against the map. The truncation under
						    it is the backstop for a single word wider than the whole rail,
						    which no wrap can help. */}
						<span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
							<Text
								as="span"
								size="sm"
								data-slot="map-legend-label"
								severity="muted"
								className={cn(
									'max-w-full shrink-0 truncate text-left leading-tight',
									off && 'line-through opacity-60',
								)}
							>
								{item.label}
							</Text>

							{item.detail && (
								// A step down the scale rather than the label's own size: a readout
								// that matched its name competed with it, and the width it took at
								// that size is the width the name had to wrap to give up.
								<Text
									as="span"
									size="xs"
									data-slot="map-legend-detail"
									severity="muted"
									className={cn(
										'ml-auto shrink-0 text-right leading-tight whitespace-nowrap tabular-nums font-normal opacity-80',
										off && 'opacity-60',
									)}
								>
									{item.detail}
								</Text>
							)}
						</span>
					</Button>
				)
			})}
		</div>
	)
}
