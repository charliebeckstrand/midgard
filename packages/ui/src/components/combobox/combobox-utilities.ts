import { OPTION_SELECTOR } from './combobox-constants'

/**
 * A `multiple` selection as a plain array, whatever the stored value is.
 *
 * Both resolvers below take the selection this way, so the coercion — and the decision that a
 * `multiple` field holding a non-array holds nothing — is stated once.
 *
 * @internal
 */
function selectedValues<T>(value: T | T[] | undefined): T[] {
	return Array.isArray(value) ? value : []
}

/**
 * Resolves the input's displayed string. While editing, shows the live `query`.
 * Otherwise shows the selection through `displayValue` — the formatted value for a
 * single selection, and a `"N selected"` count for any `multiple` selection past
 * one, or whatever `summarize` names it. An unresolved value or an empty selection
 * shows empty, which is what lets the placeholder through.
 *
 * **One label, then a count** — deliberately tighter than `Listbox`, which joins up
 * to three. The two differ because their triggers do: a listbox trigger is a button
 * whose text truncates and stops, while this is a real text input, so a joined value
 * longer than the field becomes horizontally scrollable — the field shows the middle
 * of a sentence, and scrolling right reveals blank space past the end of the text.
 * It also has to stay typeable, and a value the user must first scroll to read is
 * worse than a count that says how much is there. The full list is still one hover
 * away; see {@link resolveInputTitle}.
 *
 * `summarize` names the count without moving that threshold: the decision about WHEN
 * to stop listing belongs to the control, and what the things ARE belongs to the
 * caller — "2 selected" in a row of six filters says how many of nothing in
 * particular.
 *
 * It used to return empty here, which left a `multiple` combobox showing nothing at
 * all above a selection that *was* applied — the trigger's whole job. Editing still
 * wins, so the summary never blocks typing: every pick resets `editing`, so a query
 * replaces the summary and the summary comes back with the next pick.
 *
 * @returns The string to render in the input.
 * @internal
 */
export function resolveInputDisplay<T>({
	editing,
	query,
	value,
	displayValue,
	summarize,
	multiple,
}: {
	editing: boolean
	query: string
	value: T | T[] | undefined
	displayValue?: (value: T) => string
	summarize?: (selected: T[]) => string
	multiple: boolean
}): string {
	if (editing) return query

	if (multiple) {
		const selected = selectedValues(value)

		const [only] = selected

		if (only === undefined) return ''

		// One label fits and reads; two already risk overflowing the field, and with no resolver
		// a count is the only reading available at any size.
		if (!displayValue || selected.length > 1) {
			return summarize ? summarize(selected) : `${selected.length} selected`
		}

		return displayValue(only)
	}

	if (value !== undefined && !Array.isArray(value) && displayValue) {
		return displayValue(value)
	}

	return ''
}

/**
 * Enter convenience: when the list has narrowed to a single option, selects it
 * even if nothing is highlighted. The roving hook's activation key, not this
 * function, selects the *active* (highlighted) option.
 *
 * @returns `true` when a sole option was found and clicked, else `false`.
 * @internal
 */
export function selectSoleOption(container: HTMLElement): boolean {
	const items = container.querySelectorAll<HTMLElement>(OPTION_SELECTOR)

	if (items.length === 1) {
		items[0]?.click()

		return true
	}

	return false
}

/**
 * The input's `title` — the whole `multiple` selection, spelled out, or `undefined`.
 *
 * The counterpart to the count {@link resolveInputDisplay} shows: the field says HOW MANY are picked
 * and this says WHICH, on hover, without the field having to hold a string longer than itself. A
 * native `title` rather than a `Tooltip` on purpose — a floating tooltip over a combobox would
 * contend with the options panel the combobox is already positioning, and `title` reaches the
 * accessible description for free.
 *
 * Only past one selection: a single label is already the field's own text, so a tooltip repeating it
 * is noise. Absent while editing, since the field is then showing a query rather than a selection.
 *
 * @returns The joined labels, or `undefined` where there is nothing a hover would add.
 * @internal
 */
export function resolveInputTitle<T>({
	editing,
	value,
	displayValue,
	multiple,
}: {
	editing: boolean
	value: T | T[] | undefined
	displayValue?: (value: T) => string
	multiple: boolean
}): string | undefined {
	if (editing || !multiple || !displayValue) return undefined

	const selected = selectedValues(value)

	return selected.length > 1 ? selected.map(displayValue).join(', ') : undefined
}
