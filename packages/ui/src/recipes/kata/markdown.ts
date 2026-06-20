/**
 * Markdown kata: per-element prose surface for `<Markdown>`. The renderer walks
 * marked's tokens to a React tree and pulls each element's classes from the
 * matching slot, so styling rides on the target element, not the wrapper. No
 * variants axis — one slot per prose element: `root`/`inline`, the `heading`
 * level map, block text, lists, `code`/`pre`, table parts, and `img`.
 */
import { iro, ji, kasane, omote, sen, shaku } from '../kiso'

const { palette, text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { mark } = shaku

const headingBase = [...text.default, weight.semibold]

export const k = {
	// Body tone, plus a first/last-child margin collapse so the prose sits flush
	// in its container (API-reference rows, Example previews).
	root: [...text.muted, '[&>:first-child]:mt-0', '[&>:last-child]:mb-0'],
	// The `inline` prop: body tone, no block rhythm.
	inline: [...text.muted],

	heading: {
		1: [...headingBase, size.xl, 'mt-6 mb-3'],
		2: [...headingBase, size.lg, 'mt-6 mb-3'],
		3: [...headingBase, size.md, 'mt-5 mb-2'],
		4: [...headingBase, size.sm, 'mt-4 mb-2'],
		5: [...headingBase, size.sm, 'mt-4 mb-2'],
		6: [...headingBase, size.sm, 'mt-4 mb-2'],
	},

	paragraph: 'my-3',
	strong: [...text.default, weight.semibold],
	em: 'italic',
	del: 'line-through',
	link: [
		...palette.bare.text.blue,
		...palette.bare.hover.blue,
		weight.medium,
		'underline underline-offset-2',
	],

	// A list item tightens any nested list and drops its marker for a task item.
	ul: 'my-3 list-disc pl-5',
	ol: 'my-3 list-decimal pl-5',
	li: 'my-1 [&>ul]:my-1 [&>ol]:my-1',
	task: 'list-none',
	checkbox: 'mr-2',

	// Inline code reuses the shared `mark` chrome; fenced blocks sit on the kiso
	// code canvas with light text, and the nested `<code>` inherits both.
	code: [...mark.base, ...mark.size.sm, ...text.default],
	pre: [omote.bg.code, rounded.lg, 'my-4 overflow-x-auto p-4', size.sm, 'text-zinc-100'],
	preCode: 'font-mono text-inherit',

	blockquote: [...text.muted, 'my-4 border-l-2 border-zinc-300 pl-4 italic dark:border-zinc-700'],
	hr: ['border-0 border-t', ...sen.border.defaultColor, 'my-6'],

	// Emphasis rule under the header, default rule under cells.
	table: 'my-4 w-full text-left',
	th: [...text.default, weight.semibold, 'border-b px-3 py-2', ...sen.border.emphasisColor],
	td: ['border-b px-3 py-2', ...sen.border.defaultColor],
	align: { left: 'text-left', right: 'text-right', center: 'text-center' },

	img: 'my-4 max-w-full rounded-lg',
} as const
