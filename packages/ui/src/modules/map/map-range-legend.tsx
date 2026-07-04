'use client'

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useState } from 'react'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { useMapHoverState } from './context'

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
	/** Each region's bin index (`null` = no data), feature-index aligned — maps a hovered region to its bin. */
	regionCategory: (number | null)[]
	/** Emphasises a bin's regions (`null` clears); other regions dim while set — the filter. */
	onFocus: (id: string | null) => void
}

/**
 * A bin's distance down the bar as a percentage: the highest bin near the top
 * (the domain max), the lowest near the bottom (the min). Halfway between
 * seating each bin at its band's centre (extremes inset a half-band) and
 * spreading them end to end (extremes flush to the edges) — so the ends land a
 * quarter-band in, close to the domain labels without touching the rim. A lone
 * bin sits centred.
 *
 * @internal
 */
function binOffset(bin: number, bins: number): number {
	if (bins <= 1) return 50

	const centred = 1 - (bin + 0.5) / bins

	const spanned = 1 - bin / (bins - 1)

	return ((centred + spanned) / 2) * 100
}

/**
 * The hover arrow: a glyph on the scale bar's left edge marking the bin of the
 * region the pointer is on. Isolated as its own {@link useMapHoverState}
 * consumer so a pointer move over the map re-renders only this glyph — never
 * the gradient bar, the thumb, or the endpoint labels.
 *
 * @internal
 */
function RangeHoverArrow({
	regionCategory,
	bins,
}: {
	regionCategory: (number | null)[]
	bins: number
}) {
	const { target } = useMapHoverState()

	const bin = target !== null && target.kind === 'region' ? regionCategory[target.index] : null

	if (bin == null) return null

	// Line the glyph up with the bin's mark on the bar, apex to the bar — the
	// same top-to-bottom mapping the thumb shares.
	return (
		<svg
			data-slot="map-range-arrow"
			aria-hidden="true"
			viewBox="0 0 6 10"
			className={cn(
				'absolute right-full mr-1 h-2.5 w-1.5 -translate-y-1/2 transition-[top] duration-150 ease-out',
				k.arrow,
			)}
			style={{ top: `${binOffset(bin, bins)}%` }}
			fill="currentColor"
		>
			<path d="M0 0 0 10 6 5Z" />
		</svg>
	)
}

/**
 * The choropleth's range legend: a continuous vertical colour-scale bar — the
 * scheme's gradient, low at the bottom to high at the top — with the domain
 * endpoints labelled. The heatmap counterpart to the binned switchboard.
 *
 * @remarks A vertical slider read precisely: pointing the bar tracks the exact
 * value under the cursor — a thumb that follows it and a live value readout —
 * while the map, quantised into classes, emphasises whichever class that value
 * falls in (its response steps at the class edges; the thumb does not). Arrowing
 * it once focused walks the classes (Up / Down a class at a time, Home / End to
 * the ends). Screen readers get the class range through `aria-valuetext` and
 * full parity from the visually-hidden data table.
 * @internal
 */
export function MapRangeLegend({
	colorRange,
	domain,
	format,
	label,
	bins,
	regionCategory,
	onFocus,
}: MapRangeLegendProps) {
	const [min, max] = domain

	// The value under the cursor / caret, in domain units; null at rest. The
	// pointer sets it continuously, the keyboard to a class centre.
	const [probe, setProbe] = useState<number | null>(null)

	// Paint the bar with the raw stops — CSS interpolates a smooth ramp; low at
	// the bottom, high at the top. A single stop degrades to a flat fill.
	const gradient: CSSProperties =
		colorRange.length > 1
			? { backgroundImage: `linear-gradient(to top, ${colorRange.join(', ')})` }
			: { backgroundColor: colorRange[0] }

	const span = max - min

	const step = span / bins

	// The equal-interval class a value lands in — the map's own binning.
	const binOf = (value: number): number =>
		span > 0 ? Math.min(bins - 1, Math.max(0, Math.floor((value - min) / step))) : 0

	const binLabel = (bin: number): string => {
		const low = min + bin * step

		const high = bin === bins - 1 ? max : min + (bin + 1) * step

		return `${format(low)}–${format(high)}`
	}

	// Read a value: mark it and emphasise the class it falls in — the map is
	// quantised, so its filter is per-class even while the readout stays precise.
	const readValue = (value: number) => {
		const next = Math.min(max, Math.max(min, value))

		setProbe(next)

		onFocus(`category:${binOf(next)}`)
	}

	const clear = () => {
		setProbe(null)

		onFocus(null)
	}

	// Track the pointer to its exact value along the bar (min at the bottom).
	const track = (event: PointerEvent<HTMLDivElement>) => {
		const { top, height } = event.currentTarget.getBoundingClientRect()

		readValue(min + (1 - (event.clientY - top) / height) * span)
	}

	// The keyboard walks whole classes, parking the caret at the class centre.
	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const current = probe === null ? 0 : binOf(probe)

		const centre = (bin: number) => min + (Math.min(bins - 1, Math.max(0, bin)) + 0.5) * step

		if (event.key === 'ArrowUp' || event.key === 'ArrowRight') readValue(centre(current + 1))
		else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') readValue(centre(current - 1))
		else if (event.key === 'Home') readValue(min)
		else if (event.key === 'End') readValue(max)
		else if (event.key === 'Escape') event.currentTarget.blur()
		else return

		event.preventDefault()
	}

	// The caret's distance down the bar: 0% at the top (max) → 100% at the bottom (min).
	const probeTop = probe === null || span <= 0 ? 0 : (1 - (probe - min) / span) * 100

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
						aria-valuemin={min}
						aria-valuemax={max}
						aria-valuenow={probe ?? min}
						aria-valuetext={probe === null ? undefined : binLabel(binOf(probe))}
						className={cn('relative w-5', k.focus)}
						style={gradient}
						onPointerMove={track}
						onPointerLeave={clear}
						onFocus={() => readValue(probe ?? min)}
						onBlur={clear}
						onKeyDown={onKeyDown}
					>
						{probe !== null && (
							<div
								aria-hidden="true"
								data-slot="map-range-marker"
								className="absolute -inset-x-0.5 h-0.5 -translate-y-1/2 bg-white shadow-sm ring-1 ring-black/20"
								style={{ top: `${probeTop}%` }}
							/>
						)}

						<RangeHoverArrow regionCategory={regionCategory} bins={bins} />
					</div>

					<div className="relative flex flex-col justify-between">
						<Text
							as="span"
							severity="muted"
							size="sm"
							className={cn(
								'tabular-nums leading-none transition-opacity',
								probe !== null && 'opacity-30',
							)}
						>
							{format(max)}
						</Text>

						<Text
							as="span"
							severity="muted"
							size="sm"
							className={cn(
								'tabular-nums leading-none transition-opacity',
								probe !== null && 'opacity-30',
							)}
						>
							{format(min)}
						</Text>

						{probe !== null && (
							<Text
								as="span"
								size="sm"
								aria-hidden="true"
								data-slot="map-range-value"
								className="absolute left-0 -translate-y-1/2 tabular-nums leading-none whitespace-nowrap"
								style={{ top: `${probeTop}%` }}
							>
								{format(probe)}
							</Text>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
