import { CATEGORY_VALUES, MAX_RATING } from '../constants'
import type { Place, PlaceCategory, PlaceDraft } from '../types'

/**
 * The place schema, hand-written rather than taken from a schema library. It is
 * read at three edges — the route handler, which must not trust a request body;
 * the store, which must not trust a file that was hand-edited; and the address
 * codec, which must not trust a link — and the first two want the same answer: a
 * `Place`, or a list of what is wrong with it. The third wants the field readers
 * alone, which is why {@link isCategory} and {@link isDay} are public: one rule
 * copied to a second edge is the pair that drifts.
 */

/** What a parse returns: the value, or the reasons it is not one. */
export type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: string[] }

const MAX_TEXT = 2_000

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** One of the categories a place can carry. */
export function isCategory(value: unknown): value is PlaceCategory {
	return CATEGORY_VALUES.includes(value as PlaceCategory)
}

/**
 * A `YYYY-MM-DD` day, which is the granularity a visit is recorded at.
 *
 * The shape and the date both: `2026-13-45` is a well-formed field and not a
 * day, and a reader can type one into the address bar as easily as a request
 * body can carry one.
 */
export function isDay(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		/^\d{4}-\d{2}-\d{2}$/.test(value) &&
		!Number.isNaN(Date.parse(value))
	)
}

/** A degree within `±limit`, or `undefined` where it is not one. */
function coordinate(value: unknown, limit: number): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) {
		return undefined
	}

	return value
}

/** A whole score from 0 to {@link MAX_RATING}, or `undefined` where it is not one. */
function score(value: unknown): number | undefined {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_RATING) {
		return undefined
	}

	return value
}

/** A trimmed string, or `undefined` where the field was absent or empty. */
function optionalText(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined

	const trimmed = value.trim()

	return trimmed === '' ? undefined : trimmed.slice(0, MAX_TEXT)
}

/**
 * Whether a string is an absolute http(s) address.
 *
 * Exported because the form has to refuse exactly what the route refuses. Two
 * copies of one rule at the two edges that must agree is the pair that drifts:
 * a form that admits what the store rejects fails on submit, and the reverse
 * refuses a value the store would have taken.
 */
export function isWebAddress(value: string): boolean {
	try {
		const url = new URL(value)

		return url.protocol === 'http:' || url.protocol === 'https:'
	} catch {
		return false
	}
}

/**
 * A trimmed http(s) address, or `undefined` where the field held anything else.
 *
 * Stricter than {@link optionalText} because both fields it guards reach the
 * document: one becomes a link's `href` and one an image's `src`. A `javascript:`
 * address in either is a script the reader never wrote, and a body — or a
 * hand-edited file — is exactly where one would arrive from.
 */
function webAddress(value: unknown): string | undefined {
	const text = optionalText(value)

	return text !== undefined && isWebAddress(text) ? text : undefined
}

/**
 * Reads an unknown body as a place draft. Every failure is collected rather than
 * thrown at the first one, so a bad request answers with everything wrong with
 * it instead of one round trip per field.
 */
export function parsePlaceDraft(input: unknown): ParseResult<PlaceDraft> {
	const issues: string[] = []

	if (!isRecord(input)) return { ok: false, issues: ['Body must be an object.'] }

	// Each field is narrowed into a local rather than asserted at the end. The
	// guard below then does both jobs at once — it collects the issues and it
	// proves the fields — so a field added to `PlaceDraft` without a check here
	// fails to compile instead of reaching the store unvalidated.
	const name = optionalText(input.name)

	if (name === undefined) issues.push('`name` is required.')

	const category = isCategory(input.category) ? input.category : undefined

	if (category === undefined) issues.push('`category` is not one of the known categories.')

	const address = optionalText(input.address)

	if (address === undefined) issues.push('`address` is required.')

	const latitude = coordinate(input.latitude, 90)

	if (latitude === undefined) issues.push('`latitude` must be a number between -90 and 90.')

	const longitude = coordinate(input.longitude, 180)

	if (longitude === undefined) issues.push('`longitude` must be a number between -180 and 180.')

	const rating = score(input.rating ?? 0)

	if (rating === undefined) {
		issues.push(`\`rating\` must be a whole number from 0 to ${MAX_RATING}.`)
	}

	const visitedAt = isDay(input.visitedAt) ? input.visitedAt : undefined

	if (visitedAt === undefined) issues.push('`visitedAt` must be a YYYY-MM-DD day.')

	if (
		name === undefined ||
		category === undefined ||
		address === undefined ||
		latitude === undefined ||
		longitude === undefined ||
		rating === undefined ||
		visitedAt === undefined
	) {
		return { ok: false, issues }
	}

	return {
		ok: true,
		value: {
			name,
			category,
			address,
			city: optionalText(input.city),
			state: optionalText(input.state),
			country: optionalText(input.country),
			latitude,
			longitude,
			rating,
			review: optionalText(input.review),
			url: webAddress(input.url),
			photo: webAddress(input.photo),
			visitedAt,
		},
	}
}

/**
 * Reads one stored record back as a place. The store's own guard: a file that
 * was hand-edited, or written by an older shape of this app, must not reach the
 * map as a point with no position.
 */
export function parsePlace(input: unknown): ParseResult<Place> {
	if (!isRecord(input)) return { ok: false, issues: ['Record must be an object.'] }

	const draft = parsePlaceDraft(input)

	if (!draft.ok) return draft

	const id = optionalText(input.id)

	if (id === undefined) return { ok: false, issues: ['`id` is required.'] }

	const createdAt = optionalText(input.createdAt)

	if (createdAt === undefined || Number.isNaN(Date.parse(createdAt))) {
		return { ok: false, issues: ['`createdAt` must be an ISO timestamp.'] }
	}

	return { ok: true, value: { ...draft.value, id, createdAt } }
}
