'use client'

import {
	type CSSProperties,
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	useState,
} from 'react'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { useMapHoverState } from './context'
import { categoryLegendId } from './map-categories'

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
export function binOffset(bin: number, bins: number): number {
	if (bins <= 1) return 50

	const centred = 1 - (bin + 0.5) / bins

	const spanned = 1 - bin / (bins - 1)

	return ((centred + spanned) / 2) * 100
}

/**
 * Which way a range legend and its glyph lay out: `'vertical'` stands the scale
 * bar on end (low at the bottom, high at the top), `'horizontal'` lays it flat
 * (low at the left, high at the right).
 *
 * @internal
 */
export type RangeOrientation = 'horizontal' | 'vertical'

/** Props for {@link RangeArrow}. @internal */
export type RangeArrowProps = {
	/** The class the glyph points at, spread across the bar via {@link binOffset}. */
	bin: number
	/** The scale's class count — the divisor {@link binOffset} spreads the glyph across. */
	bins: number
	/** The `data-slot` prefix, matching the host legend's. @defaultValue 'range' */
	slot?: string
	/**
	 * Which way the host bar runs, so the glyph pins to the matching edge: down
	 * the left of a vertical bar (apex right), along the top of a horizontal one
	 * (apex down).
	 * @defaultValue 'vertical'
	 */
	orientation?: RangeOrientation
}

/**
 * The range legend's hover glyph: an arrow pinned to the bar's edge at a class's
 * mark, apex to the bar. Presentational — the host supplies the `bin` from its
 * own hover state (a region on the choropleth, a cell on the heatmap), so the
 * same glyph ties either chart's marks to the scale. It rides the low→high axis
 * the bar paints: down the left of a vertical bar, along the top of a horizontal
 * one, whose class offset is the vertical measure mirrored (low now leads at the
 * left).
 *
 * @internal
 */
export function RangeArrow({
	bin,
	bins,
	slot = 'range',
	orientation = 'vertical',
}: RangeArrowProps) {
	if (orientation === 'horizontal') {
		return (
			<svg
				data-slot={`${slot}-arrow`}
				aria-hidden="true"
				viewBox="0 0 10 6"
				className={cn(
					'absolute bottom-full mb-1 h-1.5 w-2.5 -translate-x-1/2 transition-[left] duration-150 ease-out',
					k.arrow,
				)}
				style={{ left: `${100 - binOffset(bin, bins)}%` }}
				fill="currentColor"
			>
				<path d="M0 0 10 0 5 6Z" />
			</svg>
		)
	}

	return (
		<svg
			data-slot={`${slot}-arrow`}
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

/** Props for {@link RangeLegend}. @internal */
export type RangeLegendProps = {
	/** The ordered CSS colour stops the scale bar paints, low → high. */
	colorRange: string[]
	/** The value extent the bar spans, `[low, high]`. */
	domain: [number, number]
	/** Formats the endpoint and bin labels. */
	format: (value: number) => string
	/** Optional caption above the bar — the value's name. */
	label?: string
	/** The bin count; the bar snaps its classes to these bands. */
	bins: number
	/**
	 * The `data-slot` prefix each host stamps its parts with, so their hooks and
	 * tests key off distinct names (`map-range-track`, `heatmap-range-track`).
	 * @defaultValue 'range'
	 */
	slot?: string
	/**
	 * Reads the class the probe lands in as the pointer or caret moves, `null`
	 * when it clears — the host emphasises that class's marks (regions, cells).
	 */
	onProbe?: (bin: number | null) => void
	/**
	 * A glyph pinned into the track — a {@link RangeArrow} the host wires to its
	 * own mark hover, marking the hovered mark's class on the bar.
	 */
	arrow?: ReactNode
	/**
	 * Which way the scale bar runs: `'vertical'` stands it on end (low at the
	 * bottom, high at the top) beside the plot, `'horizontal'` lays it flat (low
	 * at the left, high at the right) above or below. Drives the gradient, the
	 * pointer axis, the endpoint order, the thumb, and `aria-orientation`, so a
	 * horizontal bar reads and answers the keyboard along its own axis.
	 * @defaultValue 'vertical'
	 */
	orientation?: RangeOrientation
}

/** The class-centre context {@link rangeKeyValue} walks. @internal */
type RangeKeyContext = {
	min: number
	max: number
	step: number
	bins: number
	binOf: (value: number) => number
}

/**
 * The value a range-legend arrow key reads, or `null` for a key the slider
 * ignores. Up / Right step a class toward the max, Down / Left toward the min,
 * Home / End jump to the ends — both arrow pairs so either orientation answers
 * its natural axis. Escape blurs instead and is handled by the caller.
 *
 * @internal
 */
function rangeKeyValue(key: string, probe: number | null, ctx: RangeKeyContext): number | null {
	const { min, max, step, bins, binOf } = ctx

	const centre = (bin: number) => min + (Math.min(bins - 1, Math.max(0, bin)) + 0.5) * step

	const current = probe === null ? 0 : binOf(probe)

	if (key === 'ArrowUp' || key === 'ArrowRight') return centre(current + 1)

	if (key === 'ArrowDown' || key === 'ArrowLeft') return centre(current - 1)

	if (key === 'Home') return min

	if (key === 'End') return max

	return null
}

/** Props for {@link RangeScaleLabels}. @internal */
type RangeScaleLabelsProps = {
	/** The bar's `[low, high]` extent, labelled at the ends. */
	domain: [number, number]
	/** Formats each endpoint and the live readout. */
	format: (value: number) => string
	/** The probed value, or `null` at rest — dims the endpoints and shows the readout. */
	probe: number | null
	/** The probe's distance along the bar as a percentage from the start. */
	probeOffset: number
	/** The bar runs horizontally, so the ends read left-to-right and the readout tracks `left`. */
	horizontal: boolean
	/** The host's `data-slot` prefix. */
	slot: string
}

/**
 * The scale bar's endpoint labels and its live value readout, transposed with
 * the bar: the low value leads a horizontal bar (left) or trails a vertical one
 * (bottom), and the readout tracks the probe along the matching axis. The
 * endpoints dim while a probe is live so the readout reads clear over them.
 *
 * @internal
 */
function RangeScaleLabels({
	domain: [min, max],
	format,
	probe,
	probeOffset,
	horizontal,
	slot,
}: RangeScaleLabelsProps) {
	const endpoint = cn(
		'tabular-nums leading-none transition-opacity',
		probe !== null && 'opacity-30',
	)

	return (
		<div className={cn('relative flex justify-between', horizontal ? 'flex-row' : 'flex-col')}>
			{/* The endpoint that leads the reading order: the low value at a horizontal
			    bar's left, the high value at a vertical bar's top. */}
			<Text as="span" severity="muted" size="sm" className={endpoint}>
				{format(horizontal ? min : max)}
			</Text>

			<Text as="span" severity="muted" size="sm" className={endpoint}>
				{format(horizontal ? max : min)}
			</Text>

			{probe !== null && (
				<Text
					as="span"
					size="sm"
					aria-hidden="true"
					data-slot={`${slot}-value`}
					className={cn(
						'absolute tabular-nums leading-none whitespace-nowrap',
						horizontal ? 'top-0 -translate-x-1/2' : 'left-0 -translate-y-1/2',
					)}
					style={horizontal ? { left: `${probeOffset}%` } : { top: `${probeOffset}%` }}
				>
					{format(probe)}
				</Text>
			)}
		</div>
	)
}

/**
 * The probe's distance along the bar as a percentage from the reading start: 0%
 * at the top (max) of a vertical bar, 0% at the left (min) of a horizontal one.
 * `null` (at rest) and a degenerate zero-span domain both sit at the start.
 *
 * @internal
 */
function probePercent(probe: number | null, domain: [number, number], horizontal: boolean): number {
	const [min, max] = domain

	const span = max - min

	if (probe === null || span <= 0) return 0

	const fraction = (probe - min) / span

	return (horizontal ? fraction : 1 - fraction) * 100
}

/** Props for {@link RangeTrack}. @internal */
type RangeTrackProps = {
	/** The host's `data-slot` prefix — the track, marker, and value key off it. */
	slot: string
	/** The accessible name and the `role="slider"` label. */
	label?: string
	/** The axis the bar runs along, announced through `aria-orientation`. */
	orientation: RangeOrientation
	/** The bar runs horizontally, so it lays flat and its thumb tracks `left`. */
	horizontal: boolean
	/** The ordered CSS colour stops the gradient paints, low → high. */
	colorRange: string[]
	/** The `[low, high]` value extent — the slider's `aria-valuemin` / `aria-valuemax`. */
	domain: [number, number]
	/** The probed value, or `null` at rest — drives the thumb and `aria-valuenow`. */
	probe: number | null
	/** The probe's distance along the bar, from {@link probePercent}. */
	probeOffset: number
	/** The probed class's range, announced through `aria-valuetext`; absent at rest. */
	valueText?: string
	/** The host's hover glyph pinned into the track. */
	arrow?: ReactNode
	onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
	onPointerLeave: () => void
	onFocus: () => void
	onBlur: () => void
	onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

/**
 * The scale bar itself: the gradient-painted `role="slider"` track, the thumb
 * marking the live probe, and the host's hover glyph. Transposed by
 * `orientation` — a vertical bar stands narrow and tall with a horizontal thumb,
 * a horizontal bar lays short and wide with a vertical one — so the same slider
 * reads either way.
 *
 * @internal
 */
function RangeTrack({
	slot,
	label,
	orientation,
	horizontal,
	colorRange,
	domain: [min, max],
	probe,
	probeOffset,
	valueText,
	arrow,
	onPointerMove,
	onPointerLeave,
	onFocus,
	onBlur,
	onKeyDown,
}: RangeTrackProps) {
	// Paint the bar with the raw stops — CSS interpolates a smooth ramp: low at
	// the bottom of a vertical bar, at the left of a horizontal one; high at the
	// far end either way. A single stop degrades to a flat fill.
	const gradient: CSSProperties =
		colorRange.length > 1
			? {
					backgroundImage: `linear-gradient(to ${horizontal ? 'right' : 'top'}, ${colorRange.join(', ')})`,
				}
			: { backgroundColor: colorRange[0] }

	return (
		<div
			data-slot={`${slot}-track`}
			role="slider"
			tabIndex={0}
			aria-label={label ?? 'Value'}
			aria-orientation={orientation}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={probe ?? min}
			aria-valuetext={valueText}
			className={cn('relative', horizontal ? 'h-5 w-full' : 'w-5', k.focus)}
			style={gradient}
			onPointerMove={onPointerMove}
			onPointerLeave={onPointerLeave}
			onFocus={onFocus}
			onBlur={onBlur}
			onKeyDown={onKeyDown}
		>
			{probe !== null && (
				<div
					aria-hidden="true"
					data-slot={`${slot}-marker`}
					className={cn(
						'absolute bg-white shadow-sm ring-1 ring-black/20',
						horizontal
							? '-inset-y-0.5 w-0.5 -translate-x-1/2'
							: '-inset-x-0.5 h-0.5 -translate-y-1/2',
					)}
					style={horizontal ? { left: `${probeOffset}%` } : { top: `${probeOffset}%` }}
				/>
			)}

			{arrow}
		</div>
	)
}

/**
 * The shared range legend: a continuous vertical colour-scale bar — the scheme's
 * gradient, low at the bottom to high at the top — with the domain endpoints
 * labelled. The interactive counterpart to a binned switchboard, shared by the
 * `ChoroplethChart` (through {@link MapRangeLegend}) and the `HeatmapChart` so
 * the two colour-scaled charts read and behave identically. It lives here beside
 * its map wrapper because the range legend was born as the choropleth's; the
 * chart module composes it through the map barrel.
 *
 * @remarks A slider read precisely: pointing the bar tracks the exact value
 * under the cursor — a thumb that follows it and a live value readout — while
 * the host, quantised into classes, emphasises whichever class that value falls
 * in through {@link RangeLegendProps.onProbe} (its response steps at the class
 * edges; the thumb does not). Arrowing it once focused walks the classes (a
 * class at a time toward the max on Up / Right and the min on Down / Left, Home
 * / End to the ends), while `aria-orientation` announces the axis the bar runs
 * along. Screen readers get the class range through `aria-valuetext` and full
 * parity from the host's visually-hidden data table. `orientation` transposes
 * the whole thing — the gradient, the pointer axis, the endpoint order, and the
 * thumb — so a horizontal bar is the same slider laid flat, low at the left.
 * @internal
 */
export function RangeLegend({
	colorRange,
	domain,
	format,
	label,
	bins,
	slot = 'range',
	onProbe,
	arrow,
	orientation = 'vertical',
}: RangeLegendProps) {
	const [min, max] = domain

	const horizontal = orientation === 'horizontal'

	// The value under the cursor / caret, in domain units; null at rest. The
	// pointer sets it continuously, the keyboard to a class centre.
	const [probe, setProbe] = useState<number | null>(null)

	const span = max - min

	const step = span / bins

	// The equal-interval class a value lands in — the host's own binning.
	const binOf = (value: number): number =>
		span > 0 ? Math.min(bins - 1, Math.max(0, Math.floor((value - min) / step))) : 0

	const binLabel = (bin: number): string => {
		const low = min + bin * step

		const high = bin === bins - 1 ? max : min + (bin + 1) * step

		return `${format(low)}–${format(high)}`
	}

	// Read a value: mark it and emphasise the class it falls in — the host is
	// quantised, so its filter is per-class even while the readout stays precise.
	const readValue = (value: number) => {
		const next = Math.min(max, Math.max(min, value))

		setProbe(next)

		onProbe?.(binOf(next))
	}

	const clear = () => {
		setProbe(null)

		onProbe?.(null)
	}

	// Track the pointer to its exact value along the bar: min at the bottom of a
	// vertical bar, at the left of a horizontal one.
	const track = (event: PointerEvent<HTMLDivElement>) => {
		const rect = event.currentTarget.getBoundingClientRect()

		const fraction = horizontal
			? (event.clientX - rect.left) / rect.width
			: 1 - (event.clientY - rect.top) / rect.height

		readValue(min + fraction * span)
	}

	// Arrow keys walk whole classes off the shared {@link rangeKeyValue} — both
	// pairs, so either orientation answers its axis; Escape blurs.
	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Escape') {
			event.currentTarget.blur()

			return
		}

		const value = rangeKeyValue(event.key, probe, { min, max, step, bins, binOf })

		if (value === null) return

		readValue(value)

		event.preventDefault()
	}

	const probeOffset = probePercent(probe, domain, horizontal)

	return (
		<div data-slot={`${slot}-legend`} className="flex flex-col gap-1.5">
			{label && (
				<Text as="span" size="sm" className="leading-tight">
					{label}
				</Text>
			)}

			<div className={cn('flex gap-2', horizontal ? 'w-40 flex-col' : 'h-40 items-stretch')}>
				<RangeTrack
					slot={slot}
					label={label}
					orientation={orientation}
					horizontal={horizontal}
					colorRange={colorRange}
					domain={domain}
					probe={probe}
					probeOffset={probeOffset}
					valueText={probe === null ? undefined : binLabel(binOf(probe))}
					arrow={arrow}
					onPointerMove={track}
					onPointerLeave={clear}
					onFocus={() => readValue(probe ?? min)}
					onBlur={clear}
					onKeyDown={onKeyDown}
				/>

				<RangeScaleLabels
					domain={domain}
					format={format}
					probe={probe}
					probeOffset={probeOffset}
					horizontal={horizontal}
					slot={slot}
				/>
			</div>
		</div>
	)
}

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
	/**
	 * Which way the bar runs — vertical beside the plot, horizontal above or
	 * below it. Follows the resolved placement.
	 * @defaultValue 'vertical'
	 */
	orientation?: RangeOrientation
}

/**
 * The hover arrow: a glyph on the scale bar's edge marking the bin of the region
 * the pointer is on. Isolated as its own {@link useMapHoverState} consumer so a
 * pointer move over the map re-renders only this glyph — never the gradient bar,
 * the thumb, or the endpoint labels. Its edge follows the bar's `orientation`.
 *
 * @internal
 */
function RangeHoverArrow({
	regionCategory,
	bins,
	orientation,
}: {
	regionCategory: (number | null)[]
	bins: number
	orientation: RangeOrientation
}) {
	const { target } = useMapHoverState()

	const bin = target !== null && target.kind === 'region' ? regionCategory[target.index] : null

	if (bin == null) return null

	return <RangeArrow bin={bin} bins={bins} slot="map-range" orientation={orientation} />
}

/**
 * The choropleth's range legend: the shared {@link RangeLegend} scale-bar
 * slider, wired to the map — its hover arrow tracks the pointed region's bin,
 * and probing the bar emphasises that class's regions through `onFocus`, dimming
 * the rest. The `map-range` slot keeps the map's part names. `orientation`
 * follows the resolved placement — vertical beside the plot, horizontal above or
 * below — the wrapper centring a horizontal bar in its stacked row.
 *
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
	orientation = 'vertical',
}: MapRangeLegendProps) {
	const horizontal = orientation === 'horizontal'

	return (
		<div data-slot="map-legend-box" className={cn(horizontal ? 'flex justify-center' : 'shrink-0')}>
			<RangeLegend
				slot="map-range"
				colorRange={colorRange}
				domain={domain}
				format={format}
				label={label}
				bins={bins}
				orientation={orientation}
				onProbe={(bin) => onFocus(bin === null ? null : categoryLegendId(String(bin)))}
				arrow={
					<RangeHoverArrow regionCategory={regionCategory} bins={bins} orientation={orientation} />
				}
			/>
		</div>
	)
}
