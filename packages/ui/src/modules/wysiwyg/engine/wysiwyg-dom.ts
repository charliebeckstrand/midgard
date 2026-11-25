import { safeUrl } from '../../../components/markdown/markdown-safe-url'
import { cn } from '../../../core/cn'
import { k as code } from '../../../recipes/kata/code'
import { k as markdown } from '../../../recipes/kata/markdown'

/**
 * A DOM output spec: a tag name, its attributes, and its children, where `0`
 * is the hole of the content. It is the `DOMOutputSpec` form of ProseMirror,
 * so the schema gives it from `toDOM`, and the markup before the editor loads
 * draws it with no ProseMirror.
 *
 * @internal
 */
export type WysiwygSpec = readonly [string, ...unknown[]]

/** The attributes of a node or a mark of a doc. @internal */
type Attrs = Readonly<Record<string, unknown>>

/**
 * The markup of each node or mark type in `specs`, by its name. The result
 * keeps the names, so the schema calls each one by its name.
 *
 * @internal
 */
function domSpecs<Type extends string>(
	specs: Record<Type, (attrs: Attrs) => WysiwygSpec>,
): Readonly<Record<Type, (attrs: Attrs) => WysiwygSpec>> {
	return specs
}

/**
 * The classes of the prose. They are the slots of the Markdown kata, so a
 * draft looks as the message that it sends.
 */
const prose = markdown()

const block = code({ canvas: 'dark' }).block

/**
 * The classes of the `pre` of a code block: the frame and the scroll box of
 * the code kata in one box, with no copy button. The frame of the kata is a
 * flex row for its copy button. Here the box is a block, and the code is
 * inline in it. In a flex row, the code is a flex item as wide as its text,
 * so an empty code has no width, and the browser draws no caret in it.
 */
const codeBlockClass = cn(block.base, block.content, block.fallback, 'block')

/**
 * The markup of each node of a doc that has its own element, by its type.
 * The schema and the markup before the editor loads both draw a node with it,
 * so the two have one layout.
 *
 * @internal
 */
export const nodeDOM = domSpecs({
	paragraph: () => ['p', { class: prose.paragraph }, 0],
	heading: (attrs) => [
		`h${attrs.level}`,
		{ class: markdown({ level: attrs.level as 1 | 2 | 3 | 4 | 5 | 6 }).heading },
		0,
	],
	blockquote: () => ['blockquote', { class: prose.blockquote }, 0],
	bullet_list: (attrs) => ['ul', { class: prose.ul, 'data-tight': attrs.tight ? '' : null }, 0],
	ordered_list: (attrs) => [
		'ol',
		{
			class: prose.ol,
			start: attrs.start === 1 ? null : attrs.start,
			'data-tight': attrs.tight ? '' : null,
		},
		0,
	],
	list_item: () => ['li', { class: prose.li }, 0],
	code_block: () => ['pre', { class: codeBlockClass, dir: 'ltr' }, ['code', 0]],
	horizontal_rule: () => ['hr', { class: prose.hr }],
	raw: (attrs) => [
		'pre',
		{ class: codeBlockClass, dir: 'ltr', 'data-raw': '' },
		['code', attrs.source],
	],
	hard_break: () => ['br'],
	raw_inline: (attrs) => ['code', { class: code().base, dir: 'ltr', 'data-raw': '' }, attrs.source],
})

/**
 * The node types that hold inline content. The markup before the editor loads
 * ends each one with a line break where the view does.
 *
 * @internal
 */
export const textblockTypes: ReadonlySet<string> = new Set(['paragraph', 'heading', 'code_block'])

/**
 * The markup of each mark of a doc, by its type.
 *
 * @internal
 */
export const markDOM = domSpecs({
	// The link has its `href`, so a screen reader reads it as a link with its
	// URL. It has the URL guard of `Markdown`, so a URL that can run script
	// draws no `href`. The editor and the markup before it load cancel a press
	// on it, which puts the caret in its text, as in each other editor. It is
	// out of the Tab order of a read-only field, and a drag in it selects text.
	link: (attrs) => [
		'a',
		{
			class: prose.link,
			href: safeUrl(attrs.href as string),
			title: attrs.title,
			tabindex: '-1',
			draggable: 'false',
		},
		0,
	],
	strong: () => ['strong', { class: prose.strong }, 0],
	em: () => ['em', { class: prose.em }, 0],
	strike: () => ['del', { class: prose.del }, 0],
	code: () => ['code', { class: code().base, dir: 'ltr' }, 0],
	range: (attrs) => ['span', { 'data-slot': 'wysiwyg-range', 'data-range': attrs.id }, 0],
})

/**
 * Cancels the navigation of a press on a link of the field. The field then
 * handles the press as on any text. The editor and the markup before it loads
 * both call it.
 *
 * @internal
 */
export function cancelLink(event: Pick<Event, 'target' | 'preventDefault'>): false {
	if (event.target instanceof Element && event.target.closest('a[href]')) event.preventDefault()

	return false
}
