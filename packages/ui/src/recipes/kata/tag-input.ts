import { sen } from '../kiso'

const { focus } = sen

export const k = {
	// A tag's bordered, inline box can't carry an outset stroke; focus reads
	// through an inset ring (see `sen.focus` shapes).
	badge: focus.inset,
} as const
