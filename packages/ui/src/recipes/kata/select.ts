import { hannou, iro } from '../kiso'
import { control } from '../kiso/control'

const { cursor } = hannou
const { text } = iro
const { surface, affix } = control

export const k = {
	surface: {
		default: surface.default,
	},
	affix: {
		base: [
			// The slot fills the height of the frame, so the whole column of the
			// affix is a press target with the pointer cursor, and not only the
			// box of its content.
			'flex items-center self-stretch min-w-0',
			'*:data-[slot=icon]:pointer-events-none',
			...text.muted,
			...cursor,
			// The disabled input/button is a sibling of the affix, not a descendant;
			// the cursor reacts to the enclosing control frame.
			'group-has-[:disabled]/control:cursor-not-allowed group-has-[[data-disabled]]/control:cursor-not-allowed',
		],
		prefix: affix.prefix,
		suffix: affix.suffix,
	},
}

/** The size scale of the control: `sm`, `md`, and `lg`. */
export const scale = control.scale
