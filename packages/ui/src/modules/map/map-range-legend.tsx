'use client'

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useState } from 'react'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'

/** Props for {@link MapRangeLegend}. @internal */
export type MapRangeLegendProps = {
	/** The ordered CSS colour stops the scale bar paints, low → high. */
	colorRange: string[]
	/** The value extent the bar spans, `[low, high]`. */
	domain: [number, number]
	/** Formats the endpoint and bin labels. */
	format: (value: number) => string
	/** Optional caption above the bar — the value's name. */
	label?: string
	/** The bin count; the bar snaps to these bands. */
	bins: number
	/** Emphasises a bin's regions (`null` clears); other regions dim while set — the filter. */
	onFocus: (id: string | null) => void
}

/**
 * The choropleth's range legend: a continuous vertical colour-scale bar — the
 * scheme's gradient, low at the bottom to high at the top — with the domain
 * endpoints labelled. The heatmap counterpart to the binned switchboard.
 *
 * @remarks A vertical slider: pointing the bar, or arrowing it once focused
 * (Up / Down step bins, Home / End jump to the ends), snaps to a bin and
 * emphasises its regions — the same filter the switchboard fires — dimming the
 * rest, with the snapped band marked by a thumb. Screen readers get the bin's
 * value range through `aria-valuetext` and full parity from the visually-hidden
 * data table.
 * @internal
 */
export function MapRangeLegend({
	colorRange,
	domain,
	format,
	label,
	bins,
	onFocus,
}: MapRangeLegendProps) {
	const [min, max] = domain

	const [active, setActive] = useState<number | null>(null)

	// Paint the bar with the raw stops — CSS interpolates a smooth ramp; low at
	// the bottom, high at the top. A single stop degrades to a flat fill.
	const gradient: CSSProperties =
		colorRange.length > 1
			? { backgroundImage: `linear-gradient(to top, ${colorRange.join(', ')})` }
			: { backgroundColor: colorRange[0] }

	const step = (max - min) / bins

	const binLabel = (bin: number): string => {
		const low = min + bin * step

		const high = bin === bins - 1 ? max : min + (bin + 1) * step

		return `${format(low)}–${format(high)}`
	}

	// Emphasise a bin's regions — the switchboard's hover filter — and mark it.
	const emphasize = (bin: number) => {
		const next = Math.min(bins - 1, Math.max(0, bin))

		if (next === active) return

		setActive(next)

		onFocus(`category:${next}`)
	}

	const clear = () => {
		setActive(null)

		onFocus(null)
	}

	// Snap the pointer to the bin under it (0 at the bottom / low end).
	const snap = (event: PointerEvent<HTMLDivElement>) => {
		const { top, height } = event.currentTarget.getBoundingClientRect()

		emphasize(Math.floor((1 - (event.clientY - top) / height) * bins))
	}

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const current = active ?? 0

		if (event.key === 'ArrowUp' || event.key === 'ArrowRight') emphasize(current + 1)
		else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') emphasize(current - 1)
		else if (event.key === 'Home') emphasize(0)
		else if (event.key === 'End') emphasize(bins - 1)
		else if (event.key === 'Escape') event.currentTarget.blur()
		else return

		event.preventDefault()
	}

	return (
		<div data-slot="map-legend-box" className="shrink-0">
			<div data-slot="map-range-legend" className="flex flex-col gap-1.5">
				{label && (
					<Text as="span" size="sm" className="leading-tight">
						{label}
					</Text>
				)}

				<div className="flex h-40 items-stretch gap-2">
					<div
						data-slot="map-range-track"
						role="slider"
						tabIndex={0}
						aria-label={label ?? 'Value'}
						aria-orientation="vertical"
						aria-valuemin={0}
						aria-valuemax={bins - 1}
						aria-valuenow={active ?? 0}
						aria-valuetext={active === null ? undefined : binLabel(active)}
						className={cn('relative w-5', k.focus)}
						style={gradient}
						onPointerMove={snap}
						onPointerLeave={clear}
						onFocus={() => emphasize(active ?? 0)}
						onBlur={clear}
						onKeyDown={onKeyDown}
					>
						{active !== null && (
							<div
								aria-hidden="true"
								data-slot="map-range-marker"
								className="absolute -inset-x-0.5 h-1.5 -translate-y-1/2 bg-white shadow-sm ring-1 ring-black/20"
								style={{ top: `${(1 - (active + 0.5) / bins) * 100}%` }}
							/>
						)}
					</div>

					<div className="flex flex-col justify-between py-0.5">
						<Text as="span" severity="muted" size="sm" className="tabular-nums leading-none">
							{format(max)}
						</Text>

						<Text as="span" severity="muted" size="sm" className="tabular-nums leading-none">
							{format(min)}
						</Text>
					</div>
				</div>
			</div>
		</div>
	)
}
