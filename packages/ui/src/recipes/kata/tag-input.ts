import { sen } from '../kiso'

const { focus } = sen

export const k = {
	// Each tag is a focusable (`tabIndex={0}`) outline Badge that deletes on
	// Backspace/Delete. Its bordered, inline box can't carry an outset stroke;
	// focus reads through an inset ring (see `sen.focus` shapes).
	badge: focus.inset,
} as const
