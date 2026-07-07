/**
 * JSON-tree kata: object-literal surface for the collapsible JSON viewer.
 * Carries a per-value-type syntax-colour table (`valueColor`, keyed by
 * {@link JsonValueType}) authored inline with `mode()` — these editor-style
 * hues are local to this viewer, not a shared iro palette. Rows, the expand
 * toggle, chevron, and the collapse motion config round out the surface.
 */
import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, ugoki } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { family, size } = ji
const { rounded } = kasane
const { flex } = narabi
const { collapse, css } = ugoki

/** The syntax-highlight classes a {@link JsonTree} node can take — one per primitive value kind plus `key` for object property names. */
export type JsonValueType = 'string' | 'number' | 'boolean' | 'null' | 'key'

const color = {
	key: mode('text-sky-700', 'dark:text-sky-400'),
	string: mode('text-emerald-700', 'dark:text-emerald-400'),
	number: mode('text-amber-700', 'dark:text-amber-400'),
	boolean: mode('text-violet-600', 'dark:text-violet-400'),
	null: text.muted,
} satisfies Record<JsonValueType, readonly string[] | string>

const row = [
	'group/json-node',
	flex.row,
	'w-full',
	'gap-1',
	'py-0.5',
	size.sm,
	rounded.lg,
	...mode('has-focus-visible:bg-blue-100/60', 'dark:has-focus-visible:bg-blue-500/30'),
]

export const k = {
	base: ['inline-flex flex-col', family.mono],
	row,
	leaf: [flex.row, flex.fill, 'min-w-0 outline-none', 'gap-1'],
	toggle: [
		flex.row,
		flex.fill,
		'min-w-0 text-left',
		...cursor,
		'outline-none',
		'gap-1',
		text.muted,
		fg.hover,
		...mode('data-[open]:text-zinc-950', 'dark:data-[open]:text-white'),
		rounded.lg,
	],
	content: [flex.inline, 'min-w-0', 'gap-1'],
	chevron: {
		icon: ['flex-none', css.transform, css.duration],
		spacer: 'inline-block w-4 flex-none',
	},
	key: color.key,
	index: text.muted,
	punctuation: text.muted,
	summary: text.muted,
	group: 'overflow-hidden',
	highlight: [...mode('bg-amber-100/60', 'dark:bg-amber-500/15'), rounded.lg],
	motion: collapse.fade,
	valueColor: color,
} as const
