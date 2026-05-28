import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, ugoki } from '../kiso'

export type JsonValueType = 'string' | 'number' | 'boolean' | 'null' | 'key'

const color: Record<JsonValueType, readonly string[] | string> = {
	key: mode('text-sky-700', 'dark:text-sky-400'),
	string: mode('text-emerald-700', 'dark:text-emerald-400'),
	number: mode('text-amber-700', 'dark:text-amber-400'),
	boolean: mode('text-violet-700', 'dark:text-violet-400'),
	null: iro.text.muted,
}

const row = [
	'group/json-node',
	narabi.row,
	'w-full',
	'gap-1',
	'py-0.5',
	ji.sm,
	kasane.rounded.lg,
	...mode('has-focus-visible:bg-blue-100/60', 'dark:has-focus-visible:bg-blue-600/30'),
]

export const k = {
	base: ['inline-flex flex-col', ji.family.mono],
	row,
	leaf: [narabi.row, narabi.fill, 'min-w-0 outline-none', 'gap-1'],
	toggle: [
		narabi.row,
		narabi.fill,
		'min-w-0 text-left',
		...hannou.cursor,
		'outline-none',
		'gap-1',
		iro.text.muted,
		hannou.text.hover,
		...mode('data-[open]:text-zinc-950', 'dark:data-[open]:text-white'),
		kasane.rounded.lg,
	],
	content: [narabi.inlineRow, 'min-w-0', 'gap-1'],
	chevron: ['flex-none', ugoki.css.transform, ugoki.css.duration],
	chevronSpacer: 'inline-block w-4 flex-none',
	key: color.key,
	index: iro.text.muted,
	punctuation: iro.text.muted,
	summary: iro.text.muted,
	group: 'overflow-hidden',
	highlight: [...mode('bg-amber-100/60', 'dark:bg-amber-500/15'), kasane.rounded.lg],
	motion: ugoki.collapse.fade,
	valueColor: color,
} as const
