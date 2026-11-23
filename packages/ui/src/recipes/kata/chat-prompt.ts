/**
 * Chat-prompt kata: the picker that a trigger character opens in the
 * composer. It is the list group of a control, as the panel of a combobox is.
 * `options` is the scroll region, `list` is the listbox, and `status` is the
 * line that says that the list loads, holds no item, or failed. `toolbar` is
 * the row above the field that `ChatPromptToolbar` draws.
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
		// The toolbar of the composer: a row above the field. The status label sits
		// at the inline start, and the controls at the inline end.
		toolbar: [flex.row, 'items-center gap-2 mb-2'],
		// The status is quiet, as a hint is.
		toolbarLabel: [size.sm, text.muted],
		toolbarControls: 'ms-auto',
	},
})
