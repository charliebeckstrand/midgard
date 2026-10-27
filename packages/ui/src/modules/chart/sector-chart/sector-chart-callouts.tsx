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
import { sliceShares } from './sector-chart-frame'
import { labelDelay, sliceGroupClass, useSliceReflowed } from './sector-chart-marks'

/** A placed callout with its resolved label text. @internal */
type CalloutLabel = PieCallout & { text: string }

/** The classes of a callout label. The measurement of its width sets the same classes. @internal */
export const CALLOUT_TEXT_CLASS = cn('font-medium', k.tick)

/** What a callout's text reads: the slice name plus its percent share. @internal */
export type CalloutText = {
	labels: string[]
	/** Formats a `0..1` share, in the ambient locale. */
	percent: (share: number) => string
}

/**
 * The callout texts of one render, indexed like the values. Each set formats
 * once, and the room, the fits, and the labels read it. Both sets are empty
 * when the callouts are off.
 *
 * @internal
 */
export type CalloutTexts = {
	/** The texts over the whole dataset, which size the frame. */
	full: string[]
	/** The texts over the visible slices, which the pie draws. It is `full` when no slice is hidden. */
	shown: string[]
}

/** A callout pie fitted to a frame width. @internal */
type CalloutFitAt = (frameWidth: number) => PieCalloutFit

/**
 * The callout texts, their width, and the fits of one render. A fit runs once
 * for each frame width, so the frame sizing, the callout gate, and the drawing
 * share it.
 *
 * @internal
 */
export type CalloutSpec = CalloutTexts & {
	/** The rendered width of a callout text. */
	textWidth: TextWidth
	/** The fit of the whole dataset. */
	fit: CalloutFitAt
	/** The fit of the visible slices. It is `fit` when no slice is hidden. */
	shownFit: CalloutFitAt
	/** The center x of the visible slices at a radius below their fit. */
	shownCenter: (frameWidth: number, radius: number) => number
}

/** One callout's text: the slice name trailed by its percent share. @internal */
function calloutLabelText({ labels, percent }: CalloutText, index: number, share: number): string {
	return `${labels[index] ?? ''} ${percent(share)}`.trim()
}

/** Every row's callout text, indexed like `values`; a row with no slice reads `''`. @internal */
function formatTexts(spec: CalloutText, values: (number | null)[]): string[] {
	return sliceShares(values).map((share, index) =>
		share == null ? '' : calloutLabelText(spec, index, share),
	)
}

/**
 * The callout texts of one render: the whole dataset, and the visible slices.
 * The visible set reuses the whole set when no slice is hidden, so each text
 * formats once.
 *
 * @internal
 */
export function calloutTexts(
	show: boolean,
	spec: CalloutText,
	values: (number | null)[],
	sliceValues: (number | null)[],
): CalloutTexts {
	if (!show) return { full: [], shown: [] }

	const full = formatTexts(spec, values)

	return { full, shown: sameElements(values, sliceValues) ? full : formatTexts(spec, sliceValues) }
}

/** Fits the pie of one value set, once for each frame width that a render asks for. @internal */
function fitOnce(values: (number | null)[], texts: string[], textWidth: TextWidth): CalloutFitAt {
	const fits = new Map<number, PieCalloutFit>()

	return (frameWidth) =>
		getOrCompute(fits, frameWidth, () => pieCalloutFit({ values, texts, textWidth, frameWidth }))
}

/**
 * The callout spec of one render: the texts, their width, and one fit for each
 * value set. The visible slices share the fit of the whole dataset when no
 * slice is hidden.
 *
 * @internal
 */
export function resolveCallouts(
	texts: CalloutTexts,
	values: (number | null)[],
	sliceValues: (number | null)[],
	textWidth: TextWidth,
): CalloutSpec {
	const fit = fitOnce(values, texts.full, textWidth)

	return {
		...texts,
		textWidth,
		fit,
		shownFit: texts.shown === texts.full ? fit : fitOnce(sliceValues, texts.shown, textWidth),
		shownCenter: (frameWidth, radius) =>
			pieCalloutCenter({ values: sliceValues, texts: texts.shown, textWidth, frameWidth }, radius),
	}
}

/** The horizontal room the widest callout needs beside the pie; the plain gap when off. @internal */
export function calloutRoom(show: boolean, spec: CalloutSpec): number {
	if (!show) return MARK_GAP * 2

	const widest = spec.full.reduce<number>(
		(max, text) => (text === '' ? max : Math.max(max, spec.textWidth(text))),
		0,
	)

	return CALLOUT_LEADER + CALLOUT_NUB + CALLOUT_GAP + widest
}

/**
 * Whether a callout pie sized to `width` would collapse to the spark floor. The
 * two label columns starve the pie to a sliver, and a pie of that
 * {@link pieCalloutFit fit radius} (`2·radius + 2·vMargin` tall) reads spark.
 * There the callouts drop for a bare pie, which fills the box with the plain
 * gap. Above the floor they fit.
 *
 * @internal
 */
function calloutsSpark(fitRadius: number, vMargin: number, width: number): boolean {
	return isSparkBox(width, 2 * fitRadius + 2 * vMargin)
}

/**
 * Whether the callouts draw at the measured `frameWidth`. They are on where they
 * fit, and off where they would starve the pie to the spark floor (see
 * {@link calloutsSpark}). The chart then falls back to bare marks. Weighed on the full dataset like the frame
 * sizing, so a toggled slice never flips the labels on or off under a steady
 * frame.
 *
 * @internal
 */
export function calloutsShown(
	show: boolean,
	spec: CalloutSpec,
	vMargin: number,
	frameWidth: number,
): boolean {
	if (!show) return false

	return !calloutsSpark(spec.fit(frameWidth).radius, vMargin, frameWidth)
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

	const fit = spec.shownFit(frameWidth)

	if (fit.radius <= maxRadius) return fit

	const radius = Math.max(0, maxRadius)

	return { radius, cx: spec.shownCenter(frameWidth, radius) }
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
