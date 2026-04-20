import { maru } from '../maru'
import { nagare } from '../nagare'
import { sumi } from '../sumi'
import { take } from '../take'

export type JsonValueType = 'string' | 'number' | 'boolean' | 'null' | 'key'

export const jsonValueColor: Record<JsonValueType, readonly string[] | string> = {
	key: ['text-sky-700', 'dark:text-sky-400'],
	string: ['text-emerald-700', 'dark:text-emerald-400'],
	number: ['text-amber-700', 'dark:text-amber-400'],
	boolean: ['text-violet-700', 'dark:text-violet-400'],
	null: sumi.textMuted,
}

const rowBase = [
	'group/json-node',
	'flex w-full items-center',
	take.gap.sm,
	'py-0.5',
	take.text.sm,
	maru.rounded,
	'has-focus-visible:bg-blue-100/60 dark:has-focus-visible:bg-blue-600/30',
]

export const jsonTree = {
	base: 'inline-flex flex-col font-mono',
	row: rowBase,
	leaf: ['flex flex-1 items-center min-w-0 outline-none', take.gap.sm],
	toggle: [
		'flex flex-1 items-center min-w-0 text-left cursor-pointer outline-none',
		take.gap.sm,
		sumi.textMuted,
		sumi.textHover,
		'data-[open]:text-zinc-950 dark:data-[open]:text-white',
		maru.rounded,
	],
	chevron: ['flex-none', nagare.transform],
	chevronSpacer: 'inline-block w-4 flex-none',
	key: jsonValueColor.key,
	index: sumi.textMuted,
	punctuation: sumi.textMuted,
	summary: sumi.textMuted,
	group: 'overflow-hidden',
	highlight: ['bg-amber-100/60', 'dark:bg-amber-500/15', maru.rounded],
}
