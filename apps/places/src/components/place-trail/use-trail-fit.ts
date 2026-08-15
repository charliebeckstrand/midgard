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
	/** The full text. Present in every state, closed to nothing when collapsed. */
	label: HTMLElement
	/** The `…` that stands in for it. Present in every state, closed to nothing when not. */
	mark: HTMLElement
}

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

		if (label && mark) crumbs.push({ label, mark })
	}

	return crumbs
}

/**
 * How many leading crumbs the row cannot hold whole.
 *
 * Answers from what the row shows now plus what each box would give back, never
 * from a pass with everything expanded: `scrollWidth` reports a label's full
 * width even when its box is closed to nothing, so both readings hold in either
 * state and the answer is the same whatever the row happens to be showing when
 * it is asked. That is what keeps the measure from oscillating — the collapse it
 * causes cannot change the number it computes.
 */
function fitOf(row: HTMLElement): number {
	const crumbs = boxesOf(row)
	const last = row.querySelector('[data-slot=breadcrumb-list]')?.lastElementChild

	// One crumb is a title with nothing above it to give way.
	if (!last || crumbs.length < 2) return 0

	const room = row.clientWidth

	// What the trail would take with every label whole and no mark shown: what it
	// takes now, plus the width each label is short of its text, less the marks.
	let need = last.getBoundingClientRect().right - row.getBoundingClientRect().left

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

	return collapsed
}

/**
 * How many of a trail's leading crumbs must give way to their mark, for a row
 * at `ref` whose crumbs read `labels`.
 *
 * @remarks
 * Re-measures on resize, on a change of labels, and after `document.fonts.ready`
 * — a late font changes what the text takes without changing the box that holds
 * it, so no observer would otherwise fire. The labels measure runs as a layout
 * effect, so a trail is never painted at the wrong fit.
 * @returns The count of collapsed crumbs, `0` until the first measurement.
 */
export function useTrailFit(ref: RefObject<HTMLElement | null>, labels: string): number {
	const [collapsed, setCollapsed] = useState(0)

	const measure = useEffectEvent(() => {
		const row = ref.current

		if (row) setCollapsed(fitOf(row))
	})

	useResizeObserver(ref, measure)

	// `labels` is the trigger rather than something this body reads — the measure
	// reads the rendered row — which is why the rule cannot see the dependency.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `labels` is the trigger; the measure reads the DOM
	useLayoutEffect(() => {
		measure()

		let cancelled = false

		document.fonts?.ready.then(() => {
			if (!cancelled) measure()
		})

		return () => {
			cancelled = true
		}
	}, [labels])

	return collapsed
}
