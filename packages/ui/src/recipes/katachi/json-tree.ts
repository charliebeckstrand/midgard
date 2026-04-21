import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nagare } from '../nagare'

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
	kumi.gap.sm,
	'py-0.5',
	ji.size.sm,
	maru.rounded.lg,
	'has-focus-visible:bg-blue-100/60 dark:has-focus-visible:bg-blue-600/30',
]

export const jsonTree = {
	base: 'inline-flex flex-col font-mono',
	row: rowBase,
	leaf: ['flex flex-1 items-center min-w-0 outline-none', kumi.gap.sm],
	toggle: [
		'flex flex-1 items-center min-w-0 text-left cursor-pointer outline-none',
		kumi.gap.sm,
		iro.text.muted,
		iro.text.hover,
		'data-[open]:text-zinc-950 dark:data-[open]:text-white',
		maru.rounded.lg,
	],
	chevron: ['flex-none', nagare.transform],
	chevronSpacer: 'inline-block w-4 flex-none',
	key: jsonValueColor.key,
	index: iro.text.muted,
	punctuation: iro.text.muted,
	summary: iro.text.muted,
	group: 'overflow-hidden',
	highlight: ['bg-amber-100/60', 'dark:bg-amber-500/15', maru.rounded.lg],
}
