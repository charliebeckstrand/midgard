import type { Errors } from './types'

/**
 * One row of an error summary: the name of a field, and the first issue of
 * that field.
 *
 * @internal
 */
export type FormErrorSummaryItem = {
	name: string
	issue: string
}

/**
 * Gives one row for each field of `errors` that has an issue, in the order of
 * the map. The map can have an order that is not the order of the fields, so
 * `FormErrorSummary` then sorts the rows by the position of each control in the
 * document.
 *
 * @remarks A row holds the first issue of its field, as a form-bound `Message`
 * shows it.
 * @internal
 */
export function summarizeErrors(errors: Errors): FormErrorSummaryItem[] {
	const items: FormErrorSummaryItem[] = []

	for (const name in errors) {
		const issue = errors[name]?.[0]

		if (issue !== undefined) items.push({ name, issue })
	}

	return items
}
