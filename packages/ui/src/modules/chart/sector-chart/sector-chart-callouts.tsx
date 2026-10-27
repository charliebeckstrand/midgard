'use client'

import { cn } from '../../../core'
import { usePrefersReducedMotion } from '../../../hooks/use-prefers-reduced-motion'
import * as m from '../../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../../recipes/kata/chart'
import { getOrCompute, sameElements } from '../../../utilities'
import { MARK_GAP } from '../engine/chart-constants'
import {
	CALLOUT_GAP,
	CALLOUT_LEADER,
	CALLOUT_LINE,
	CALLOUT_NUB,
	calloutColumn,
	type PieCallout,
	type PieCalloutFit,
	type PieSlice,
	pieCalloutCenter,
	pieCalloutFit,
	pieCallouts,
} from '../engine/chart-geometry/pie'
import { SLICE_FADE, SLICE_UNFADE } from '../engine/chart-motion'
import type { TextWidth } from '../engine/chart-text-width'
import { isSparkBox } from '../engine/chart-tier'
import { useChartSeriesEmphasis } from '../engine/context'
import type { ChartTextWidth } from '../engine/use-chart-text-width'
import { sliceShares } from './sector-chart-frame'
import { labelDelay, sliceGroupClass, useSliceReflowed } from './sector-chart-marks'

/** A placed callout with its resolved label text. @internal */
type CalloutLabel = PieCallout & { text: string }

/**
 * The classes of a callout label. The measurement of its width sets the same
 * classes. `whitespace-pre` keeps the space before a share, so that the share
 * measures with it.
 *
 * @internal
 */
export const CALLOUT_TEXT_CLASS = cn('font-medium whitespace-pre', k.tick)

/** What a callout's text reads: the slice name plus its percent share. @internal */
export type CalloutText = {
	labels: string[]
	/** Formats a `0..1` share, in the ambient locale. */
	percent: (share: number) => string
}

/**
 * One callout's text in two parts: the slice name, which a narrow column cuts,
 * and the share after it, which stays whole. `null` for a row with no slice.
 *
 * @internal
 */
export type CalloutPart = { name: string; share: string } | null

/**
 * The callout text parts of one render, indexed like the values. Each set
 * formats once. Both sets are empty when the callouts are off.
 *
 * @internal
 */
export type CalloutParts = {
	/** The parts over the whole dataset. */
	full: CalloutPart[]
	/** The parts over the visible slices, which the pie draws. It is `full` when no slice is hidden. */
	shown: CalloutPart[]
}

/** A callout pie fitted to a frame width. @internal */
type CalloutFitAt = (frameWidth: number) => PieCalloutFit

/**
 * The callouts of the visible slices in one render: the texts as they draw,
 * their width, and the fit. A fit runs once for each frame width.
 *
 * @internal
 */
export type CalloutSpec = {
	/** The texts as they draw, indexed like the values. A row with no slice reads `''`. */
	shown: string[]
	/** The rendered width of a callout text. */
	textWidth: TextWidth
	/** The fit of the visible slices. */
	fit: CalloutFitAt
	/** The center x of the visible slices at a radius below their fit. */
	center: (frameWidth: number, radius: number) => number
}

/** One callout's parts: the slice name, and its percent share after a space. @internal */
function calloutPart({ labels, percent }: CalloutText, index: number, share: number): CalloutPart {
	const name = labels[index] ?? ''

	return { name, share: name === '' ? percent(share) : ` ${percent(share)}` }
}

/** Every row's callout parts, indexed like `values`. @internal */
function formatParts(spec: CalloutText, values: (number | null)[]): CalloutPart[] {
	return sliceShares(values).map((share, index) =>
		share == null ? null : calloutPart(spec, index, share),
	)
}

/**
 * The callout text parts of one render: the whole dataset, and the visible
 * slices. The visible set reuses the whole set when no slice is hidden, so each
 * text formats once.
 *
 * @internal
 */
export function calloutParts(
	show: boolean,
	spec: CalloutText,
	values: (number | null)[],
	sliceValues: (number | null)[],
): CalloutParts {
	if (!show) return { full: [], shown: [] }

	const full = formatParts(spec, values)

	return { full, shown: sameElements(values, sliceValues) ? full : formatParts(spec, sliceValues) }
}

/** Every share text of `parts`, each once. @internal */
export function calloutShares(parts: CalloutParts): string[] {
	return [...new Set([...parts.full, ...parts.shown].flatMap((part) => (part ? [part.share] : [])))]
}

/**
 * The room of a callout name: the {@link calloutColumn column} at
 * `frameWidth`, less the widest share. Every share then stays whole beside its
 * name. Unbounded before the width is measured, because nothing draws then.
 *
 * @internal
 */
export function calloutNameRoom(
	frameWidth: number,
	shares: readonly string[],
	shareWidth: TextWidth,
): number {
	if (frameWidth <= 0) return Number.POSITIVE_INFINITY

	const widest = shares.reduce((max, share) => Math.max(max, shareWidth(share)), 0)

	return Math.max(0, calloutColumn(frameWidth) - widest)
}

/**
 * The callout spec of one render. Each visible callout draws its name as
 * `names` cuts it to its room, then its share. The width of a text is the sum
 * of the two measured parts.
 *
 * @internal
 */
export function resolveCallouts(
	parts: CalloutParts,
	sliceValues: (number | null)[],
	names: Pick<ChartTextWidth, 'fit' | 'width'>,
	shareWidth: TextWidth,
): CalloutSpec {
	const widths = new Map<string, number>()

	const shown = parts.shown.map((part) => {
		if (!part) return ''

		const text = `${names.fit(part.name)}${part.share}`

		widths.set(text, names.width(part.name) + shareWidth(part.share))

		return text
	})

	const textWidth: TextWidth = (text) => widths.get(text) ?? 0

	const fits = new Map<number, PieCalloutFit>()

	return {
		shown,
		textWidth,
		fit: (frameWidth) =>
			getOrCompute(fits, frameWidth, () =>
				pieCalloutFit({ values: sliceValues, texts: shown, textWidth, frameWidth }),
			),
		center: (frameWidth, radius) =>
			pieCalloutCenter({ values: sliceValues, texts: shown, textWidth, frameWidth }, radius),
	}
}

/**
 * The fixed horizontal room beside the pie: the leader, the nub, and the gap
 * before a label when the callouts are on, and the plain gap when they are off.
 * `CALLOUT_COLUMN` adds the room of the label. No text width enters
 * it, so the box is the same on the server and in the browser.
 *
 * @internal
 */
export function calloutRoom(show: boolean): number {
	return show ? CALLOUT_LEADER + CALLOUT_NUB + CALLOUT_GAP : MARK_GAP * 2
}

/**
 * Whether the callouts draw in the measured box. They are off where the box
 * reads spark: there the label columns starve the pie, and the chart falls back
 * to a bare pie that fills the box with the plain gap. The box does not depend
 * on the slices, so a toggled slice never flips the labels on or off.
 *
 * @internal
 */
export function calloutsShown(show: boolean, frameWidth: number, frameHeight: number): boolean {
	return show && !isSparkBox(frameWidth, frameHeight)
}

/**
 * The pie's resolved radius and center: the tight, asymmetric callout fit, at
 * most `maxRadius`. The frame height sets that cap. Under the cap, the pie
 * centers between the room that its callouts leave on each side. Without
 * callouts, it is centered at the plain gap, the way every chart frame
 * defaults to.
 *
 * @internal
 */
export function resolveFit(
	show: boolean,
	spec: CalloutSpec,
	frameWidth: number,
	maxRadius: number,
): PieCalloutFit {
	if (!show) {
		return { radius: Math.min(frameWidth / 2 - MARK_GAP * 2, maxRadius), cx: frameWidth / 2 }
	}

	const fit = spec.fit(frameWidth)

	if (fit.radius <= maxRadius) return fit

	const radius = Math.max(0, maxRadius)

	return { radius, cx: spec.center(frameWidth, radius) }
}

/** Places the callouts around the pie, each with the text of its visible slice. @internal */
export function buildCallouts(
	spec: CalloutSpec,
	slices: PieSlice[],
	center: { x: number; y: number },
	radius: number,
	frameHeight: number,
): CalloutLabel[] {
	return pieCallouts(slices, {
		cx: center.x,
		cy: center.y,
		radius,
		top: CALLOUT_LINE,
		bottom: frameHeight - CALLOUT_LINE,
	}).map((placed) => ({ ...placed, text: spec.shown[placed.index] ?? '' }))
}

/** Props for {@link SectorChartCallouts}. @internal */
type SectorChartCalloutsProps = {
	items: CalloutLabel[]
	animate: boolean
	/** The held selection, or `null`; unselected callouts dim with their slices. */
	selected?: ReadonlySet<number> | null
	/** The `sliceLayout` of the drawn slices: a change fades the callouts in again. */
	layout?: string
}

/**
 * The callout labels: a muted leader from each slice out to its name and share,
 * set beside the slice. Plain SVG text on the surface (not on a fill), so it
 * takes the chrome ink and dims with its slice under legend emphasis. Under
 * `animate` each callout fades in as the sweep uncovers its slice. After a
 * legend toggle the callouts leave, and they fade in at their new places when
 * the slices stop.
 *
 * @internal
 */
export function SectorChartCallouts({
	items,
	animate,
	selected = null,
	layout = '',
}: SectorChartCalloutsProps) {
	const emphasis = useChartSeriesEmphasis()

	// The server cannot read the preference, so it renders the callouts at rest.
	const still = usePrefersReducedMotion()

	const reflowed = useSliceReflowed(layout)

	return (
		<g data-slot="chart-callouts" pointerEvents="none">
			{items.map((item) => {
				const callout = (
					<>
						<polyline
							data-slot="chart-callout-leader"
							points={item.leader}
							fill="none"
							strokeWidth={1}
							className={cn(k.axis.line)}
						/>

						<text
							data-slot="chart-callout-label"
							x={item.x}
							y={item.y}
							textAnchor={item.anchor}
							dominantBaseline="central"
							className={CALLOUT_TEXT_CLASS}
						>
							{item.text}
						</text>
					</>
				)

				return (
					<g key={item.index} className={sliceGroupClass(emphasis, item.index, selected)}>
						{animate ? (
							<m.g
								// A new layout mounts the callout again, so it fades in at its new place.
								key={layout}
								initial={still ? false : { opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0, transition: SLICE_UNFADE }}
								transition={{ ...SLICE_FADE, delay: labelDelay(reflowed, item.mid) }}
							>
								{callout}
							</m.g>
						) : (
							callout
						)}
					</g>
				)
			})}
		</g>
	)
}
