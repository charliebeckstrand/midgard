import { defineKata } from '../../core/recipe'
import { dan, hannou, iro, ji, narabi, sen, ugoki } from '../kiso'

const { cursor, disabled, fg } = hannou
const { text } = iro
const { size } = ji
const { flex } = narabi
const { focus } = sen
const { collapse } = ugoki

export const k = defineKata(
	{
		base: 'group/collapse',
		slots: {
			// The panel adds nothing to the intrinsic width of the collapse, as the
			// accordion panel does. A host that fits its content thus keeps one width
			// while the panel opens and closes, and the text of the panel wraps at that
			// width. A block host sets the width itself, so there nothing changes.
			panel: 'contain-inline-size',
			trigger: [
				flex.inline,
				dan.gap.scale.sm,
				size.md,
				text.muted,
				fg.hover,
				// The open color reads the `aria-expanded` of the trigger itself. Thus an open
				// outer Collapse does not give its color to the trigger of a nested Collapse.
				...fg.expanded,
				focus.ring,
				...disabled,
				...cursor,
			],
		},
	},
	{
		// The panel has no clip of its own. Its motion clips it only while its height
		// moves, and `animate={false}` has no motion, so it has no clip.
		motion: collapse,
	},
)
