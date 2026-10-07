import { mode } from '../../core/recipe'
import { hannou, iro, ji, narabi, sen, ugoki } from '../kiso'
import { dan } from '../kiso/dan'

const { cursor, disabled, fg } = hannou
const { text } = iro
const { size } = ji
const { flex } = narabi
const { focus } = sen
const { collapse } = ugoki

export const k = {
	base: 'group/collapse',
	trigger: [
		flex.inline,
		dan.gap.scale.sm,
		size.md,
		text.muted,
		fg.hover,
		// The open color reads the `aria-expanded` of the trigger itself. Thus an open
		// outer Collapse does not give its color to the trigger of a nested Collapse.
		...mode('aria-expanded:text-zinc-950', 'dark:aria-expanded:text-white'),
		focus.ring,
		...disabled,
		...cursor,
	],
	// The panel has no clip of its own. Its motion clips it only while its height
	// moves, and `animate={false}` has no motion, so it has no clip.
	motion: collapse,
} as const
