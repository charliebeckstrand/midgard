'use client'

/**
 * The continuous color-scale bar both color-scaled charts read: the heatmap
 * directly, the choropleth through the map module's `MapRangeLegend` wrapper.
 * The engine grammar wants a short kind name here, which would be `range.tsx`.
 * The neighboring `range.ts` already holds the placement resolution. This file
 * therefore carries the compound name, rather than the pair splitting across
 * two spellings of one word.
 */

import {
	type CSSProperties,
	type FocusEvent,
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	useEffect,
	useState,
} from 'react'
import { Text } from '../../../../components/text'
import { cn } from '../../../../core'
import { useStableEvent } from '../../../../hooks/use-stable-event'
import { useIntl } from '../../../../primitives/intl/use-intl'
import { k } from '../../../../recipes/kata/chart'
import type { Orientation } from '../../../../types'
import { binIndex, quantileBinIndex } from '../../../../utilities'
import { clamp } from '../../../../utilities/clamp'
import { holdTextSelection } from '../../../../utilities/hold-text-selection'
import { hasBrowserModifier } from '../../../../utilities/modifier-keys'
import { isPrimaryPress } from '../../../../utilities/primary-press'
import { chartMessages } from '../chart-messages'
import type { LegendBandBreakpoint } from './band'

/**
 * Which way a range legend and its glyph lay out:
 *
 * - `'vertical'` stands the scale bar on end (low at the bottom, high at the
 *   top).
 * - `'horizontal'` lays it flat (low at the left, high at the right).
 *
 * @internal
 */
export type RangeOrientation = Orientation

/**
 * The classes of each part of the bar, for each layout. A `flat` bar lies
 * horizontal at every width: a top or bottom placement. An `sm` or `lg` bar
 * is a side placement. Below that container breakpoint, the frame stacks it
 * under the plot and the bar lies horizontal. From the breakpoint, it stands
 * vertical beside the plot. The layout is CSS, so the server and the first
 * paint draw the bar the way the box lays it out, before a measurement lands.
 * Tailwind finds a class only as a complete literal, so each entry is written
 * out in full.
 *
 * The probe position comes in through `--range-probe`, the probed fraction of
 * the domain from the min. The ramp comes in through `--range-ramp`, the color
 * stops from low to high.
 */
const LAYOUT = {
	flat: {
		box: 'flex justify-center',
		bar: 'w-40 flex-col',
		track: 'h-5 w-full touch-pan-y',
		ramp: 'bg-[linear-gradient(to_right,var(--range-ramp))]',
		labels: 'flex-row',
		value: 'top-0 start-[calc(var(--range-probe)*100%)] -translate-x-1/2',
		marker: '-inset-y-0.5 start-[calc(var(--range-probe)*100%)] w-0.5 -translate-x-1/2',
		flatArrow: '',
		standingArrow: 'hidden',
	},
	sm: {
		box: 'flex justify-center @sm:shrink-0',
		bar: 'w-40 flex-col @sm:h-40 @sm:w-auto @sm:flex-row',
		track: 'h-5 w-full touch-pan-y @sm:h-auto @sm:w-5 @sm:[touch-action:pan-x]',
		ramp: 'bg-[linear-gradient(to_right,var(--range-ramp))] @sm:bg-[linear-gradient(to_top,var(--range-ramp))]',
		labels: 'flex-row @sm:flex-col-reverse',
		value:
			'top-0 start-[calc(var(--range-probe)*100%)] -translate-x-1/2 @sm:top-[calc((1-var(--range-probe))*100%)] @sm:start-0 @sm:translate-x-0 @sm:-translate-y-1/2',
		marker:
			'-inset-y-0.5 start-[calc(var(--range-probe)*100%)] w-0.5 -translate-x-1/2 @sm:top-[calc((1-var(--range-probe))*100%)] @sm:-end-0.5 @sm:-start-0.5 @sm:h-0.5 @sm:w-auto @sm:translate-x-0 @sm:-translate-y-1/2',
		flatArrow: '@sm:hidden',
		standingArrow: 'hidden @sm:block',
	},
	lg: {
		box: 'flex justify-center @lg:shrink-0',
		bar: 'w-40 flex-col @lg:h-40 @lg:w-auto @lg:flex-row',
		track: 'h-5 w-full touch-pan-y @lg:h-auto @lg:w-5 @lg:[touch-action:pan-x]',
		ramp: 'bg-[linear-gradient(to_right,var(--range-ramp))] @lg:bg-[linear-gradient(to_top,var(--range-ramp))]',
		labels: 'flex-row @lg:flex-col-reverse',
		value:
			'top-0 start-[calc(var(--range-probe)*100%)] -translate-x-1/2 @lg:top-[calc((1-var(--range-probe))*100%)] @lg:start-0 @lg:translate-x-0 @lg:-translate-y-1/2',
		marker:
			'-inset-y-0.5 start-[calc(var(--range-probe)*100%)] w-0.5 -translate-x-1/2 @lg:top-[calc((1-var(--range-probe))*100%)] @lg:-end-0.5 @lg:-start-0.5 @lg:h-0.5 @lg:w-auto @lg:translate-x-0 @lg:-translate-y-1/2',
		flatArrow: '@lg:hidden',
		standingArrow: 'hidden @lg:block',
	},
} as const

/** Props for {@link RangeArrow}. @internal */
type RangeArrowProps = {
	/** The exact value the glyph marks along the bar. */
	value: number
	/** The bar's `[low, high]` extent: the axis its endpoints label. */
	domain: [number, number]
	/** The `data-slot` prefix, matching the host legend's. @defaultValue 'range' */
	slot?: string
	/**
	 * The host bar's side breakpoint, as for {@link RangeLegendProps.aside}, so
	 * the glyph pins to the matching edge. It goes along the top of a horizontal
	 * bar (apex down), and down the left of a vertical one (apex right). Unset,
	 * the bar lies flat.
	 */
	aside?: LegendBandBreakpoint
}

/**
 * The range legend's hover glyph: an arrow pinned to the bar's edge at a mark's
 * exact value. That is the same continuous position the probe thumb reads, so
 * the glyph never contradicts the axis the endpoints label. A class-center
 * placement instead drifts rimward as the class count grows. An eleven-class
 * bar seats its lowest center below where the minimum label reads, so a
 * small-but-real value looked pinned to the floor.
 *
 * The glyph is presentational. The host supplies the `value` from its own hover
 * state: a region on the choropleth, a cell on the heatmap. The same glyph
 * therefore ties either chart's marks to the scale. It rides the low→high axis
 * the bar paints: along the top of a horizontal bar, down the left of a
 * vertical one. A side bar changes its axis at a container breakpoint, so it
 * draws both glyphs and CSS shows the one that matches the bar.
 *
 * @internal
 */
export function RangeArrow({ value, domain, slot = 'range', aside }: RangeArrowProps) {
	const layout = LAYOUT[aside ?? 'flat']

	const fraction = probeFraction(value, domain)

	return (
		<>
			<svg
				data-slot={`${slot}-arrow`}
				data-orientation="horizontal"
				aria-hidden="true"
				viewBox="0 0 10 6"
				className={cn(
					'absolute bottom-full mb-1 h-1.5 w-2.5 -translate-x-1/2 motion-safe:transition-[left] duration-150 ease-out',
					layout.flatArrow,
					k.arrow,
				)}
				style={{ left: `${fraction * 100}%` }}
				fill="currentColor"
			>
				<path d="M0 0 10 0 5 6Z" />
			</svg>

			{aside && (
				<svg
					data-slot={`${slot}-arrow`}
					data-orientation="vertical"
					aria-hidden="true"
					viewBox="0 0 6 10"
					className={cn(
						// The arrow renders in the `dir="ltr"` block of the legend, so the start
						// side is the left of the bar.
						'absolute end-full me-1 h-2.5 w-1.5 -translate-y-1/2 motion-safe:transition-[top] duration-150 ease-out',
						layout.standingArrow,
						k.arrow,
					)}
					style={{ top: `${(1 - fraction) * 100}%` }}
					fill="currentColor"
				>
					<path d="M0 0 0 10 6 5Z" />
				</svg>
			)}
		</>
	)
}

/**
 * The scale a range bar paints: the ramp, the extent it spans, and how its
 * labels read. Named apart from {@link RangeLegendProps} because every host
 * wrapper passes exactly this through, the choropleth's and the heatmap's
 * alike. The pass-through therefore has one definition, not one per host.
 *
 * @internal
 */
export type RangeScale = {
	/** The ordered CSS color stops the scale bar paints, low → high. */
	colorRange: string[]
	/** The value extent the bar spans, `[low, high]`. */
	domain: [number, number]
	/** Formats the endpoint and bin labels. */
	format: (value: number) => string
	/** Optional caption above the bar: the value's name. */
	label?: string
	/** The bin count; the bar snaps its classes to these bands. */
	bins: number
	/**
	 * The class edges the host assigns values by, low → high: a value that
	 * meets or passes an edge reads into the class above it. The host passes
	 * them under `'quantile'` binning. Absent, the classes are equal intervals
	 * of the domain, which is how `'linear'` binning assigns them.
	 */
	thresholds?: readonly number[]
}

/** Props for {@link RangeLegend}. @internal */
export type RangeLegendProps = RangeScale & {
	/**
	 * The `data-slot` prefix each host stamps its parts with, so their hooks and
	 * tests key off distinct names (`map-range-track`, `heatmap-range-track`).
	 * @defaultValue 'range'
	 */
	slot?: string
	/**
	 * Reads the class the probe lands in as the pointer or caret moves, `null`
	 * when it clears: the host emphasizes that class's marks (regions, cells).
	 */
	onProbe?: (bin: number | null) => void
	/**
	 * A glyph pinned into the track: a {@link RangeArrow} the host wires to its
	 * own mark hover. It marks the exact value of the hovered mark on the bar.
	 */
	arrow?: ReactNode
	/**
	 * The container breakpoint from which the bar stands vertical beside the
	 * plot (low at the bottom, high at the top): the breakpoint at which the
	 * host frame puts a side legend beside the plot. Below it, the frame stacks
	 * the legend under the plot, and the bar lies flat (low at the left, high at
	 * the right). Unset, the bar lies flat at every width: a top or bottom
	 * placement.
	 *
	 * CSS container queries draw the gradient, the endpoint order, the thumb,
	 * and the size, so the first paint draws the final layout. The pointer reads
	 * the axis off the drawn track.
	 */
	aside?: LegendBandBreakpoint
	/**
	 * The axis the bar announces through `aria-orientation`: the axis the host
	 * resolves from its measured width. The keyboard answers both arrow pairs,
	 * so it does not depend on it.
	 * @defaultValue 'horizontal'
	 */
	orientation?: RangeOrientation
	/**
	 * The `data-slot` of a box that holds the legend in the layout of its host
	 * (`heatmap-legend-box`, `map-legend-box`). A vertical bar keeps its width
	 * beside the plot, and a horizontal bar centers in its row. Unset, the legend
	 * renders with no box.
	 */
	box?: string
}

/** The class-center context {@link rangeKeyValue} walks. @internal */
type RangeKeyContext = {
	min: number
	max: number
	bins: number
	getBin: (value: number) => number
	/** The `[low, high]` value edges of a class. */
	getEdges: (bin: number) => [number, number]
}

/**
 * The value a range-legend arrow key reads, or `null` for a key the slider
 * ignores:
 *
 * - Up / Right step a class toward the max.
 * - Down / Left step a class toward the min.
 * - Home / End jump to the ends.
 *
 * At rest the slider sits at the min, its `aria-valuenow`. An arrow from rest
 * therefore reads the min, as a keyboard focus does, and does not step past
 * the lowest class. Both arrow pairs answer, so either orientation reads along
 * its natural axis. Escape blurs instead and is handled by the caller.
 *
 * @internal
 */
function rangeKeyValue(key: string, probe: number | null, context: RangeKeyContext): number | null {
	const { min, max, bins, getBin, getEdges } = context

	const center = (bin: number) => {
		const [low, high] = getEdges(clamp(bin, 0, bins - 1))

		return (low + high) / 2
	}

	if (key === 'Home') return min

	if (key === 'End') return max

	const up = key === 'ArrowUp' || key === 'ArrowRight'

	if (!up && key !== 'ArrowDown' && key !== 'ArrowLeft') return null

	if (probe === null) return min

	const current = getBin(probe)

	const direction = up ? 1 : -1

	// Tied thresholds leave a class with no width, whose center reads back into
	// a neighbor. A step walks on until it reaches a class it can land in.
	for (let bin = current + direction; bin >= 0 && bin < bins; bin += direction) {
		const value = center(bin)

		if (getBin(value) !== current) return value
	}

	return center(current)
}

/** Props for {@link RangeScaleLabels}. @internal */
type RangeScaleLabelsProps = {
	/** The bar's `[low, high]` extent, labeled at the ends. */
	domain: [number, number]
	/** Formats each endpoint and the live readout. */
	format: (value: number) => string
	/** The probed value, or `null` at rest: dims the endpoints and shows the readout. */
	probe: number | null
	/** The classes of the bar's layout. */
	layout: (typeof LAYOUT)[keyof typeof LAYOUT]
	/** The host's `data-slot` prefix. */
	slot: string
}

/**
 * The scale bar's endpoint labels and its live value readout, transposed with
 * the bar. The low value comes first in the DOM. It leads a horizontal bar
 * (left) and trails a vertical one (bottom, through a reversed column). The
 * readout tracks the probe along the matching axis. The endpoints dim while a
 * probe is live so the readout reads clear over them.
 *
 * @internal
 */
function RangeScaleLabels({
	domain: [min, max],
	format,
	probe,
	layout,
	slot,
}: RangeScaleLabelsProps) {
	const endpoint = cn(
		'tabular-nums leading-none transition-opacity',
		probe !== null && 'opacity-30',
	)

	return (
		<div className={cn('relative flex justify-between', layout.labels)}>
			<Text as="span" tone="muted" size="sm" className={endpoint}>
				{format(min)}
			</Text>

			<Text as="span" tone="muted" size="sm" className={endpoint}>
				{format(max)}
			</Text>

			{probe !== null && (
				<Text
					as="span"
					size="sm"
					aria-hidden="true"
					data-slot={`${slot}-value`}
					className={cn('absolute tabular-nums leading-none whitespace-nowrap', layout.value)}
				>
					{format(probe)}
				</Text>
			)}
		</div>
	)
}

/**
 * The fraction of the domain from the min to `value`, from `0` to `1`. A value
 * outside the domain pins to its end of the bar, not past it. A degenerate
 * zero-span domain sits at the min.
 *
 * @internal
 */
function probeFraction(value: number, [min, max]: [number, number]): number {
	const span = max - min

	if (span <= 0) return 0

	return clamp((value - min) / span, 0, 1)
}

/** Props for {@link RangeTrack}. @internal */
type RangeTrackProps = {
	/** The host's `data-slot` prefix: the track, marker, and value key off it. */
	slot: string
	/** The accessible name and the `role="slider"` label. */
	label?: string
	/** The axis the bar announces through `aria-orientation`. */
	orientation: RangeOrientation
	/** The classes of the bar's layout. */
	layout: (typeof LAYOUT)[keyof typeof LAYOUT]
	/** The ordered CSS color stops the gradient paints, low → high. */
	colorRange: string[]
	/** The `[low, high]` value extent: the slider's `aria-valuemin` / `aria-valuemax`. */
	domain: [number, number]
	/** The probed value, or `null` at rest: drives the thumb and `aria-valuenow`. */
	probe: number | null
	/** The range of the probed class, or at rest of the class of the min, announced through `aria-valuetext`. */
	valueText: string
	/** The host's hover glyph pinned into the track. */
	arrow?: ReactNode
	onPointerDown: (event: PointerEvent<HTMLDivElement>) => void
	onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
	onPointerLeave: (event: PointerEvent<HTMLDivElement>) => void
	onFocus: (event: FocusEvent<HTMLDivElement>) => void
	onBlur: () => void
	onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

/**
 * The scale bar itself: the gradient-painted `role="slider"` track, the thumb
 * marking the live probe, and the host's hover glyph. The `layout` transposes
 * it. A vertical bar stands narrow and tall with a horizontal thumb, and a
 * horizontal bar lays short and wide with a vertical one. The same slider
 * therefore reads either way.
 *
 * A touch scrubs the bar. The press reads the value under the finger, and a
 * drag along the bar reads on. A drag across the bar scrolls the page. A hold
 * on the bar opens no context menu, because the finger reads the scale there.
 *
 * @internal
 */
function RangeTrack({
	slot,
	label,
	orientation,
	layout,
	colorRange,
	domain: [min, max],
	probe,
	valueText,
	arrow,
	onPointerDown,
	onPointerMove,
	onPointerLeave,
	onFocus,
	onBlur,
	onKeyDown,
}: RangeTrackProps) {
	const intl = useIntl()

	// Paint the bar with the raw stops (CSS interpolates a smooth ramp: low at
	// the bottom of a vertical bar, at the left of a horizontal one; high at the
	// far end either way). The layout's classes run the ramp along the drawn
	// axis. A single stop degrades to a flat fill.
	const ramp = colorRange.length > 1

	const gradient = (
		ramp ? { '--range-ramp': colorRange.join(', ') } : { backgroundColor: colorRange[0] }
	) as CSSProperties

	return (
		<div
			data-slot={`${slot}-track`}
			role="slider"
			tabIndex={0}
			aria-label={label ?? intl.formatMessage(chartMessages.value)}
			aria-orientation={orientation}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={probe ?? min}
			aria-valuetext={valueText}
			// A touch hold here scrubs the scale. It does not open the context menu.
			data-touch-readout=""
			className={cn(
				'relative',
				// A drag along the bar scrubs, and a drag across it scrolls the page.
				layout.track,
				ramp && layout.ramp,
				k.track,
				k.focus,
			)}
			style={gradient}
			onPointerDown={onPointerDown}
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
					className={cn(k.marker, layout.marker)}
				/>
			)}

			{arrow}
		</div>
	)
}

/**
 * The shared range legend: a continuous vertical color-scale bar with the
 * domain endpoints labeled. It paints the scheme's gradient, low at the bottom
 * to high at the top. It is the interactive counterpart to a binned
 * switchboard, shared by the `HeatmapChart` and the `ChoroplethChart`. The
 * choropleth reaches it through the map module's `MapRangeLegend` wrapper. The
 * two color-scaled charts therefore share one slider and one probe behavior.
 *
 * @remarks A slider read precisely. A pointer on the bar tracks the exact value
 * under the cursor, with a thumb that follows it and a live value readout. The
 * host, quantized into classes, emphasizes whichever class that value falls in
 * through {@link RangeLegendProps.onProbe}. Its response steps at the class
 * edges, while the thumb does not. A touch scrubs the bar the same way, from
 * the press to the lift, and a hold there opens no context menu. Arrow keys
 * walk the classes once the bar has focus. Up / Right step toward the max,
 * Down / Left toward the min, and Home / End jump to the ends. The `aria-orientation` attribute announces the axis the
 * bar runs along. Screen readers get the class range through `aria-valuetext`
 * and full parity from the host's visually-hidden data table. The layout
 * transposes the whole thing: the gradient, the pointer axis, the endpoint
 * order, and the thumb. A horizontal bar is therefore the same slider laid
 * flat, low at the left. A side bar takes its axis from a container query
 * ({@link RangeLegendProps.aside}), so it never changes axis after the first
 * paint.
 * @internal
 */
export function RangeLegend({
	colorRange,
	domain,
	format,
	label,
	bins,
	thresholds,
	slot = 'range',
	onProbe,
	arrow,
	aside,
	orientation = 'horizontal',
	box,
}: RangeLegendProps) {
	const [min, max] = domain

	const layout = LAYOUT[aside ?? 'flat']

	// The value under the cursor / caret, in domain units; null at rest. The
	// pointer sets it continuously, the keyboard to a class center.
	const [probe, setProbe] = useState<number | null>(null)

	const span = max - min

	const step = span / bins

	// The class that a value lands in, by the host's own rule: its quantile edges
	// when it passes them, else the equal intervals of `'linear'`. The same
	// functions as the host's `assign`, so a value at an edge lands in one class.
	const getBin = (value: number): number =>
		(thresholds ? quantileBinIndex(value, thresholds) : binIndex(value, domain, bins)) ?? 0

	const getEdges = (bin: number): [number, number] => {
		if (thresholds) return [thresholds[bin - 1] ?? min, thresholds[bin] ?? max]

		return [min + bin * step, bin === bins - 1 ? max : min + (bin + 1) * step]
	}

	const binLabel = (bin: number): string => {
		const [low, high] = getEdges(bin)

		return `${format(low)}–${format(high)}`
	}

	// Read a value: mark it and emphasize the class it falls in (the host is
	// quantized, so its filter is per-class even while the readout stays precise).
	const readValue = (value: number) => {
		const next = clamp(value, min, max)

		setProbe(next)

		onProbe?.(getBin(next))
	}

	const clear = () => {
		setProbe(null)

		onProbe?.(null)
	}

	// A bar that unmounts mid-probe gets no pointerleave or blur, so the host
	// would keep the class emphasized with no legend left to clear it. The host
	// outlives the bar (a spark tier, `legend={false}`), so the unmount clears it.
	const release = useStableEvent(() => {
		if (probe !== null) onProbe?.(null)
	})

	useEffect(() => release, [release])

	// Track the pointer to its exact value along the bar: min at the bottom of a
	// vertical bar, at the left of a horizontal one. CSS decides the axis, so the
	// drawn track names it: a vertical bar is taller than it is wide.
	const track = (event: PointerEvent<HTMLDivElement>) => {
		const rect = event.currentTarget.getBoundingClientRect()

		const fraction =
			rect.width >= rect.height
				? (event.clientX - rect.left) / rect.width
				: 1 - (event.clientY - rect.top) / rect.height

		readValue(min + fraction * span)
	}

	// Arrow keys walk whole classes off the shared {@link rangeKeyValue}: both
	// pairs, so either orientation answers its axis; Escape blurs.
	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (hasBrowserModifier(event)) return

		if (event.key === 'Escape') {
			event.currentTarget.blur()

			return
		}

		const value = rangeKeyValue(event.key, probe, { min, max, bins, getBin, getEdges })

		if (value === null) return

		readValue(value)

		event.preventDefault()
	}

	// The thumb and the readout place themselves from this fraction along the
	// axis the layout draws.
	const probeStyle =
		probe === null
			? undefined
			: ({ '--range-probe': probeFraction(probe, domain) } as CSSProperties)

	const legend = (
		<div data-slot={`${slot}-legend`} className="flex flex-col gap-1.5">
			{label && (
				<Text as="span" size="sm" className="leading-tight">
					{label}
				</Text>
			)}

			{/* The bar is physical: the gradient, the pointer math, the thumb, and the
			    arrow run from the left or the bottom. The end labels must follow the
			    bar, so the block is `ltr` in every page. The caption keeps the page
			    direction. */}
			<div dir="ltr" className={cn('flex gap-2', layout.bar)} style={probeStyle}>
				<RangeTrack
					slot={slot}
					label={label}
					orientation={orientation}
					layout={layout}
					colorRange={colorRange}
					domain={domain}
					probe={probe}
					valueText={binLabel(getBin(probe ?? min))}
					arrow={arrow}
					// A touch has no hover, so the press reads the value under the finger.
					onPointerDown={(event) => {
						if (!isPrimaryPress(event)) return

						holdTextSelection(event)

						track(event)
					}}
					onPointerMove={track}
					// The keyboard side rides `:focus-visible`, the same gate as the ring. A
					// click, or a tab that comes back, focuses the track with no ring, so
					// it reads nothing and keeps nothing.
					onPointerLeave={(event) => {
						// A keyboard user owns the probe while the track shows its ring; a
						// pointer passing off the bar must not wipe their marker, emphasis,
						// and aria-valuenow. A real blur still clears it (onBlur).
						if (!event.currentTarget.matches(':focus-visible')) clear()
					}}
					onFocus={(event) => {
						if (event.currentTarget.matches(':focus-visible')) readValue(probe ?? min)
					}}
					onBlur={clear}
					onKeyDown={onKeyDown}
				/>

				<RangeScaleLabels
					domain={domain}
					format={format}
					probe={probe}
					layout={layout}
					slot={slot}
				/>
			</div>
		</div>
	)

	if (box === undefined) return legend

	return (
		<div data-slot={box} className={layout.box}>
			{legend}
		</div>
	)
}
