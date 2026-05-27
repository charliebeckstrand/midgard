import { hannou, iro, ji, ugoki } from '../kiso'

export type JsonValueType = 'string' | 'number' | 'boolean' | 'null' | 'key'

const jsonValueColor: Record<JsonValueType, readonly string[] | string> = {
	key: ['text-sky-700', 'dark:text-sky-400'],
	string: ['text-emerald-700', 'dark:text-emerald-400'],
	number: ['text-amber-700', 'dark:text-amber-400'],
	boolean: ['text-violet-700', 'dark:text-violet-400'],
	null: iro.text.muted,
}

const rowBase = [
	'group/json-node',
	'flex w-full items-center',
	'gap-1',
	'py-0.5',
	ji.sm,
	'rounded-lg',
	'has-focus-visible:bg-blue-100/60 dark:has-focus-visible:bg-blue-600/30',
]

export const k = {
	base: 'inline-flex flex-col font-mono',
	row: rowBase,
	leaf: ['flex flex-1 items-center min-w-0 outline-none', 'gap-1'],
	toggle: [
		'flex flex-1 items-center min-w-0 text-left cursor-pointer outline-none',
		'gap-1',
		iro.text.muted,
		hannou.text.hover,
		'data-[open]:text-zinc-950 dark:data-[open]:text-white',
		'rounded-lg',
	],
	content: ['inline-flex items-center min-w-0', 'gap-1'],
	chevron: ['flex-none', ugoki.css.transform, ugoki.css.duration],
	chevronSpacer: 'inline-block w-4 flex-none',
	key: jsonValueColor.key,
	index: iro.text.muted,
	punctuation: iro.text.muted,
	summary: iro.text.muted,
	group: 'overflow-hidden',
	highlight: ['bg-amber-100/60', 'dark:bg-amber-500/15', 'rounded-lg'],
	motion: ugoki.collapse.fade,
	valueColor: jsonValueColor,
}
