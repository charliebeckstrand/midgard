'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatPercent } from '../../../utilities'
import {
	type CalloutMode,
	type CalloutSlice,
	type CardSize,
	calloutMaxWidth,
	sideOf,
	solveCallouts,
} from './pie-chart-callout-layout'

/** One callout card ready to render: its placement, text, and measuring ref. @internal */
export type PieCalloutCard = {
	/** The datum's index — colour, emphasis, and measurement key off it. */
	index: number
	/** The plot edge the card flushes to: `1` right, `-1` left. */
	side: 1 | -1
	/** The card's top in frame px, after declumping. */
	top: number
	/** The slice's name. */
	name: string
	/** The slice's percent share, on its own non-truncating line. */
	share: string
	/** Clockwise order, so the mount reveal can stagger. */
	order: number
	/**
	 * Measured but not shown: the sector-mode or dropped cards, kept mounted so
	 * their sizes hold and the verdict can't flap. Visible cards reveal.
	 */
	hidden: boolean
	/** Registers the card element for measurement. */
	ref: (element: HTMLDivElement | null) => void
}

/** What {@link usePieChartCallouts} resolves each render. @internal */
export type PieCallouts = {
	/** The label mode the solve settled on. */
	mode: CalloutMode
	/** The radius the pie draws at: the shrunk radius under `callout`, `r0` under `sector`. */
	radius: number
	/** The width every card renders at, capping its wrap. */
	maxWidth: number
	/** The placed cards; empty under `sector`. */
	cards: PieCalloutCard[]
}

/** Input for {@link usePieChartCallouts}. @internal */
export type PieCalloutsInput = {
	/** Whether callouts are a candidate at all; off short-circuits to `sector` at `r0`. */
	enabled: boolean
	/** Callouts forced on, so overflow drops cards instead of switching to segment labels. */
	forced: boolean
	frame: { width: number; height: number }
	center: { x: number; y: number }
	/** The unshrunk radius the pie would draw at with no cards. */
	r0: number
	slices: CalloutSlice[]
	/** Each slice's name, keyed by its source index. */
	names: Map<number, string>
}

/** Whether two size maps agree to the half-pixel, so a re-measure that found nothing new can't churn state. @internal */
function sameSizes(a: Map<number, CardSize>, b: Map<number, CardSize>): boolean {
	if (a.size !== b.size) return false

	for (const [index, size] of a) {
		const other = b.get(index)

		if (
			!other ||
			Math.abs(other.width - size.width) > 0.5 ||
			Math.abs(other.height - size.height) > 0.5
		) {
			return false
		}
	}

	return true
}

/**
 * Measures the callout cards and solves their layout. Cards render hidden at
 * the dynamic max-width, get measured in a layout effect — so the solved
 * radius commits before paint, no `r0 → r` pop — then the pure
 * {@link solveCallouts} places them and decides the mode. A `ResizeObserver`
 * re-measures across late font loads and zoom; the frame width already
 * re-renders the whole chart through `usePlotFrame`.
 *
 * The solve is pure and runs in render off the committed `sizes`, so a hover
 * re-render never re-measures. Measurement writes `sizes` only when a box
 * actually moved, and the prior mode is tracked in a ref for the hysteresis,
 * so neither the measure loop nor the mode feedback can churn.
 *
 * @internal
 */
export function usePieChartCallouts(input: PieCalloutsInput): PieCallouts {
	const { enabled, forced, frame, center, r0, slices, names } = input

	const elements = useRef(new Map<number, HTMLDivElement>())

	const [sizes, setSizes] = useState<Map<number, CardSize>>(() => new Map())

	// The last resolved mode, read by the next solve for hysteresis. A ref, not
	// state, so settling it never forces an extra render.
	const modeRef = useRef<CalloutMode>('sector')

	const maxWidth = calloutMaxWidth(frame.width, r0)

	const measure = useCallback(() => {
		const next = new Map<number, CardSize>()

		// `offsetWidth` / `offsetHeight` are the layout box free of the mount
		// scale transform, so measuring mid-reveal never reads a shrunk card.
		for (const [index, element] of elements.current) {
			next.set(index, { width: element.offsetWidth, height: element.offsetHeight })
		}

		setSizes((current) => (sameSizes(current, next) ? current : next))
	}, [])

	// The slice set and the width they wrap at are the only things that move a
	// card's box; re-measure when either changes, guarded so it can't loop.
	const measureKey = `${maxWidth}:${slices.map((slice) => `${slice.index}=${names.get(slice.index) ?? ''}`).join(',')}`

	// biome-ignore lint/correctness/useExhaustiveDependencies: measureKey stands in for the card set and width.
	useLayoutEffect(() => {
		if (!enabled) return

		measure()

		const observer = new ResizeObserver(measure)

		for (const element of elements.current.values()) observer.observe(element)

		return () => observer.disconnect()
	}, [enabled, measure, measureKey])

	const solution = useMemo(() => {
		if (!enabled) return null

		return solveCallouts({ frame, center, slices, sizes, r0, forced, prevMode: modeRef.current })
	}, [enabled, frame, center, slices, sizes, r0, forced])

	modeRef.current = solution?.mode ?? 'sector'

	return useMemo(() => {
		if (!solution) return { mode: 'sector', radius: r0, maxWidth, cards: [] }

		const clockwise = [...slices].sort((a, b) => a.mid - b.mid).map((slice) => slice.index)

		const placed = new Map(solution.placed.map((placement) => [placement.index, placement]))

		// Every slice gets a card so all stay mounted and measured; a slice the
		// solve didn't place (sector mode, or a forced-mode drop) renders hidden.
		const cards: PieCalloutCard[] = slices.map((slice) => {
			const placement = placed.get(slice.index)

			return {
				index: slice.index,
				side: placement?.side ?? sideOf(slice.mid),
				top: placement?.top ?? 0,
				name: names.get(slice.index) ?? '',
				share: formatPercent(slice.share),
				order: clockwise.indexOf(slice.index),
				hidden: placement === undefined,
				ref: (element) => {
					if (element) elements.current.set(slice.index, element)
					else elements.current.delete(slice.index)
				},
			}
		})

		return { mode: solution.mode, radius: solution.radius, maxWidth, cards }
	}, [solution, slices, names, r0, maxWidth])
}
