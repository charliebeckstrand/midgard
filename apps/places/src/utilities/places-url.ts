import type { DatePickerRelativeValue } from 'ui/date-picker'
import { isCategory, isDay } from '../schemas/place'
import { fromDay, type PlaceFilterValue, toDay } from './places-filter'
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
	 * A `country` of {@link EVERYWHERE} is the world stated outright, which is
	 * what parts it from an address that has not been written yet.
	 */
	view: PlaceView | null
	filter: PlaceFilterValue
	/** The places the open panel stands for, by id. */
	selected: readonly string[]
}

/**
 * What a stated world writes in place of a country name.
 *
 * The world needs a mark of its own, because the alternative is an address that
 * says nothing — and an address that says nothing is one the opening rule
 * answers, so a reader who walked out to the world would be sent back by their
 * own reload. It reads as a word rather than sitting empty, which is what the
 * region picker over the map calls the same thing.
 */
const EVERYWHERE = 'all'

/** The two halves of a day span, as one `YYYY-MM-DD..YYYY-MM-DD` field. */
const SPAN = /^([^.]+)\.\.([^.]+)$/

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

/**
 * Reads the committed spans, dropping any field that is not a day pair.
 *
 * The halves are put to {@link isDay}, which is the schema's own reader: the
 * shape alone would take `2026-13-45` and hand back a date the calendar rolled
 * over into the next year.
 */
function readSpans(params: URLSearchParams): DatePickerRelativeValue[] {
	return list(params, 'when').flatMap((field) => {
		const parts = SPAN.exec(field)

		if (parts === null) return []

		const [, from, to] = parts

		return isDay(from) && isDay(to) ? [{ from: fromDay(from), to: fromDay(to) }] : []
	})
}

/**
 * Where the map is pointed, or `null` where the address has not said.
 *
 * Its own reader, like the two below it: a location moves one part at a time,
 * and a reader that answers the whole address hands back three new values for
 * a write that changed one of them. See {@link readLocation}.
 */
export function readView(params: URLSearchParams): PlaceView | null {
	if (!params.has('country')) return null

	// A `country` naming no country is the world: {@link EVERYWHERE}, and an empty
	// field, which is the mark this app wrote before it had a word for it.
	const country = text(params, 'country')

	return {
		country: country === EVERYWHERE ? null : (country ?? null),
		state: text(params, 'state') ?? null,
	}
}

/** What the map is narrowed to. */
export function readFilter(params: URLSearchParams): PlaceFilterValue {
	const categories = list(params, 'category').filter(isCategory)

	const paint = text(params, 'paint')

	const spans = readSpans(params)

	return {
		...(categories.length > 0 ? { categories } : {}),
		...(paint === 'visited' || paint === 'unvisited' ? { visitedRegions: paint } : {}),
		...(spans.length > 0 ? { visited: spans } : {}),
	}
}

/** The places the open panel stands for. */
export function readSelected(params: URLSearchParams): readonly string[] {
	return list(params, 'place')
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
	return { view: readView(params), filter: readFilter(params), selected: readSelected(params) }
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
		// Always written, never absent: the world is a place the reader chose, and
		// the mark is what says so.
		params.set('country', view.country ?? EVERYWHERE)

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
