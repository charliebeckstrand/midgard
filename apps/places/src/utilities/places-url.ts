import type { DatePickerRelativeValue } from 'ui/date-picker'
import { flags } from '../flags'
import { isCategory, isDay } from '../schemas/place'
import { RECORD_KINDS, type RecordKind } from '../types'
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
 * - `show` — repeated, one per kind of record the map draws, while it draws
 *   one kind alone.
 * - `place`, `trip` — repeated, one per record the open panel stands for.
 * - `open` — the record of the panel's list that the reader went into.
 * - `list` — `all` while the panel lists every record of its region.
 * - `add` — `place` or `trip` while the form for a new one is open.
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
	/** The records the open panel stands for. */
	selected: PlaceSelection
	/**
	 * The step of the open panel that the reader is on. It is in the address so
	 * that a reload or a shared link opens the panel on the same crumb.
	 */
	step: PlacePanelStep
	/**
	 * The kind of record whose form for a new one is open, or `null`. It is in
	 * the address so that a reload or a shared link opens the form again. An
	 * edit and a visit are not: each names a record that a link can outlive.
	 */
	adding: RecordKind | null
}

/**
 * The records the open panel stands for, by id, per kind. One point on the map
 * can stand for places and trips together, so a panel can hold both kinds.
 */
export type PlaceSelection = Readonly<Record<RecordKind, readonly string[]>>

/** The selection of a closed panel. */
export const NOTHING_SELECTED: PlaceSelection = { places: [], trips: [] }

/** The ids of every record of a selection, the places first. */
export function selectedIds(selected: PlaceSelection): string[] {
	return [...selected.places, ...selected.trips]
}

/** The key of the address that holds each kind of selection, and each kind's form. */
const KIND_KEY: Readonly<Record<RecordKind, string>> = { places: 'place', trips: 'trip' }

/**
 * The step of the open panel: the place that the reader went into from its
 * list, and the list that the panel shows.
 *
 * A panel with no step stated opens on what the reader picked. A lone place
 * opens on its details, and a group of places opens on the list of the group.
 */
export type PlacePanelStep = {
	/** The place of the list that the reader went into, by id, or `null` on a list. */
	opened: string | null
	/**
	 * Whether the list is every place of the region, and not only the places that
	 * the reader picked. The region crumb sets it.
	 */
	widened: boolean
}

/** The step of a panel that the reader has not moved in. */
export const PANEL_START: PlacePanelStep = { opened: null, widened: false }

/** What `list` holds while the panel lists every place of its region. */
const WIDENED = 'all'

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
 * Its own reader, like the ones below it: a location moves one part at a time,
 * and a reader that answers the whole address hands back a new value for each
 * part on a write that changed one of them. See {@link readLocation}.
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

	// Read only while the feature is on, so an old link does not paint the map.
	const paint = flags.visitedRegions ? text(params, 'paint') : undefined

	const spans = readSpans(params)

	const show = list(params, 'show').filter((kind): kind is RecordKind =>
		RECORD_KINDS.includes(kind as RecordKind),
	)

	return {
		...(categories.length > 0 ? { categories } : {}),
		...(show.length > 0 ? { show } : {}),
		...(paint === 'visited' || paint === 'unvisited' ? { visitedRegions: paint } : {}),
		...(spans.length > 0 ? { visited: spans } : {}),
	}
}

/** The records the open panel stands for, of both kinds. */
export function readSelected(params: URLSearchParams): PlaceSelection {
	return { places: list(params, KIND_KEY.places), trips: list(params, KIND_KEY.trips) }
}

/**
 * The step of the open panel. A panel that stands for no place has no step, so
 * a step with no `place` beside it is dropped.
 */
export function readStep(params: URLSearchParams): PlacePanelStep {
	if (selectedIds(readSelected(params)).length === 0) return PANEL_START

	return {
		opened: text(params, 'open') ?? null,
		widened: text(params, 'list') === WIDENED,
	}
}

/** The kind of record whose form for a new one is open, or `null`. */
export function readAdding(params: URLSearchParams): RecordKind | null {
	const add = text(params, 'add')

	return RECORD_KINDS.find((kind) => KIND_KEY[kind] === add) ?? null
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
	return {
		view: readView(params),
		filter: readFilter(params),
		selected: readSelected(params),
		step: readStep(params),
		adding: readAdding(params),
	}
}

/** Writes the step of the open panel into `params`. The start step writes nothing. */
function writeStep(params: URLSearchParams, { opened, widened }: PlacePanelStep): void {
	if (opened !== null) params.set('open', opened)

	if (widened) params.set('list', WIDENED)
}

/** Writes the records of the open panel, each kind under its own key, and the step of the panel. */
function writeSelected(params: URLSearchParams, selected: PlaceSelection, step: PlacePanelStep) {
	for (const kind of RECORD_KINDS) {
		for (const id of selected[kind]) params.append(KIND_KEY[kind], id)
	}

	// Only beside a record, because a step is a step of the panel that it opens.
	if (selectedIds(selected).length > 0) writeStep(params, step)
}

/**
 * Writes a location as an address, in the key order above.
 *
 * A field the location does not hold is left out entirely, so the address stays
 * as short as what the reader has actually done — and an unstated view writes no
 * `country` at all, which is what {@link PlaceLocation.view} reads back as
 * "the opening rule still has the say".
 */
export function writeLocation({
	view,
	filter,
	selected,
	step,
	adding,
}: PlaceLocation): URLSearchParams {
	const params = new URLSearchParams()

	if (view !== null) {
		// Always written, never absent: the world is a place the reader chose, and
		// the mark is what says so.
		params.set('country', view.country ?? EVERYWHERE)

		if (view.state !== null) params.set('state', view.state)
	}

	for (const category of filter.categories ?? []) params.append('category', category)

	for (const kind of filter.show ?? []) params.append('show', kind)

	if (filter.visitedRegions !== undefined) params.set('paint', filter.visitedRegions)

	for (const span of filter.visited ?? []) {
		params.append('when', `${toDay(span.from)}..${toDay(span.to)}`)
	}

	writeSelected(params, selected, step)

	if (adding !== null) params.set('add', KIND_KEY[adding])

	return params
}
