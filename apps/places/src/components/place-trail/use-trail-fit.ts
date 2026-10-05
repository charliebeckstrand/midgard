'use client'

import { type RefObject, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { useResizeObserver } from 'ui/hooks'

/** What a row can hold: how many leading crumbs must give way, and whether the last one still clips. */
export type TrailFit = {
	collapsed: number
	clipped: boolean
}

/** Nothing given way and nothing clipped, which is what an unmeasured row reports. */
const WHOLE: TrailFit = { collapsed: 0, clipped: false }

/**
 * What the row can hold.
 *
 * Reads the crumbs that {@link PlaceTrail} marks with `data-trail-label` and
 * `data-trail-mark` rather than taking a ref for each: the trail renders both,
 * the measure only reads them, and a ref per crumb would need a registry that
 * a query answers in one line.
 *
 * Answers from what the row shows now plus what each box would give back, never
 * from a pass with everything expanded: `scrollWidth` reports a label's full
 * width even when its box is closed to nothing, so both readings hold in either
 * state and the answer is the same whatever the row happens to be showing when
 * it is asked. That is what keeps the measure from oscillating — the collapse it
 * causes cannot change the number it computes. The same property lets the
 * trail's inline script answer from the server's markup, before React runs.
 *
 * `clipped` falls out of the same arithmetic rather than a second reading: what
 * is left over once every step above the title has gone to its mark is what the
 * title is short by, and that is a number about the layout this answer will
 * cause — where a measurement would report the one it replaces.
 *
 * @remarks
 * The function refers to nothing outside its own body, because the trail's
 * inline script carries its source text. Keep it so.
 */
export function fitOf(row: HTMLElement): TrailFit {
	// A pixel of slack. `clientWidth` rounds where `getBoundingClientRect` does
	// not, so an exact fit can read as a hair over one and collapse a crumb for
	// nothing.
	const slop = 1

	const labels = row.querySelectorAll<HTMLElement>('[data-trail-label]')
	const marks = row.querySelectorAll<HTMLElement>('[data-trail-mark]')

	const last = labels.length - 1

	// One crumb is a title with nothing above it to give way.
	if (last < 1 || marks.length !== labels.length) return { collapsed: 0, clipped: false }

	const room = row.clientWidth

	// What the row would take with every label whole and no mark shown: what it
	// takes now, to the end of what follows the trail, plus the width each label
	// is short of its text, less the marks.
	const end = row.lastElementChild ?? labels.item(last)

	let need = end.getBoundingClientRect().right - row.getBoundingClientRect().left

	for (let at = 0; at <= last; at++) {
		need += labels.item(at).scrollWidth - labels.item(at).clientWidth - marks.item(at).clientWidth
	}

	let collapsed = 0

	// Leftmost first, and never the last: the title holds its place, and clips
	// only once every step above it has already gone to its mark.
	while (collapsed < last && need > room + slop) {
		need -= Math.max(0, labels.item(collapsed).scrollWidth - marks.item(collapsed).scrollWidth)
		collapsed++
	}

	return { collapsed, clipped: need > room + slop }
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
		let canceled = false

		document.fonts?.ready.then(() => {
			if (!canceled) measure()
		})

		return () => {
			canceled = true
		}
	}, [])

	// The labels of the last measure. New labels change the crumbs in the row, so
	// the row is measured again after that commit, before paint.
	const measuredLabels = useRef<string | null>(null)

	useLayoutEffect(() => {
		if (measuredLabels.current === labels) return

		measuredLabels.current = labels

		measure()
	})

	return fit
}
