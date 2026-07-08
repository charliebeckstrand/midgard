'use client'

import { type KeyboardEvent, useRef } from 'react'
import { Button } from '../../components/button'
import { Swatch, type SwatchProps } from '../../components/swatch'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks/a11y'

/** One legend entry: a category or overlay named by its mark-mirroring swatch. @internal */
export type MapLegendItem = {
	/** The toggle / emphasis key: `category:<value>` or a registered overlay id. */
	id: string
	label: string
	/** currentColor class carrying the entry's colour (categorical slots and overlays). */
	swatchClass?: string
	/** Inline CSS colour carrying the entry's colour (numeric choropleth bins). */
	swatchColor?: string
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

/** Maps a mark shape to its {@link Swatch} shape. */
const SWATCH_SHAPE = { rect: 'square', line: 'line', dot: 'circle' } as const satisfies Record<
	MapLegendItem['swatch'],
	NonNullable<SwatchProps['shape']>
>

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
						<Swatch
							shape={SWATCH_SHAPE[item.swatch]}
							color={item.swatchClass}
							style={item.swatchColor ? { color: item.swatchColor } : undefined}
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
								className={cn(
									'text-left leading-tight whitespace-nowrap tabular-nums',
									off && 'opacity-60',
								)}
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
