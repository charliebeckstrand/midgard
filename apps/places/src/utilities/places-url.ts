import type { DatePickerRelativeValue } from 'ui/date-picker'
import { CATEGORY_VALUES } from '../constants'
import type { PlaceCategory } from '../types'
import { fromDay, type PlaceFilterValue, type PlaceVisitFilter, toDay } from './places-filter'
import type { PlaceView } from './places-view'

/**
 * The reader's place in the app, as the address bar carries it.
 *
 * Everything here is a location and not a preference: where the map is pointed,
 * what it is narrowed to, and which place is open. Held in React state alone
 * these were lost on reload and impossible to send to anyone, while both
 * breadcrumb trails rendered as links that went nowhere.
 *
 * The keys are short and readable, because a reader sees them:
 *
 * - `country`, `state` — where the map is pointed.
 * - `category` — repeated, one per picked category.
 * - `paint` — which regions carry the visited fill.
 * - `when` — repeated, one `YYYY-MM-DD..YYYY-MM-DD` span per committed range.
 * - `place` — repeated, one per place the open panel stands for.
 */
export type PlaceLocation = {
	/**
	 * Where the map is pointed, or `null` where the address states nothing and the
	 * opening rule still has the say.
	 *
	 * A present but empty `country` is the world stated outright, which is what
	 * parts it from an address that has not been written yet. Without that mark
	 * the two are the same empty string, and a reader who walked out to the world
	 * would be sent back to the opening view by their own reload.
	 */
	view: PlaceView | null
	filter: PlaceFilterValue
	/** The places the open panel stands for, by id. */
	selected: readonly string[]
}

/** A day span, as one `YYYY-MM-DD..YYYY-MM-DD` field. */
const SPAN = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/

/** A trimmed value, or `undefined` where the key was absent or empty. */
function text(params: URLSearchParams, key: string): string | undefined {
	const value = params.get(key)?.trim()

	return value === undefined || value === '' ? undefined : value
}

/** Every value under one key, trimmed, dropping the empty ones. */
function list(params: URLSearchParams, key: string): string[] {
	return params
		.getAll(key)
		.map((value) => value.trim())
		.filter((value) => value !== '')
}

/** Reads the committed spans, dropping any field that is not a day pair. */
function readSpans(params: URLSearchParams): DatePickerRelativeValue[] {
	return list(params, 'when').flatMap((field) => {
		const parts = SPAN.exec(field)

		if (parts === null) return []

		const [, from, to] = parts

		return from === undefined || to === undefined ? [] : [{ from: fromDay(from), to: fromDay(to) }]
	})
}

/**
 * Reads an address as a location.
 *
 * Every field is read defensively, because the address bar is an edge like any
 * other: a reader can type into it, and a link can outlive the app that wrote
 * it. A field that no longer parses is dropped rather than thrown over, so a
 * stale link opens the app it can rather than an error.
 */
export function readLocation(params: URLSearchParams): PlaceLocation {
	const categories = list(params, 'category').filter((value): value is PlaceCategory =>
		CATEGORY_VALUES.includes(value as PlaceCategory),
	)

	const paint = text(params, 'paint')

	const spans = readSpans(params)

	const filter: PlaceFilterValue = {
		...(categories.length > 0 ? { categories } : {}),
		...(paint === 'visited' || paint === 'unvisited'
			? { visitedRegions: paint as PlaceVisitFilter }
			: {}),
		...(spans.length > 0 ? { visited: spans } : {}),
	}

	return {
		view: params.has('country')
			? { country: text(params, 'country') ?? null, state: text(params, 'state') ?? null }
			: null,
		filter,
		selected: list(params, 'place'),
	}
}

/**
 * Writes a location as an address, in the key order above.
 *
 * A field the location does not hold is left out entirely, so the address stays
 * as short as what the reader has actually done — and an unstated view writes no
 * `country` at all, which is what {@link PlaceLocation.view} reads back as
 * "the opening rule still has the say".
 */
export function writeLocation({ view, filter, selected }: PlaceLocation): URLSearchParams {
	const params = new URLSearchParams()

	if (view !== null) {
		// Empty rather than absent: the world is a place the reader chose, and the
		// mark is what says so.
		params.set('country', view.country ?? '')

		if (view.state !== null) params.set('state', view.state)
	}

	for (const category of filter.categories ?? []) params.append('category', category)

	if (filter.visitedRegions !== undefined) params.set('paint', filter.visitedRegions)

	for (const span of filter.visited ?? []) {
		params.append('when', `${toDay(span.from)}..${toDay(span.to)}`)
	}

	for (const id of selected) params.append('place', id)

	return params
}
