/**
 * Chat-prompt kata: the picker that a trigger character opens in the
 * composer. It is the list group of a control, as the panel of a combobox is.
 * `options` is the scroll region, `list` is the listbox, and `status` is the
 * line that says that the list loads, holds no item, or failed. `editing` is
 * the label at the start of the action row while the draft edits a sent
 * message.
 */
import { defineKata } from '../../core/recipe'
import { dan, iro, ji, narabi } from '../kiso'
import { list } from '../kumi/control'

const { text } = iro

const { size } = ji

const { flex } = narabi

export const k = defineKata({
	extends: list,
	slots: {
		// The listbox spaces its options and collapses while it holds none.
		list: ['space-y-0.5', 'empty:hidden'],
		// The text takes the step of the panel, as the text of an option does.
		status: ['p-2', dan.text.body, text.muted],
		// The label of an edit. `me-auto` puts it at the inline start of the action
		// row, and `ps-3` lines its text up with the text of the field. It is quiet,
		// as a hint is, and its cancel button sits right after it.
		editing: [flex.row, 'me-auto items-center gap-0.5 ps-3', size.sm, text.muted],
	},
})
