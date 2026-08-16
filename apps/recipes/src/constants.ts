import type {
	CookEvent,
	PlanEntry,
	Recipe,
	RecipeLabel,
	RecipeLabelMeta,
	RecipeSort,
} from './types'

/**
 * The labels, in the order the filter lists them. Each carries its own colour,
 * so a label keeps it whatever else is on the list — a palette that renumbered
 * itself as recipes were added would make yesterday's screenshot lie.
 */
export const LABELS: readonly RecipeLabelMeta[] = [
	{ value: 'want-to-try', label: 'Want to try', color: 'violet' },
	{ value: 'quick', label: 'Quick', color: 'amber' },
	{ value: 'vegetarian', label: 'Vegetarian', color: 'green' },
	{ value: 'comfort', label: 'Comfort', color: 'rose' },
	{ value: 'batch', label: 'Batch', color: 'sky' },
	{ value: 'special', label: 'Special', color: 'blue' },
]

/** The labels by value, for the readouts that hold one and need its name. */
export const LABEL_BY_VALUE = new Map<RecipeLabel, RecipeLabelMeta>(
	LABELS.map((label) => [label.value, label]),
)

/** Every label value, which is what an unfiltered list admits. */
export const LABEL_VALUES: readonly RecipeLabel[] = LABELS.map((label) => label.value)

/**
 * A label's name. Every Listbox over labels takes this as its `displayValue`:
 * the trigger renders nothing without one, so the field would read as unset
 * while holding a value.
 */
export function labelName(value: RecipeLabel): string {
	return LABEL_BY_VALUE.get(value)?.label ?? value
}

/** The label the palette's "want to try" section reads. */
export const WANT_TO_TRY: RecipeLabel = 'want-to-try'

/** The most servings a recipe can state, which is where a typo stops being a number. */
export const MAX_SERVINGS = 100

/** The longest a single step or note can run. */
export const MAX_TEXT = 2_000

/** The most steps or ingredient lines one recipe can hold. */
export const MAX_LINES = 100

/**
 * The units a typed ingredient line can name.
 *
 * A closed list because the alternative is to treat the first word after a
 * number as a unit whatever it is, and "2 large onions" would then be measured
 * in `large`. A word that is not here stays part of the item, which is the
 * answer that loses nothing.
 *
 * Written lower case and without a trailing stop; the reader's `kg.` and `Kg`
 * both land here.
 */
export const UNITS: readonly string[] = [
	'g',
	'kg',
	'mg',
	'oz',
	'lb',
	'ml',
	'l',
	'tsp',
	'tbsp',
	'cup',
	'cups',
	'pint',
	'pints',
	'quart',
	'quarts',
	'clove',
	'cloves',
	'slice',
	'slices',
	'can',
	'cans',
	'pinch',
	'handful',
	'bunch',
]

/**
 * The empty lists a pending query stands in for.
 *
 * Held as constants because their identity is the point: a fresh `[]` per render
 * is a new dependency for every memo that reads one, so the whole page recomputes
 * while the first fetch is in flight.
 */
export const NO_RECIPES: Recipe[] = []

export const NO_COOKS: CookEvent[] = []

export const NO_PLAN: PlanEntry[] = []

/** What a card or a calendar row says where the recipe behind it is gone. */
export const MISSING_RECIPE = 'Recipe removed'

/**
 * The orders the list can be read in, in the order the picker lists them.
 *
 * One list, because three things read it: the picker's labels, the address
 * codec's validation, and {@link RecipeSort} itself. Spelled out three times, an
 * order added to the type is one the address refuses and the picker never shows.
 */
export const SORTS = [
	{ value: 'manual', label: 'My order' },
	{ value: 'name', label: 'Name' },
	{ value: 'most-cooked', label: 'Most cooked' },
	{ value: 'recently-cooked', label: 'Recently cooked' },
] as const satisfies readonly { value: RecipeSort; label: string }[]

/** An order's name, which a picker's trigger renders nothing without. */
export function sortName(value: RecipeSort): string {
	return SORTS.find((sort) => sort.value === value)?.label ?? value
}
