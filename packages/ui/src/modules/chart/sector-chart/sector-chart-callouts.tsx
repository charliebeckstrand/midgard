'use client'

import { motion } from 'motion/react'
import { cn } from '../../../core'
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
	pieCalloutFit,
	pieCallouts,
} from '../engine/chart-geometry/pie'
import { SLICE_FADE, SLICE_UNFADE } from '../engine/chart-motion'
import type { TextWidth } from '../engine/chart-text-width'
import { isSparkBox } from '../engine/chart-tier'
import { useChartSeriesEmphasis } from '../engine/context'
import { sliceGroupClass, sweepDelay } from './sector-chart-marks'

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
}

/** One callout's text: the slice name trailed by its percent share. @internal */
function calloutLabelText({ labels, percent }: CalloutText, index: number, share: number): string {
	return `${labels[index] ?? ''} ${percent(share)}`.trim()
}

/** Every row's callout text, indexed like `values`; a row with no slice reads `''`. @internal */
function textsOf(spec: CalloutText, values: (number | null)[]): string[] {
	const total = values.reduce<number>(
		(sum, entry) => sum + (entry != null && entry > 0 ? entry : 0),
		0,
	)

	return values.map((entry, index) =>
		entry != null && entry > 0 && total > 0 ? calloutLabelText(spec, index, entry / total) : '',
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

	const full = textsOf(spec, values)

	return { full, shown: sameElements(values, sliceValues) ? full : textsOf(spec, sliceValues) }
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
export function calloutSpecOf(
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
	}
}

/** The horizontal room the widest callout needs beside the pie; the plain gap when off. @internal */
export function calloutRoom(show: boolean, spec: CalloutSpec): number {
	if (!show) return MARK_GAP * 2

	const widest = spec.full.reduce<number>(
		(widest, text) => (text === '' ? widest : Math.max(widest, spec.textWidth(text))),
		0,
	)

	return CALLOUT_LEADER + CALLOUT_NUB + CALLOUT_GAP + widest
}

/**
 * Whether a callout pie sized to `width` would collapse to the spark floor. The
 * two label columns starve the pie to a sliver. The content frame shrinks with
 * it (`2·radius + 2·vMargin` its height) until the box reads spark. There the
 * callouts drop for a bare pie: the frame squares to receive it, and the drawing
 * sheds the labels to match. Above the floor they fit, and the tight, asymmetric
 * callout frame holds. Read off the callout {@link pieCalloutFit fit radius} at
 * `width`, so the sizing resolver and the drawing decide it the same way.
 *
 * @internal
 */
function calloutsSpark(fitRadius: number, vMargin: number, width: number): boolean {
	return isSparkBox(width, 2 * fitRadius + 2 * vMargin)
}

/** The frame-sizing radius resolver callouts refine the content-fit height with; `undefined` when they're off. @internal */
export function calloutFitRadius(
	show: boolean,
	spec: CalloutSpec,
	vMargin: number,
): ((width: number) => number) | undefined {
	if (!show) return undefined

	return (frameWidth) => {
		const { radius } = spec.fit(frameWidth)

		// Below the spark floor the labels starve the pie, so size a bare square
		// (`height = width`, the resolver value net of the `2·vMargin` the frame
		// adds) for the dropped-callout pie to fill rather than a collapsing sliver.
		return calloutsSpark(radius, vMargin, frameWidth) ? frameWidth / 2 - vMargin : radius
	}
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
 * The pie's resolved radius and center: the tight, asymmetric callout fit.
 * Without callouts, it is centered at the plain gap, the way every chart frame
 * defaults to.
 *
 * @internal
 */
export function resolveSectorFit(
	show: boolean,
	spec: CalloutSpec,
	frameWidth: number,
): PieCalloutFit {
	if (!show) return { radius: frameWidth / 2 - MARK_GAP * 2, cx: frameWidth / 2 }

	return spec.shownFit(frameWidth)
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
}

/**
 * The callout labels: a muted leader from each slice out to its name and share,
 * set beside the slice. Plain SVG text on the surface — not on a fill — so it
 * takes the chrome ink and dims with its slice under legend emphasis. Under
 * `animate` each callout fades in as the sweep uncovers its slice.
 *
 * @internal
 */
export function SectorChartCallouts({ items, animate, selected = null }: SectorChartCalloutsProps) {
	const emphasis = useChartSeriesEmphasis()

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
							<motion.g
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0, transition: SLICE_UNFADE }}
								transition={{ ...SLICE_FADE, delay: sweepDelay(item.mid) }}
							>
								{callout}
							</motion.g>
						) : (
							callout
						)}
					</g>
				)
			})}
		</g>
	)
}
