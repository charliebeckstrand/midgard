'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import type { PlaceFilterValue } from '../../utilities/places-filter'
import { type PlaceLocation, readLocation, writeLocation } from '../../utilities/places-url'
import type { PlaceView } from '../../utilities/places-view'

/**
 * Whether a change is a step the reader can walk back out of.
 *
 * A drill, a crumb, and an opened place are places they went, so each earns a
 * history entry and the browser's Back button undoes it. Narrowing the bar is
 * not: a reader picking through categories would otherwise have to press Back
 * once per pick to leave the page they arrived on.
 */
export type PlaceStep = 'walk' | 'stay'

/** What {@link usePlaceLocation} hands back: where the reader is, and the ways to move them. */
export type PlaceLocationHandle = PlaceLocation & {
	/** Points the map somewhere, as a step the reader can walk back out of. */
	setView: (view: PlaceView) => void
	/** Narrows the bar, without a history entry of its own. */
	setFilter: (filter: PlaceFilterValue) => void
	/** Opens the panel on some places, or closes it with an empty list. */
	setSelected: (selected: readonly string[]) => void
	/**
	 * Points the map somewhere and opens the panel there, as one step.
	 *
	 * One write, because both are the address: written apart, the first would
	 * leave a history entry standing on a map the reader never saw, and the second
	 * would be composed against the address the first had not yet landed.
	 */
	openAt: (view: PlaceView, selected: readonly string[]) => void
	/**
	 * States the view the opening rule settled on, without a history entry.
	 *
	 * It is what makes the address authoritative from the first paint: until the
	 * view is written down, "the world" and "nothing written yet" are the same
	 * empty address, and a reader who walked out to the world would be sent back
	 * by their own reload.
	 */
	settleView: (view: PlaceView) => void
}

/**
 * The reader's place in the app, held in the address bar rather than in state.
 *
 * The address is the one source: every panel reads it, and each of the setters
 * writes it. Held in `useState` these were lost on reload, absent from a shared
 * link, and unreachable by the Back button — while both breadcrumb trails
 * rendered as links that went nowhere.
 */
export function usePlaceLocation(): PlaceLocationHandle {
	const params = useSearchParams()

	const router = useRouter()

	const pathname = usePathname()

	const location = useMemo(() => readLocation(params), [params])

	const write = useCallback(
		(next: PlaceLocation, step: PlaceStep) => {
			const query = writeLocation(next).toString()

			const href = query === '' ? pathname : `${pathname}?${query}`

			// The map owns the screen and nothing on the page scrolls, so a scroll to
			// the top on every drill would be a jump with nowhere to jump to.
			router[step === 'walk' ? 'push' : 'replace'](href, { scroll: false })
		},
		[router, pathname],
	)

	const setView = useCallback(
		(view: PlaceView) => {
			// The open panel is left behind by design: a place picked in one region is
			// not what the reader is looking at once they have gone somewhere else.
			write({ ...location, view, selected: [] }, 'walk')
		},
		[location, write],
	)

	const settleView = useCallback(
		(view: PlaceView) => {
			write({ ...location, view }, 'stay')
		},
		[location, write],
	)

	const setFilter = useCallback(
		(filter: PlaceFilterValue) => {
			write({ ...location, filter }, 'stay')
		},
		[location, write],
	)

	const setSelected = useCallback(
		(selected: readonly string[]) => {
			write({ ...location, selected }, 'walk')
		},
		[location, write],
	)

	const openAt = useCallback(
		(view: PlaceView, selected: readonly string[]) => {
			write({ ...location, view, selected }, 'walk')
		},
		[location, write],
	)

	return { ...location, setView, setFilter, setSelected, settleView, openAt }
}
