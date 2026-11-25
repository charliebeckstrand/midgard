/**
 * The rules of an action part: the values that a form starts from, and the
 * rows that the review of a result shows. `ChatAction` is the shell that draws
 * them.
 */

import type { ChatActionField, ChatActionOption, ChatActionPart } from './chat-content/types'

/** One row of the review of a result: the label of a field and its value. */
export type ChatActionReviewRow = {
	label: string
	/** The text of the value, or a boolean of a checkbox, which the shell words. */
	value: string | boolean
}

/** The label of the option that `value` names, or the value when none does. @internal */
function optionLabel(options: ChatActionOption[], value: string): string {
	return options.find((option) => option.value === value)?.label ?? value
}

/**
 * The values that a form starts from: an empty string for a text or a choice
 * field, and `false` for a checkbox.
 *
 * @internal
 */
export function actionDefaults(fields: ChatActionField[]): Record<string, string | boolean> {
	return Object.fromEntries(
		fields.map((field) => [field.name, field.kind === 'checkbox' ? false : '']),
	)
}

/**
 * The rows that the review of a result shows, in the order of the ask. A
 * choice gives one row, under the title of the action. A form gives one row
 * for each field with a value, so a field that the reader left empty does not
 * show. A choice shows the label of its option, and not its value. An action
 * with no result gives no row.
 *
 * @internal
 */
export function actionReview(part: ChatActionPart): ChatActionReviewRow[] {
	const { input, result } = part

	if (result === undefined) return []

	if (input.kind === 'choice') {
		const value = result[input.name]

		return typeof value === 'string'
			? [{ label: part.title, value: optionLabel(input.options, value) }]
			: []
	}

	return input.fields.flatMap((field): ChatActionReviewRow[] => {
		const value = result[field.name]

		if (value === undefined || value === '') return []

		if (field.kind === 'choice' && typeof value === 'string') {
			return [{ label: field.label, value: optionLabel(field.options, value) }]
		}

		return [{ label: field.label, value }]
	})
}
