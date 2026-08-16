/**
 * One label a recipe can carry. A closed set rather than free text: the filter
 * bar lists them, the palette groups by them, and each carries a colour — none
 * of which a free-form tag can be given without a second table to hold it.
 */
export type RecipeLabel = 'want-to-try' | 'quick' | 'vegetarian' | 'comfort' | 'batch' | 'special'

/** One line of a recipe's ingredient list. */
export type Ingredient = {
	/** How much, where the line states an amount. Absent for "salt, to taste". */
	quantity?: number
	/** The unit the quantity is in, absent where the item counts itself ("2 eggs"). */
	unit?: string
	/** What it is, which is the only part every line carries. */
	item: string
}

/** One recipe, as it is stored and as the list draws it. */
export type Recipe = {
	id: string
	name: string
	description?: string
	/** How many the quantities below feed. */
	servings: number
	prepMinutes?: number
	cookMinutes?: number
	ingredients: Ingredient[]
	/** The method, one step per entry, in order. */
	steps: string[]
	labels: RecipeLabel[]
	favorite: boolean
	/** Where it came from, as a web address. */
	sourceUrl?: string
	/** What the reader learned the last time — the part a printed recipe never has. */
	notes?: string
	/**
	 * Where the reader put it in the list.
	 *
	 * Held on the record rather than derived, because it is a decision and not a
	 * measurement: no other field implies it, and nothing but a drag changes it.
	 */
	order: number
	/** When the record was written, ISO. */
	createdAt: string
}

/** A recipe as it arrives from the form, before the store gives it an identity. */
export type RecipeDraft = Omit<Recipe, 'id' | 'createdAt' | 'order' | 'favorite'>

/**
 * One meal, cooked.
 *
 * The plan is intent and this is fact, which is why it is its own record rather
 * than a flag on a {@link PlanEntry}: a meal cooked without a plan is the common
 * case, and a planned meal skipped must leave nothing behind.
 */
export type CookEvent = {
	id: string
	recipeId: string
	/** The day it was cooked, `YYYY-MM-DD`, which is the grain the calendar draws. */
	day: string
	createdAt: string
}

/** A cook as it arrives from a tick, before the store gives it an identity. */
export type CookDraft = Omit<CookEvent, 'id' | 'createdAt'>

/** One meal, planned. */
export type PlanEntry = {
	id: string
	/** The day it is planned for, `YYYY-MM-DD`. */
	day: string
	recipeId: string
	/** Where it sits among that day's meals, ascending. */
	position: number
}

/** A planned meal as it arrives from the palette, before the store places it. */
export type PlanDraft = Omit<PlanEntry, 'id' | 'position'>

/**
 * One day of the plan, restated whole — the shape every board move travels in.
 *
 * Stated once because four layers hand it along unchanged: the mover that works
 * it out, the client that sends it, the route that reads it, and the store that
 * writes it. An entry with no `id` is new and gets one at the store.
 */
export type DayEntries = {
	day: string
	entries: readonly { id?: string; recipeId: string }[]
}

/**
 * How the list is ordered.
 *
 * `manual` is the reader's own order and the only one a drag can write to; the
 * rest are measurements of the cook log and the record, which a drag cannot
 * change. See `recipe-rank.ts`, and the note in the list about what that costs.
 */
export type RecipeSort = 'manual' | 'name' | 'most-cooked' | 'recently-cooked'

/**
 * A recipe with what the cook log says about it.
 *
 * Both fields are folded per read rather than stored: a counter on the record
 * is a number that drifts from the events it summarises, and there is no edit
 * that could keep the two in step without walking the log anyway.
 */
export type RankedRecipe = Recipe & {
	cookCount: number
	/** The last day it was cooked, or `null` where it never was. */
	lastCookedAt: string | null
}

/** One label's presentation: the name the reader reads, and the colour its badge takes. */
export type RecipeLabelMeta = {
	value: RecipeLabel
	label: string
	color: RecipeColor
}

/**
 * A hue the badge palette carries, so one label colour drives the filter swatch
 * and the badge alike.
 */
export type RecipeColor = 'blue' | 'violet' | 'green' | 'rose' | 'amber' | 'sky' | 'zinc'
