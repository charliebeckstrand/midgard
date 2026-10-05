import { mode } from '../../core/recipe'
import { hannou, iro, ji, narabi, sen, ugoki } from '../kiso'

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
		'gap-2',
		size.md,
		text.muted,
		fg.hover,
		...mode(
			'group-data-[open]/collapse:text-zinc-950',
			'dark:group-data-[open]/collapse:text-white',
		),
		focus.ring,
		...disabled,
		...cursor,
	],
	// The panel has no clip of its own. Its motion clips it only while its height
	// moves, and `animate={false}` has no motion, so it has no clip.
	motion: collapse.clipped,
} as const
