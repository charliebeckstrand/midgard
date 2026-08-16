import type { RecipeLabel, RecipeLabelMeta } from './types'

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
