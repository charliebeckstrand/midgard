import {
	type DOMOutputSpec,
	type MarkSpec,
	type NodeSpec,
	type Node as ProseMirrorNode,
	Schema,
} from 'prosemirror-model'
import { cn } from '../../../core/cn'
import { k as code } from '../../../recipes/kata/code'
import { k as markdown } from '../../../recipes/kata/markdown'

/**
 * The classes of the prose. They are the slots of the Markdown kata, so a
 * draft looks as the message that it sends.
 */
const prose = markdown()

const block = code({ canvas: 'dark' }).block

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
		toDOM: (): DOMOutputSpec => ['p', { class: prose.paragraph }, 0],
	},
	heading: {
		group: 'block',
		attrs: { level: { default: 1, validate: 'number' } },
		content: '(text | raw_inline)*',
		marks: '_',
		defining: true,
		parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({ tag: `h${level}`, attrs: { level } })),
		toDOM: (node): DOMOutputSpec => [
			`h${node.attrs.level}`,
			{ class: markdown({ level: node.attrs.level }).heading },
			0,
		],
	},
	blockquote: {
		group: 'block',
		content: 'block+',
		defining: true,
		parseDOM: [{ tag: 'blockquote' }],
		toDOM: (): DOMOutputSpec => ['blockquote', { class: prose.blockquote }, 0],
	},
	bullet_list: {
		group: 'block',
		content: 'list_item+',
		attrs: { tight: { default: true, validate: 'boolean' } },
		parseDOM: [{ tag: 'ul' }],
		toDOM: (node): DOMOutputSpec => [
			'ul',
			{ class: prose.ul, 'data-tight': node.attrs.tight ? '' : null },
			0,
		],
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
				getAttrs: (dom) => ({ start: Number((dom as HTMLElement).getAttribute('start') ?? 1) }),
			},
		],
		toDOM: (node): DOMOutputSpec => [
			'ol',
			{
				class: prose.ol,
				start: node.attrs.start === 1 ? null : node.attrs.start,
				'data-tight': node.attrs.tight ? '' : null,
			},
			0,
		],
	},
	list_item: {
		content: 'paragraph block*',
		defining: true,
		parseDOM: [{ tag: 'li' }],
		toDOM: (): DOMOutputSpec => ['li', { class: prose.li }, 0],
	},
	code_block: {
		group: 'block',
		content: 'text*',
		marks: '',
		code: true,
		defining: true,
		attrs: { lang: { default: '', validate: 'string' } },
		parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
		toDOM: (): DOMOutputSpec => [
			'pre',
			{ class: cn(block.base, block.content, block.fallback), dir: 'ltr' },
			['code', 0],
		],
	},
	horizontal_rule: {
		group: 'block',
		parseDOM: [{ tag: 'hr' }],
		toDOM: (): DOMOutputSpec => ['hr', { class: prose.hr }],
	},
	/**
	 * A block that the schema does not hold, as its Markdown source. It shows the
	 * source as code, and the source goes back out byte for byte, so no draft
	 * loses text.
	 */
	raw: {
		group: 'block',
		atom: true,
		selectable: true,
		attrs: { source: { validate: 'string' } },
		toDOM: (node): DOMOutputSpec => [
			'pre',
			{ class: cn(block.base, block.content, block.fallback), dir: 'ltr' },
			['code', node.attrs.source],
		],
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
		toDOM: (): DOMOutputSpec => ['br'],
	},
	/** An inline construct that the schema does not hold, such as an image, as its source. */
	raw_inline: {
		group: 'inline',
		inline: true,
		atom: true,
		attrs: { source: { validate: 'string' } },
		toDOM: (node): DOMOutputSpec => ['code', { class: code().base, dir: 'ltr' }, node.attrs.source],
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
		// The link does not navigate in the field, so it has no `href`. A press puts
		// the caret in its text, as in each other editor.
		toDOM: (mark): DOMOutputSpec => [
			'a',
			{ class: prose.link, title: mark.attrs.title, 'data-href': mark.attrs.href },
			0,
		],
	},
	strong: {
		parseDOM: [
			{ tag: 'strong' },
			{ tag: 'b' },
			{ style: 'font-weight=bold' },
			{
				style: 'font-weight',
				getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null,
			},
		],
		toDOM: (): DOMOutputSpec => ['strong', { class: prose.strong }, 0],
	},
	em: {
		parseDOM: [{ tag: 'em' }, { tag: 'i' }, { style: 'font-style=italic' }],
		toDOM: (): DOMOutputSpec => ['em', { class: prose.em }, 0],
	},
	strike: {
		parseDOM: [{ tag: 'del' }, { tag: 's' }, { style: 'text-decoration=line-through' }],
		toDOM: (): DOMOutputSpec => ['del', { class: prose.del }, 0],
	},
	code: {
		code: true,
		parseDOM: [{ tag: 'code' }],
		toDOM: (): DOMOutputSpec => ['code', { class: code().base, dir: 'ltr' }, 0],
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
