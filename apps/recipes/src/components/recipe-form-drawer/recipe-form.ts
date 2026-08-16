import type { FormProps } from 'ui/form'
import { MAX_SERVINGS } from '../../constants'
import { isWebAddress } from '../../schemas/recipe'
import type { Recipe, RecipeDraft, RecipeLabel } from '../../types'
import {
	formatIngredients,
	parseIngredientLines,
	parseLines,
} from '../../utilities/ingredient-line'

/**
 * What the recipe form holds while it is being filled, which is not what the
 * store takes. The form works in the shapes its controls emit — text in every
 * box, including the two lists — and {@link toRecipeDraft} turns those into the
 * record.
 *
 * The two lists are text because that is how a recipe is copied: off a page or
 * out of a head, one line at a time. A repeating three-field row would make the
 * reader tab through a form to type what they could type as a sentence.
 */
export type RecipeValues = {
	name: string
	description: string
	/** Text, because a number input hands back `NaN` for an empty box and the field can be empty while it is being typed. */
	servings: string
	prepMinutes: string
	cookMinutes: string
	labels: RecipeLabel[]
	ingredients: string
	steps: string
	sourceUrl: string
	notes: string
}

/** What an empty field says, in the one shape every one of them uses. */
function required(field: string): string {
	return `${field} is required.`
}

/** A field's whole number, or `null` where it holds anything else. An empty box is `null` too. */
function whole(value: string): number | null {
	const text = value.trim()

	if (text === '') return null

	const parsed = Number(text)

	return Number.isInteger(parsed) ? parsed : null
}

/**
 * A validator for an optional stretch of time.
 *
 * An empty box passes, because not every recipe has both times and a blank is
 * the honest way to say so.
 */
function minutesField(field: string): (value: string) => string | undefined {
	return (value) => {
		const count = whole(value)

		return value.trim() !== '' && (count === null || count < 0)
			? `${field} must be whole minutes.`
			: undefined
	}
}

/**
 * Per-field validators, in the shape `Form` takes.
 *
 * An empty field reads the same way whichever it is — the reader is scanning a
 * column of messages, and one phrasing per field makes them compare the wording
 * instead of the field names. A field that is filled but wrong says what is
 * wrong with it, which is the only thing `required` cannot express.
 *
 * The optional times admit an empty box, because not every recipe has both and a
 * blank is the honest way to say so.
 */
export const recipeValidators: NonNullable<FormProps<RecipeValues>['validate']> = {
	name: (value) => (value.trim() === '' ? required('Name') : undefined),
	servings: (value) => {
		const count = whole(value)

		if (count === null) return required('Servings')

		return count < 1 || count > MAX_SERVINGS
			? `Servings must be a whole number from 1 to ${MAX_SERVINGS}.`
			: undefined
	},
	prepMinutes: minutesField('Prep'),
	cookMinutes: minutesField('Cook'),
	ingredients: (value) =>
		parseIngredientLines(value).length === 0 ? required('Ingredients') : undefined,
	sourceUrl: (value) =>
		value.trim() === '' || isWebAddress(value.trim()) ? undefined : 'That is not a web address.',
}

/**
 * Turns filled form values into the record the store takes.
 *
 * Every field it reads is one a validator proved, so each absent case falls back
 * rather than asserting: a submit only reaches here once the form is valid, and
 * the route handler validates the body again regardless.
 */
export function toRecipeDraft(values: RecipeValues): RecipeDraft {
	const prep = whole(values.prepMinutes)

	const cook = whole(values.cookMinutes)

	return {
		name: values.name.trim(),
		description: values.description.trim() || undefined,
		servings: whole(values.servings) ?? 1,
		prepMinutes: prep === null ? undefined : prep,
		cookMinutes: cook === null ? undefined : cook,
		ingredients: parseIngredientLines(values.ingredients),
		steps: parseLines(values.steps),
		labels: values.labels,
		sourceUrl: values.sourceUrl.trim() || undefined,
		notes: values.notes.trim() || undefined,
	}
}

/**
 * A stored recipe read back as form values, for an edit.
 *
 * The two lists are written back as the lines they were read from, so a save the
 * reader made no change to writes the record it opened on rather than a
 * re-punctuated copy of it.
 */
export function toFormValues(recipe: Recipe): RecipeValues {
	return {
		name: recipe.name,
		description: recipe.description ?? '',
		servings: String(recipe.servings),
		prepMinutes: recipe.prepMinutes === undefined ? '' : String(recipe.prepMinutes),
		cookMinutes: recipe.cookMinutes === undefined ? '' : String(recipe.cookMinutes),
		labels: recipe.labels,
		ingredients: formatIngredients(recipe.ingredients),
		steps: recipe.steps.join('\n'),
		sourceUrl: recipe.sourceUrl ?? '',
		notes: recipe.notes ?? '',
	}
}

/** A fresh form. */
export function emptyValues(): RecipeValues {
	return {
		name: '',
		description: '',
		servings: '4',
		prepMinutes: '',
		cookMinutes: '',
		labels: [],
		ingredients: '',
		steps: '',
		sourceUrl: '',
		notes: '',
	}
}
