import {
	type DOMOutputSpec,
	type MarkSpec,
	type NodeSpec,
	type Node as ProseMirrorNode,
	Schema,
} from 'prosemirror-model'
import { markDOM, nodeDOM } from './wysiwyg-dom'

/** The attributes of a `raw` or a `raw_inline` atom from its element: its text is the source. */
function rawSource(dom: HTMLElement) {
	return { source: dom.textContent ?? '' }
}

/**
 * Whether a list from its element is tight. The markup writes `data-loose` on
 * a loose list only, so a copy and a paste keeps the attribute.
 */
function tightList(dom: HTMLElement) {
	return !dom.hasAttribute('data-loose')
}

/**
 * The block nodes of a draft: the Markdown blocks that a chat message renders.
 * A block that the schema does not hold, such as a table or raw HTML, is a
 * `raw` atom that keeps its source.
 */
const nodes = {
	doc: { content: 'block+' },
	paragraph: {
		group: 'block',
		content: 'inline*',
		parseDOM: [{ tag: 'p' }],
		toDOM: (node): DOMOutputSpec => nodeDOM.paragraph(node.attrs),
	},
	heading: {
		group: 'block',
		attrs: { level: { default: 1, validate: 'number' } },
		content: '(text | raw_inline)*',
		marks: '_',
		defining: true,
		parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({ tag: `h${level}`, attrs: { level } })),
		toDOM: (node): DOMOutputSpec => nodeDOM.heading(node.attrs),
	},
	blockquote: {
		group: 'block',
		content: 'block+',
		defining: true,
		parseDOM: [{ tag: 'blockquote' }],
		toDOM: (node): DOMOutputSpec => nodeDOM.blockquote(node.attrs),
	},
	bullet_list: {
		group: 'block',
		content: 'list_item+',
		attrs: { tight: { default: true, validate: 'boolean' } },
		parseDOM: [{ tag: 'ul', getAttrs: (dom) => ({ tight: tightList(dom) }) }],
		toDOM: (node): DOMOutputSpec => nodeDOM.bullet_list(node.attrs),
	},
	ordered_list: {
		group: 'block',
		content: 'list_item+',
		attrs: {
			start: { default: 1, validate: 'number' },
			tight: { default: true, validate: 'boolean' },
		},
		parseDOM: [
			{
				tag: 'ol',
				getAttrs: (dom) => ({
					start: Number(dom.getAttribute('start') ?? 1),
					tight: tightList(dom),
				}),
			},
		],
		toDOM: (node): DOMOutputSpec => nodeDOM.ordered_list(node.attrs),
	},
	list_item: {
		content: 'paragraph block*',
		defining: true,
		parseDOM: [{ tag: 'li' }],
		toDOM: (node): DOMOutputSpec => nodeDOM.list_item(node.attrs),
	},
	code_block: {
		group: 'block',
		content: 'text*',
		marks: '',
		code: true,
		defining: true,
		attrs: { lang: { default: '', validate: 'string' } },
		parseDOM: [
			{
				tag: 'pre',
				preserveWhitespace: 'full',
				getAttrs: (dom) => ({ lang: dom.getAttribute('data-lang') ?? '' }),
			},
		],
		toDOM: (node): DOMOutputSpec => nodeDOM.code_block(node.attrs),
	},
	horizontal_rule: {
		group: 'block',
		parseDOM: [{ tag: 'hr' }],
		toDOM: (node): DOMOutputSpec => nodeDOM.horizontal_rule(node.attrs),
	},
	/**
	 * A block that the schema does not hold, as its Markdown source. It shows the
	 * source as code, and the source goes back out byte for byte, so no draft
	 * loses text. Its parse rule comes before the rule of a code block, so a copy
	 * and a paste, or a drag, keeps it a `raw` block.
	 */
	raw: {
		group: 'block',
		atom: true,
		selectable: true,
		attrs: { source: { validate: 'string' } },
		parseDOM: [{ tag: 'pre[data-raw]', priority: 60, getAttrs: rawSource }],
		toDOM: (node): DOMOutputSpec => nodeDOM.raw(node.attrs),
	},
	text: { group: 'inline' },
	/**
	 * A line break. A change to or from a code block turns it into a newline
	 * of the code, or a newline into it, so no line goes.
	 */
	hard_break: {
		group: 'inline',
		inline: true,
		selectable: false,
		linebreakReplacement: true,
		parseDOM: [{ tag: 'br' }],
		toDOM: (node): DOMOutputSpec => nodeDOM.hard_break(node.attrs),
	},
	/**
	 * An inline construct that the schema does not hold, such as an image, as its
	 * source. Its parse rule comes before the rule of the code mark, as the rule
	 * of `raw` does.
	 */
	raw_inline: {
		group: 'inline',
		inline: true,
		atom: true,
		attrs: { source: { validate: 'string' } },
		parseDOM: [{ tag: 'code[data-raw]', priority: 60, getAttrs: rawSource }],
		toDOM: (node): DOMOutputSpec => nodeDOM.raw_inline(node.attrs),
	},
} satisfies Record<string, NodeSpec>

const marks = {
	link: {
		attrs: {
			href: { validate: 'string' },
			title: { default: null, validate: 'string|null' },
		},
		inclusive: false,
		parseDOM: [
			{
				tag: 'a[href]',
				getAttrs: (dom) => ({
					href: (dom as HTMLElement).getAttribute('href'),
					title: (dom as HTMLElement).getAttribute('title'),
				}),
			},
		],
		toDOM: (mark): DOMOutputSpec => markDOM.link(mark.attrs),
	},
	strong: {
		parseDOM: [
			{ tag: 'strong' },
			// Google Docs wraps the HTML of a copy in a `b` that is not bold.
			{
				tag: 'b',
				getAttrs: (dom) => (dom as HTMLElement).style.fontWeight !== 'normal' && null,
			},
			{ style: 'font-weight=bold' },
			{
				style: 'font-weight',
				getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null,
			},
		],
		toDOM: (mark): DOMOutputSpec => markDOM.strong(mark.attrs),
	},
	em: {
		parseDOM: [{ tag: 'em' }, { tag: 'i' }, { style: 'font-style=italic' }],
		toDOM: (mark): DOMOutputSpec => markDOM.em(mark.attrs),
	},
	strike: {
		parseDOM: [{ tag: 'del' }, { tag: 's' }, { style: 'text-decoration=line-through' }],
		toDOM: (mark): DOMOutputSpec => markDOM.strike(mark.attrs),
	},
	code: {
		code: true,
		parseDOM: [{ tag: 'code' }],
		toDOM: (mark): DOMOutputSpec => markDOM.code(mark.attrs),
	},
	/**
	 * A range of the value, such as a citation of a chat draft. The caller
	 * constructs it, so no input makes one, and an edit in it removes it.
	 * It is the last mark, so each other mark holds it and it splits none of
	 * them. Two ranges do not overlap, as on Markdown.
	 */
	range: {
		attrs: { id: { validate: 'string' } },
		inclusive: false,
		toDOM: (mark): DOMOutputSpec => markDOM.range(mark.attrs),
	},
} satisfies Record<string, MarkSpec>

/**
 * The schema of a Wysiwyg draft. Its nodes and marks are the Markdown that a
 * chat message renders, and each renders with the classes of the Markdown
 * kata, so the field looks as the message.
 *
 * @internal
 */
export const schema = new Schema({ nodes, marks })

/**
 * Whether a doc is empty: one paragraph with no content. The field then shows
 * its placeholder.
 *
 * @internal
 */
export function isEmptyDoc(doc: ProseMirrorNode): boolean {
	const first = doc.firstChild

	return doc.childCount === 1 && first?.type === schema.nodes.paragraph && first.content.size === 0
}
