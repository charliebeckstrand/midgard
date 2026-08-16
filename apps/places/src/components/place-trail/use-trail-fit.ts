'use client'

import { type RefObject, useEffectEvent, useLayoutEffect, useState } from 'react'
import { useResizeObserver } from 'ui/hooks'

/**
 * A pixel of slack. `clientWidth` rounds where `getBoundingClientRect` does not,
 * so an exact fit can read as a hair over one and collapse a crumb for nothing.
 */
const SLOP = 1

/** The label and the mark of one crumb — the two boxes a fit trades between. */
type TrailBoxes = {
	/** The crumb itself, which is what the row lays out. */
	item: HTMLElement
	/** The full text. Present in every state, closed to nothing when collapsed. */
	label: HTMLElement
	/** The `…` that stands in for it. Present in every state, closed to nothing when not. */
	mark: HTMLElement
}

/** What a row can hold: how many leading crumbs must give way, and whether the last one still clips. */
export type TrailFit = {
	collapsed: number
	clipped: boolean
}

/** Nothing given way and nothing clipped, which is what an unmeasured row reports. */
const WHOLE: TrailFit = { collapsed: 0, clipped: false }

/**
 * The crumbs of a rendered trail, outermost first.
 *
 * Reads the boxes {@link PlaceTrail} marks with `data-trail-label` and
 * `data-trail-mark` rather than taking a ref for each: the trail renders both,
 * the measure only reads them, and a ref per crumb would need a registry that
 * a query answers in one line.
 */
function boxesOf(row: HTMLElement): TrailBoxes[] {
	const crumbs: TrailBoxes[] = []

	for (const item of row.querySelectorAll<HTMLElement>('[data-slot=breadcrumb-item]')) {
		const label = item.querySelector<HTMLElement>('[data-trail-label]')
		const mark = item.querySelector<HTMLElement>('[data-trail-mark]')

		if (label && mark) crumbs.push({ item, label, mark })
	}

	return crumbs
}

/**
 * What the row can hold.
 *
 * Answers from what the row shows now plus what each box would give back, never
 * from a pass with everything expanded: `scrollWidth` reports a label's full
 * width even when its box is closed to nothing, so both readings hold in either
 * state and the answer is the same whatever the row happens to be showing when
 * it is asked. That is what keeps the measure from oscillating — the collapse it
 * causes cannot change the number it computes.
 *
 * `clipped` falls out of the same arithmetic rather than a second reading: what
 * is left over once every step above the title has gone to its mark is what the
 * title is short by, and that is a number about the layout this answer will
 * cause — where a measurement would report the one it replaces.
 */
function fitOf(row: HTMLElement): TrailFit {
	const crumbs = boxesOf(row)

	const last = crumbs.at(-1)

	// One crumb is a title with nothing above it to give way.
	if (last === undefined || crumbs.length < 2) return WHOLE

	const room = row.clientWidth

	// What the trail would take with every label whole and no mark shown: what it
	// takes now, plus the width each label is short of its text, less the marks.
	let need = last.item.getBoundingClientRect().right - row.getBoundingClientRect().left

	for (const { label, mark } of crumbs) {
		need += label.scrollWidth - label.clientWidth - mark.clientWidth
	}

	let collapsed = 0

	// Leftmost first, and never the last: the title holds its place, and clips
	// only once every step above it has already gone to its mark.
	for (const { label, mark } of crumbs.slice(0, -1)) {
		if (need <= room + SLOP) break

		need -= Math.max(0, label.scrollWidth - mark.scrollWidth)
		collapsed++
	}

	return { collapsed, clipped: need > room + SLOP }
}

/**
 * What a trail's row at `ref` can hold, for crumbs reading `labels`.
 *
 * @remarks
 * Re-measures on resize, on a change of labels, and once after
 * `document.fonts.ready` — a late font changes what the text takes without
 * changing the box that holds it, so no observer would otherwise fire. The
 * labels measure runs as a layout effect, so a trail is never painted at the
 * wrong fit.
 * @returns The fit, whole until the first measurement.
 */
export function useTrailFit(ref: RefObject<HTMLElement | null>, labels: string): TrailFit {
	const [fit, setFit] = useState(WHOLE)

	const measure = useEffectEvent(() => {
		const row = ref.current

		if (!row) return

		const next = fitOf(row)

		setFit((held) =>
			held.collapsed === next.collapsed && held.clipped === next.clipped ? held : next,
		)
	})

	useResizeObserver(ref, measure)

	// Once, and not per change of labels: fonts settle for the page's life, so a
	// subscription per navigation would only measure a second time for an answer
	// the first already had.
	useLayoutEffect(() => {
		let cancelled = false

		document.fonts?.ready.then(() => {
			if (!cancelled) measure()
		})

		return () => {
			cancelled = true
		}
	}, [])

	// `labels` is the trigger rather than something this body reads — the measure
	// reads the rendered row — which is why the rule cannot see the dependency.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `labels` is the trigger; the measure reads the DOM
	useLayoutEffect(() => {
		measure()
	}, [labels])

	return fit
}
