import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { ugoki } from '../ryu/ugoki'

export type JsonValueType = 'string' | 'number' | 'boolean' | 'null' | 'key'

export const jsonValueColor: Record<JsonValueType, readonly string[] | string> = {
	key: ['text-sky-700', 'dark:text-sky-400'],
	string: ['text-emerald-700', 'dark:text-emerald-400'],
	number: ['text-amber-700', 'dark:text-amber-400'],
	boolean: ['text-violet-700', 'dark:text-violet-400'],
	null: iro.text.muted,
}

const rowBase = [
	'group/json-node',
	'flex w-full items-center',
	'gap-xs',
	'py-0.5',
	ji.size.sm,
	'rounded-lg',
	'has-focus-visible:bg-blue-100/60 dark:has-focus-visible:bg-blue-600/30',
]

export const jsonTree = {
	base: 'inline-flex flex-col font-mono',
	row: rowBase,
	leaf: ['flex flex-1 items-center min-w-0 outline-none', 'gap-xs'],
	toggle: [
		'flex flex-1 items-center min-w-0 text-left cursor-pointer outline-none',
		'gap-xs',
		iro.text.muted,
		iro.text.hover,
		'data-[open]:text-zinc-950 dark:data-[open]:text-white',
		'rounded-lg',
	],
	content: ['inline-flex items-center min-w-0', 'gap-xs'],
	chevron: ['flex-none', ugoki.css.transform, ugoki.css.duration],
	chevronSpacer: 'inline-block w-4 flex-none',
	key: jsonValueColor.key,
	index: iro.text.muted,
	punctuation: iro.text.muted,
	summary: iro.text.muted,
	group: 'overflow-hidden',
	highlight: ['bg-amber-100/60', 'dark:bg-amber-500/15', 'rounded-lg'],
}
