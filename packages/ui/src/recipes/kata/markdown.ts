/**
 * Markdown kata: per-element prose surface for `<Markdown>`. The renderer walks
 * marked's tokens to a React tree and pulls each element's classes from the
 * matching slot, so styling rides on the target element, not the wrapper. No
 * variants axis — one slot per prose element: `root`/`inline`, the `heading`
 * level map, block text, lists, table parts, and `img`. Code spans and fenced
 * blocks render through the `Code` / `CodeBlock` components instead of a slot
 * here — see `markdown-renderer.tsx`.
 *
 * Deliberately text-color-agnostic: no slot sets a `text-*` color, so the
 * whole tree inherits the foreground of whatever container it renders in (the
 * page in the docs, a `ChatMessage` bubble in chat). Color is an inherited CSS
 * property, so simply omitting it is enough — and it spares every consumer
 * from having to override a baked-in palette to recolor the prose (e.g. white
 * text on the chat user bubble's blue fill). Rhythm, weight, size, list
 * markers, and the structural rule/border colors are the kata's concern;
 * foreground color is the container's.
 *
 * Every slot is a string, never an array. `cn` memoises on its arguments, and
 * it can branch on a string only; an array takes the plain merge instead
 * (`core/cn.ts`). The renderer calls `cn` once for each element. An array slot
 * therefore pays a full `clsx` + `tailwind-merge` pass for every heading, link,
 * row, and cell in the document. The kiso tokens that arrive as arrays join
 * once here, at module load; new slots must stay strings.
 */
import { ji, sen } from '../kiso'

const { size, weight } = ji

// The line tones arrive as a light/dark pair; join each once, not per element.
const borderDefault = sen.border.defaultColor.join(' ')

const borderEmphasis = sen.border.emphasisColor.join(' ')

const headingBase = weight.semibold

export const k = {
	// First/last-child margin collapse so the prose sits flush in its container
	// (API-reference rows, Example previews). No color — inherits the container.
	root: '[&>:first-child]:mt-0 [&>:last-child]:mb-0',
	// The `inline` prop: no block rhythm, and (like the rest) no color of its own.
	inline: '',

	heading: {
		1: `${headingBase} ${size.xl} mt-6 mb-3`,
		2: `${headingBase} ${size.lg} mt-6 mb-3`,
		3: `${headingBase} ${size.md} mt-5 mb-2`,
		4: `${headingBase} ${size.sm} mt-4 mb-2`,
		5: `${headingBase} ${size.sm} mt-4 mb-2`,
		6: `${headingBase} ${size.sm} mt-4 mb-2`,
	},

	paragraph: 'my-3',
	strong: weight.semibold,
	em: 'italic',
	del: 'line-through',
	// Underlined and medium-weight, not colored: it stays distinguishable from
	// body text by underline alone (WCAG 1.4.1) and inherits the prose color.
	link: `${weight.medium} underline underline-offset-2`,

	// A list item tightens any nested list and drops its marker for a task item.
	ul: 'my-3 list-disc pl-5',
	ol: 'my-3 list-decimal pl-5',
	li: 'my-1 [&>ul]:my-1 [&>ol]:my-1',
	task: 'list-none',
	checkbox: 'mr-2',

	blockquote: 'my-4 border-l-2 border-zinc-300 pl-4 italic dark:border-zinc-700',
	hr: `border-0 border-t ${borderDefault} my-6`,

	// Emphasis rule under the header, default rule under cells.
	table: 'my-4 w-full text-left',
	th: `${weight.semibold} border-b px-3 py-2 ${borderEmphasis}`,
	td: `border-b px-3 py-2 ${borderDefault}`,
	align: { left: 'text-left', right: 'text-right', center: 'text-center' },

	img: 'my-4 max-w-full rounded-lg',
} as const
