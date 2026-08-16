import { LABEL_VALUES, MAX_LINES, MAX_SERVINGS, MAX_TEXT } from '../constants'
import type {
	CookDraft,
	CookEvent,
	Ingredient,
	PlanDraft,
	PlanEntry,
	Recipe,
	RecipeDraft,
	RecipeLabel,
} from '../types'

/**
 * The schemas, hand-written rather than taken from a schema library. Each is
 * read at three edges — the route handler, which must not trust a request body;
 * the store, which must not trust a file that was hand-edited; and the address
 * codec, which must not trust a link — and the first two want the same answer: a
 * record, or a list of what is wrong with it. The third wants the field readers
 * alone, which is why {@link isLabel} and {@link isDay} are public: one rule
 * copied to a second edge is the pair that drifts.
 */

/** What a parse returns: the value, or the reasons it is not one. */
export type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** One of the labels a recipe can carry. */
export function isLabel(value: unknown): value is RecipeLabel {
	return LABEL_VALUES.includes(value as RecipeLabel)
}

/**
 * A `YYYY-MM-DD` day, which is the grain a plan and a cook are both recorded at.
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
 * Stricter than {@link optionalText} because the field it guards reaches the
 * document as a link's `href`. A `javascript:` address there is a script the
 * reader never wrote, and a body — or a hand-edited file — is exactly where one
 * would arrive from.
 */
function webAddress(value: unknown): string | undefined {
	const text = optionalText(value)

	return text !== undefined && isWebAddress(text) ? text : undefined
}

/** A whole count from 1 to `limit`, or `undefined` where it is not one. */
function count(value: unknown, limit: number): number | undefined {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > limit) {
		return undefined
	}

	return value
}

/** Whole minutes, or `undefined` where the field held anything else. Zero is allowed: some things need no time at all. */
function minutes(value: unknown): number | undefined {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100_000) {
		return undefined
	}

	return value
}

/**
 * One ingredient line, or `undefined` where it carries no item.
 *
 * The quantity and the unit are both optional and independent: "salt, to taste"
 * has neither, "2 eggs" has a quantity and no unit, and dropping a malformed
 * quantity is kinder than refusing the line it was attached to.
 */
function ingredient(value: unknown): Ingredient | undefined {
	if (!isRecord(value)) return undefined

	const item = optionalText(value.item)

	if (item === undefined) return undefined

	const quantity =
		typeof value.quantity === 'number' && Number.isFinite(value.quantity) && value.quantity > 0
			? value.quantity
			: undefined

	const unit = optionalText(value.unit)

	return {
		item,
		...(quantity === undefined ? {} : { quantity }),
		...(unit === undefined ? {} : { unit }),
	}
}

/** Every line that reads as one, capped, dropping the rest. */
function ingredients(value: unknown): Ingredient[] {
	if (!Array.isArray(value)) return []

	return value
		.map(ingredient)
		.filter((line): line is Ingredient => line !== undefined)
		.slice(0, MAX_LINES)
}

/** Every step that carries text, capped, dropping the blanks. */
function steps(value: unknown): string[] {
	if (!Array.isArray(value)) return []

	return value
		.map(optionalText)
		.filter((step): step is string => step !== undefined)
		.slice(0, MAX_LINES)
}

/** The known labels the field carries, deduplicated, in the order the constants list them. */
function labels(value: unknown): RecipeLabel[] {
	if (!Array.isArray(value)) return []

	const held = new Set(value.filter(isLabel))

	return LABEL_VALUES.filter((label) => held.has(label))
}

/**
 * Reads an unknown body as a recipe draft. Every failure is collected rather
 * than thrown at the first one, so a bad request answers with everything wrong
 * with it instead of one round trip per field.
 */
export function parseRecipeDraft(input: unknown): ParseResult<RecipeDraft> {
	const issues: string[] = []

	if (!isRecord(input)) return { ok: false, issues: ['Body must be an object.'] }

	// Each required field is narrowed into a local rather than asserted at the
	// end. The guard below then does both jobs at once — it collects the issues
	// and it proves the fields — so a field added to `RecipeDraft` without a check
	// here fails to compile instead of reaching the store unvalidated.
	const name = optionalText(input.name)

	if (name === undefined) issues.push('`name` is required.')

	const servings = count(input.servings, MAX_SERVINGS)

	if (servings === undefined) {
		issues.push(`\`servings\` must be a whole number from 1 to ${MAX_SERVINGS}.`)
	}

	const prep = input.prepMinutes === undefined ? undefined : minutes(input.prepMinutes)

	if (input.prepMinutes !== undefined && prep === undefined) {
		issues.push('`prepMinutes` must be whole minutes.')
	}

	const cook = input.cookMinutes === undefined ? undefined : minutes(input.cookMinutes)

	if (input.cookMinutes !== undefined && cook === undefined) {
		issues.push('`cookMinutes` must be whole minutes.')
	}

	if (name === undefined || servings === undefined) return { ok: false, issues }

	if (issues.length > 0) return { ok: false, issues }

	return {
		ok: true,
		value: {
			name,
			description: optionalText(input.description),
			servings,
			prepMinutes: prep,
			cookMinutes: cook,
			ingredients: ingredients(input.ingredients),
			steps: steps(input.steps),
			labels: labels(input.labels),
			sourceUrl: webAddress(input.sourceUrl),
			notes: optionalText(input.notes),
		},
	}
}

/**
 * Reads one stored record back as a recipe. The store's own guard: a file that
 * was hand-edited, or written by an older shape of this app, must not reach the
 * list as a card with no name.
 */
export function parseRecipe(input: unknown): ParseResult<Recipe> {
	if (!isRecord(input)) return { ok: false, issues: ['Record must be an object.'] }

	const draft = parseRecipeDraft(input)

	if (!draft.ok) return draft

	const id = optionalText(input.id)

	if (id === undefined) return { ok: false, issues: ['`id` is required.'] }

	const createdAt = optionalText(input.createdAt)

	if (createdAt === undefined || Number.isNaN(Date.parse(createdAt))) {
		return { ok: false, issues: ['`createdAt` must be an ISO timestamp.'] }
	}

	// Both are the store's to keep rather than the draft's to state, so neither
	// refuses a record: a file written before either existed reads back with the
	// list's own defaults, and the next write puts them on disk.
	const order = typeof input.order === 'number' && Number.isFinite(input.order) ? input.order : 0

	return {
		ok: true,
		value: { ...draft.value, id, createdAt, order, favorite: input.favorite === true },
	}
}

/** Reads an unknown body as a cook — one recipe, one day. */
export function parseCookDraft(input: unknown): ParseResult<CookDraft> {
	if (!isRecord(input)) return { ok: false, issues: ['Body must be an object.'] }

	const issues: string[] = []

	const recipeId = optionalText(input.recipeId)

	if (recipeId === undefined) issues.push('`recipeId` is required.')

	const day = isDay(input.day) ? input.day : undefined

	if (day === undefined) issues.push('`day` must be a YYYY-MM-DD day.')

	if (recipeId === undefined || day === undefined) return { ok: false, issues }

	return { ok: true, value: { recipeId, day } }
}

/** Reads one stored cook back. */
export function parseCookEvent(input: unknown): ParseResult<CookEvent> {
	if (!isRecord(input)) return { ok: false, issues: ['Record must be an object.'] }

	const draft = parseCookDraft(input)

	if (!draft.ok) return draft

	const id = optionalText(input.id)

	if (id === undefined) return { ok: false, issues: ['`id` is required.'] }

	const createdAt = optionalText(input.createdAt)

	if (createdAt === undefined || Number.isNaN(Date.parse(createdAt))) {
		return { ok: false, issues: ['`createdAt` must be an ISO timestamp.'] }
	}

	return { ok: true, value: { ...draft.value, id, createdAt } }
}

/** Reads an unknown body as a planned meal. The same two fields a cook carries, for the same reasons. */
export function parsePlanDraft(input: unknown): ParseResult<PlanDraft> {
	const cook = parseCookDraft(input)

	return cook.ok
		? { ok: true, value: { recipeId: cook.value.recipeId, day: cook.value.day } }
		: cook
}

/** Reads one stored plan entry back. */
export function parsePlanEntry(input: unknown): ParseResult<PlanEntry> {
	if (!isRecord(input)) return { ok: false, issues: ['Record must be an object.'] }

	const draft = parsePlanDraft(input)

	if (!draft.ok) return draft

	const id = optionalText(input.id)

	if (id === undefined) return { ok: false, issues: ['`id` is required.'] }

	// The store's to keep, so it never refuses a record: a file written before it
	// existed reads back at the head of its day, and the next write settles it.
	const position =
		typeof input.position === 'number' && Number.isFinite(input.position) ? input.position : 0

	return { ok: true, value: { ...draft.value, id, position } }
}
