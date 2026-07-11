'use client'

import { motion } from 'motion/react'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/chart'
import { formatPercent } from '../../../utilities'
import { MARK_GAP } from '../engine/chart-constants'
import {
	CALLOUT_CHAR_WIDTH,
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
import { isSparkBox } from '../engine/chart-tier'
import { sliceGroupClass, sweepDelay } from './pie-chart-marks'

/** A placed callout with its resolved label text. @internal */
type CalloutLabel = PieCallout & { text: string }

/** What a callout's text reads: the slice name plus its percent share. @internal */
export type CalloutSpec = {
	labels: string[]
}

/** One callout's text: the slice name trailed by its percent share. @internal */
function calloutLabelText({ labels }: CalloutSpec, index: number, share: number): string {
	return `${labels[index] ?? ''} ${formatPercent(share)}`.trim()
}

/** The horizontal room the widest callout needs beside the pie; the plain gap when off. @internal */
export function calloutRoom(
	show: boolean,
	spec: CalloutSpec,
	sliceValues: (number | null)[],
): number {
	if (!show) return MARK_GAP * 2

	const total = sliceValues.reduce<number>(
		(sum, entry) => sum + (entry != null && entry > 0 ? entry : 0),
		0,
	)

	const chars = sliceValues.reduce<number>(
		(widest, entry, index) =>
			entry != null && entry > 0
				? Math.max(widest, calloutLabelText(spec, index, entry / total).length)
				: widest,
		0,
	)

	return CALLOUT_LEADER + CALLOUT_NUB + CALLOUT_GAP + chars * CALLOUT_CHAR_WIDTH
}

/** Every row's callout text, indexed like `sliceValues` — {@link pieCalloutFit}'s per-slice widths. @internal */
function calloutTexts(spec: CalloutSpec, sliceValues: (number | null)[]): string[] {
	const total = sliceValues.reduce<number>(
		(sum, entry) => sum + (entry != null && entry > 0 ? entry : 0),
		0,
	)

	return sliceValues.map((entry, index) =>
		entry != null && entry > 0 && total > 0 ? calloutLabelText(spec, index, entry / total) : '',
	)
}

/**
 * Whether a callout pie sized to `width` would collapse to the spark floor: the
 * two label columns starving the pie to a sliver, the content frame shrinking
 * with it (`2·radius + 2·vMargin` its height) until the box reads spark. There
 * the callouts drop for a bare pie — the frame squares to receive it and the
 * drawing sheds the labels to match; above it they fit and the tight, asymmetric
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
	values: (number | null)[],
	vMargin: number,
): ((width: number) => number) | undefined {
	if (!show) return undefined

	return (frameWidth) => {
		const { radius } = pieCalloutFit({
			values,
			texts: calloutTexts(spec, values),
			charWidth: CALLOUT_CHAR_WIDTH,
			frameWidth,
		})

		// Below the spark floor the labels starve the pie, so size a bare square
		// (`height = width`, the resolver value net of the `2·vMargin` the frame
		// adds) for the dropped-callout pie to fill rather than a collapsing sliver.
		return calloutsSpark(radius, vMargin, frameWidth) ? frameWidth / 2 - vMargin : radius
	}
}

/**
 * Whether the callouts draw at the measured `frameWidth`: on where they fit, off
 * where they would starve the pie to the spark floor (see {@link calloutsSpark}),
 * so it falls back to bare marks. Weighed on the full dataset like the frame
 * sizing, so a toggled slice never flips the labels on or off under a steady
 * frame.
 *
 * @internal
 */
export function calloutsShown(
	show: boolean,
	spec: CalloutSpec,
	values: (number | null)[],
	vMargin: number,
	frameWidth: number,
): boolean {
	if (!show) return false

	const { radius } = pieCalloutFit({
		values,
		texts: calloutTexts(spec, values),
		charWidth: CALLOUT_CHAR_WIDTH,
		frameWidth,
	})

	return !calloutsSpark(radius, vMargin, frameWidth)
}

/**
 * The pie's resolved radius and center: the tight, asymmetric callout fit, or
 * — without callouts — centered at the plain gap the way every chart frame
 * defaults to.
 *
 * @internal
 */
export function resolvePieFit(
	show: boolean,
	spec: CalloutSpec,
	sliceValues: (number | null)[],
	frameWidth: number,
): PieCalloutFit {
	if (!show) return { radius: frameWidth / 2 - MARK_GAP * 2, cx: frameWidth / 2 }

	return pieCalloutFit({
		values: sliceValues,
		texts: calloutTexts(spec, sliceValues),
		charWidth: CALLOUT_CHAR_WIDTH,
		frameWidth,
	})
}

/** Places the callouts around the pie and resolves each label's text. @internal */
export function buildCallouts(
	spec: CalloutSpec,
	slices: PieSlice[],
	center: { x: number; y: number },
	radius: number,
	frameHeight: number,
): CalloutLabel[] {
	const byIndex = new Map(slices.map((slice) => [slice.index, slice]))

	return pieCallouts(slices, {
		cx: center.x,
		cy: center.y,
		radius,
		top: CALLOUT_LINE,
		bottom: frameHeight - CALLOUT_LINE,
	}).map((placed) => {
		const slice = byIndex.get(placed.index)

		return { ...placed, text: slice ? calloutLabelText(spec, placed.index, slice.share) : '' }
	})
}

/** Props for {@link PieCallouts}. @internal */
type PieCalloutsProps = {
	items: CalloutLabel[]
	animate: boolean
	emphasis: number | null
}

/**
 * The callout labels: a muted leader from each slice out to its name and share,
 * set beside the slice. Plain SVG text on the surface — not on a fill — so it
 * takes the chrome ink and dims with its slice under legend emphasis. Under
 * `animate` each callout fades in as the sweep uncovers its slice.
 *
 * @internal
 */
export function PieCallouts({ items, animate, emphasis }: PieCalloutsProps) {
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
							className={cn('font-medium', k.tick)}
						>
							{item.text}
						</text>
					</>
				)

				return (
					<g key={item.index} className={sliceGroupClass(emphasis, item.index)}>
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
