/**
 * Chat-prompt kata: the picker that a trigger character opens in the
 * composer. It is the list group of a control, as the panel of a combobox is.
 * `options` is the scroll region, `list` is the listbox, and `status` is the
 * line that says that the list loads, holds no item, or failed.
 */
import { defineKata } from '../../core/recipe'
import { dan, iro } from '../kiso'
import { list } from '../kumi/control'

const { text } = iro

export const k = defineKata({
	extends: list,
	slots: {
		// The listbox spaces its options and collapses while it holds none.
		list: ['space-y-0.5', 'empty:hidden'],
		// The text takes the step of the panel, as the text of an option does.
		status: ['p-2', dan.text.body, text.muted],
	},
})
