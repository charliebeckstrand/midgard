'use client'

import { type KeyboardEvent, useRef } from 'react'
import { Button } from '../../components/button'
import { Swatch } from '../../components/swatch'
import { Text } from '../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks/a11y'
import { useTruncation } from '../../hooks/use-truncation'
import type { MapLegendItem } from './engine/map-legend/items'
import { mapSwatchShapes } from './map-swatch'

/** Props for {@link MapLegendEntry}. @internal */
type MapLegendEntryProps = {
	item: MapLegendItem
	/** The entry is toggled off — its label strikes through and its keys dim. */
	off: boolean
	/** Panel layout: the entry stretches to the rail so every readout shares one right edge. */
	panel: boolean
	/** Toggles this entry on or off. */
	onToggle: (id: string) => void
	/** Emphasises this entry's marks (`null` clears). */
	onFocus: (id: string | null) => void
}

/**
 * One legend entry: the keys mirroring the marks it stands for, the name, and
 * its trailing readout — on one line, always. The name truncates to hold that
 * line and a hover or keyboard focus reveals it in full once it clips.
 *
 * The reveal is the chart legend's, and deliberately: both legends cap a name
 * against a rail narrower than the names people give things, and a reader who
 * cannot finish reading one must not have to learn a second way to.
 *
 * @remarks The tooltip wraps the whole control rather than the label span,
 * because a {@link Button}'s touch-target overlay captures the pointer and
 * forwards it by bubbling — a tooltip anchored to an inner span would never see
 * the hover. Overflow is measured on the span through the shared
 * {@link useTruncation}, and a closed (unclipped) tooltip renders no surface, so
 * an entry that fits adds no DOM.
 * @internal
 */
function MapLegendEntry({ item, off, panel, onToggle, onFocus }: MapLegendEntryProps) {
	// The whole entry is the tooltip's trigger, so its contact — not the label
	// span's — is what arms the measure.
	const entryRef = useRef<HTMLButtonElement>(null)

	const [labelRef, truncated] = useTruncation<HTMLSpanElement>({ armRef: entryRef })

	const control = (
		<Button
			type="button"
			ref={entryRef}
			size="sm"
			variant="plain"
			data-slot="map-legend-item"
			aria-pressed={!off}
			// The panel's entries stretch to the rail so the readouts share one right
			// edge rather than each entry centring its own content; the row under the
			// map keeps every entry its own width.
			className={cn('gap-2', panel && 'lg:w-full lg:justify-start')}
			onClick={() => onToggle(item.id)}
			onPointerEnter={() => onFocus(item.id)}
			onPointerLeave={() => onFocus(null)}
			onFocus={() => onFocus(item.id)}
			onBlur={() => onFocus(null)}
		>
			{/* One key per distinct mark shape the entry stands for — a lone swatch for
			    a category or an ungrouped mark, a square beside a dot where a zone and
			    the mark inside it merged into one place. */}
			<span data-slot="map-legend-keys" className="flex shrink-0 items-center gap-1">
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
			    predictable word — a mileage, a count, a service class — so it holds its
			    own right-hand column, where stacking the two spent a second line on
			    every entry that carried one.

			    The entry is one line whatever it holds. The name gives up the width,
			    because it is the half that can be given up gracefully: it clips to an
			    ellipsis and the reveal above hands it back in full, where a readout
			    clipped to "Same d…" says nothing and a wrapped one costs the line the
			    stack was traded away to save. */}
			{/* The clipping box is structural and nothing else: the off treatment stays
			    on the label itself, which is the slot that names it. */}
			<span ref={labelRef} className="block min-w-0 flex-1 truncate text-left">
				<Text
					as="span"
					size="sm"
					data-slot="map-legend-label"
					severity="muted"
					className={cn('leading-tight', off && 'line-through opacity-60')}
				>
					{item.label}
				</Text>
			</span>

			{item.detail && (
				// A step down the scale rather than the label's own size: a readout that
				// matched its name competed with it for the eye, and the width it took at
				// that size is width the name is now clipped for want of.
				<Text
					as="span"
					size="xs"
					data-slot="map-legend-detail"
					severity="muted"
					className={cn(
						'shrink-0 text-right leading-tight whitespace-nowrap tabular-nums font-normal opacity-80',
						off && 'opacity-60',
					)}
				>
					{item.detail}
				</Text>
			)}
		</Button>
	)

	return (
		<Tooltip enabled={truncated}>
			<TooltipTrigger>{control}</TooltipTrigger>

			<TooltipContent>{item.label}</TooltipContent>
		</Tooltip>
	)
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

/**
 * The map's legend — one switchboard merging the region categories with every
 * registered overlay: pointing (or keyboard-focusing) an entry dims all marks
 * outside its group, clicking toggles it off. Plain HTML buttons outside the
 * `role="img"` region, so assistive tech reads and operates them; swatches
 * carry the colour, the text stays in ink.
 *
 * @remarks The row is one Tab stop; the arrow keys rove between entries
 * (Home / End jump to the ends) and Escape drops focus, clearing the
 * emphasis. Each entry holds one line, revealing a clipped name on hover or
 * focus ({@link MapLegendEntry}).
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
				// The panel's column is capped (`grid-cols-1` tracks at `minmax(0,1fr)`)
				// rather than left to size itself. An implicit track is max-content, and
				// an entry whose name never wraps contributes its whole name to that —
				// so the track grew past the rail it sits in and the entries overhung the
				// reserved column instead of clipping inside it.
				panel && 'lg:mx-0 lg:w-full lg:grid-cols-1',
			)}
		>
			{items.map((item) => (
				<MapLegendEntry
					key={item.id}
					item={item}
					off={hidden.has(item.id)}
					panel={panel}
					onToggle={onToggle}
					onFocus={onFocus}
				/>
			))}
		</div>
	)
}
