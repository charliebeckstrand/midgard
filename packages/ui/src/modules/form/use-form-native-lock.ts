'use client'

import { type RefObject, useLayoutEffect } from 'react'

/** A native field: an `<input>` that writes a value, a `<select>`, or a `<textarea>`. */
type NativeField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

/** The state of a native field at the start of a submit. */
type NativeFieldState = {
	value: string
	checked: boolean
	files: FileList | null
	/** The selected flag of each option of a `<select>`, so a multiple select returns whole. */
	selected: readonly boolean[] | undefined
}

/** The input types that act as a button or hold no edit. They write no field, so the lock leaves them live. */
const BUTTON_TYPES = new Set(['button', 'submit', 'reset', 'image', 'hidden'])

/** The input types whose click toggles the field or opens a picker. */
const CLICK_TYPES = new Set(['checkbox', 'radio', 'file'])

function isNativeField(element: Element): element is NativeField {
	if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) return true

	return element instanceof HTMLInputElement && !BUTTON_TYPES.has(element.type)
}

/**
 * Whether the nearest lock scope of the field is the form. A filter bar inside
 * the form opens a scope with no lock, so its fields stay live.
 */
function inFormScope(form: HTMLFormElement, field: NativeField): boolean {
	const bar = field.closest('[data-slot="form-filters"]')

	return bar === null || !form.contains(bar)
}

function readState(field: NativeField): NativeFieldState {
	return {
		value: field.value,
		checked: field instanceof HTMLInputElement && field.checked,
		files: field instanceof HTMLInputElement ? field.files : null,
		selected:
			field instanceof HTMLSelectElement
				? Array.from(field.options, (option) => option.selected)
				: undefined,
	}
}

/**
 * Writes the recorded state back through the setters of the element. The value
 * tracker of React reads those setters, so it holds the same value as the DOM.
 */
function writeState(field: NativeField, state: NativeFieldState): void {
	if (field instanceof HTMLSelectElement) {
		for (const [index, option] of Array.from(field.options).entries()) {
			option.selected = state.selected?.[index] ?? false
		}

		return
	}

	if (field instanceof HTMLInputElement) {
		if (field.type === 'checkbox' || field.type === 'radio') {
			field.checked = state.checked

			return
		}

		// A file input takes a new value only as a file list.
		if (field.type === 'file') {
			if (state.files) field.files = state.files

			return
		}
	}

	field.value = state.value
}

/** Whether a click on the element toggles a recorded field or opens its picker. */
function writesOnClick(
	states: ReadonlyMap<EventTarget, NativeFieldState>,
	target: EventTarget | null,
) {
	return target instanceof HTMLInputElement && CLICK_TYPES.has(target.type) && states.has(target)
}

/**
 * Puts back the recorded state of a field. A radio that becomes checked clears
 * the other radios of its group, so the group returns whole.
 */
function restoreField(states: ReadonlyMap<EventTarget, NativeFieldState>, field: NativeField) {
	const state = states.get(field)

	if (state) writeState(field, state)

	if (!(field instanceof HTMLInputElement) || field.type !== 'radio' || !field.name) return

	for (const [element, recorded] of states) {
		if (
			element instanceof HTMLInputElement &&
			element.type === 'radio' &&
			element.name === field.name
		) {
			writeState(element, recorded)
		}
	}
}

/**
 * Locks the native fields of a form while a submit runs. A bound control reads
 * the lock from the Control scope, but a native element reads no context. So
 * the form refuses the edits of each native field that it owns, and disables
 * nothing, so the focused field keeps the focus.
 *
 * The form records the state of each field when the submit starts. While the
 * submit runs, it does these steps:
 *
 * - It cancels each text edit before the edit lands (`beforeinput`).
 * - It cancels the click that toggles a check box or a radio, or opens a file
 *   picker.
 * - It puts back the state of a field that changes another way, such as a
 *   `<select>`, a range, or a composition of an input method.
 *
 * The cancel also stops the event, so no handler of the app or of React sees
 * an edit that does not occur.
 *
 * @param formRef - The `<form>` element of the form.
 * @param locked - Whether a submit runs.
 * @remarks The lock reads the DOM tree, not the React tree. A native field in
 * a portal is outside the `<form>`, and the form does not own it, so it stays
 * live. A field that mounts during the submit has no recorded state, so it
 * stays live too. A field in a filter bar inside the form stays live, because
 * the bar opens a scope with no lock. A bound control is read-only in the
 * scope already, so the lock changes nothing for it.
 * @internal
 */
export function useFormNativeLock(
	formRef: RefObject<HTMLFormElement | null>,
	locked: boolean,
): void {
	useLayoutEffect(() => {
		const form = formRef.current

		if (!locked || !form) return

		const states = new Map<EventTarget, NativeFieldState>()

		for (const element of Array.from(form.elements)) {
			if (isNativeField(element) && inFormScope(form, element)) {
				states.set(element, readState(element))
			}
		}

		const cancelEdit = (event: Event) => {
			if (states.has(event.target as EventTarget)) event.preventDefault()
		}

		const cancelClick = (event: Event) => {
			if (!writesOnClick(states, event.target)) return

			event.preventDefault()

			// React reads the toggle of a check box from the click, before the
			// browser undoes the cancel. Stopped here, the click reaches no handler.
			event.stopPropagation()
		}

		const restore = (event: Event) => {
			if (!states.has(event.target as EventTarget)) return

			event.stopPropagation()

			restoreField(states, event.target as NativeField)
		}

		form.addEventListener('beforeinput', cancelEdit, true)

		form.addEventListener('click', cancelClick, true)

		form.addEventListener('input', restore, true)

		form.addEventListener('change', restore, true)

		return () => {
			form.removeEventListener('beforeinput', cancelEdit, true)

			form.removeEventListener('click', cancelClick, true)

			form.removeEventListener('input', restore, true)

			form.removeEventListener('change', restore, true)
		}
	}, [formRef, locked])
}
