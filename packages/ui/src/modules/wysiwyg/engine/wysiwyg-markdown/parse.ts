import type { Token, Tokens } from 'marked'
import type { Mark, Node } from 'prosemirror-model'
import { decodeEntities } from '../../../../components/markdown/markdown-entities'
import { lex } from '../../../../components/markdown/markdown-lex'
import { schema } from '../wysiwyg-schema'

/**
 * The doc of a Markdown source. It lexes with the `lex` of Markdown, so the
 * field and a message read a source in the same way. A block or an inline
 * construct that the schema does not hold becomes a `raw` or a `raw_inline`
 * atom that keeps its source, so no text goes.
 *
 * @internal
 */
export function parseMarkdown(source: string): Node {
	const blocks = toBlocks(lex(source))

	return schema.node('doc', null, blocks.length > 0 ? blocks : [schema.node('paragraph')])
}

/** @internal */
function toBlocks(tokens: readonly Token[]): Node[] {
	const blocks: Node[] = []

	for (const token of tokens) {
		const node = toBlock(token)

		if (node) blocks.push(node)
	}

	return blocks
}

/** @internal */
function toBlock(token: Token): Node | null {
	switch (token.type) {
		case 'space':
		case 'def':
			return null
		case 'paragraph':
			return schema.node('paragraph', null, toInline(token.tokens ?? [], []))
		// A loose line of a tight list item, which holds its inline tokens.
		case 'text':
			return schema.node('paragraph', null, toInline(token.tokens ?? [token], []))
		case 'heading':
			return schema.node(
				'heading',
				{ level: token.depth },
				// A heading holds no line break.
				toInline(token.tokens ?? [], []).filter((node) => node.type !== schema.nodes.hard_break),
			)
		case 'blockquote': {
			const content = toBlocks(token.tokens ?? [])

			return schema.node(
				'blockquote',
				null,
				content.length > 0 ? content : [schema.node('paragraph')],
			)
		}
		case 'list':
			return toList(token as Tokens.List)
		case 'code':
			return schema.node(
				'code_block',
				{ lang: token.lang ?? '' },
				token.text ? schema.text(token.text) : undefined,
			)
		case 'hr':
			return schema.node('horizontal_rule')
		default:
			return raw(token.raw)
	}
}

/**
 * A list, or a `raw` block for a task list, because the schema has no
 * checkbox.
 *
 * @internal
 */
function toList(token: Tokens.List): Node {
	if (token.items.some((item) => item.task)) return raw(token.raw)

	const items = token.items.map((item) => {
		const content = toBlocks(item.tokens)

		// An item opens with a paragraph, as the schema asks.
		if (content[0]?.type !== schema.nodes.paragraph) content.unshift(schema.node('paragraph'))

		return schema.node('list_item', null, content)
	})

	return token.ordered
		? schema.node(
				'ordered_list',
				{ start: typeof token.start === 'number' ? token.start : 1, tight: !token.loose },
				items,
			)
		: schema.node('bullet_list', { tight: !token.loose }, items)
}

/** @internal */
function raw(source: string): Node {
	return schema.node('raw', { source: source.replace(/\n+$/, '') })
}

/**
 * The inline nodes of `tokens` under the marks of their parents.
 *
 * @internal
 */
function toInline(tokens: readonly Token[], marks: readonly Mark[]): Node[] {
	const nodes: Node[] = []

	const push = (text: string, set: readonly Mark[]) => {
		if (text) nodes.push(schema.text(text, set))
	}

	for (const token of tokens) {
		switch (token.type) {
			case 'text':
				if (token.tokens) {
					nodes.push(...toInline(token.tokens, marks))

					break
				}

				// A soft break shows as a space in a message, so it is a space here.
				push(decodeEntities(token.raw).replace(/\n/g, ' '), marks)

				break
			case 'escape':
				push(token.text, marks)

				break
			case 'strong':
				nodes.push(...toInline(token.tokens ?? [], schema.marks.strong.create().addToSet(marks)))

				break
			case 'em':
				nodes.push(...toInline(token.tokens ?? [], schema.marks.em.create().addToSet(marks)))

				break
			case 'del':
				nodes.push(...toInline(token.tokens ?? [], schema.marks.strike.create().addToSet(marks)))

				break
			case 'codespan':
				push(token.text, schema.marks.code.create().addToSet(marks))

				break
			case 'link': {
				const link = schema.marks.link.create({
					href: decodeEntities(token.href),
					title: token.title ? decodeEntities(token.title) : null,
				})

				nodes.push(...toInline(token.tokens ?? [], link.addToSet(marks)))

				break
			}
			case 'br':
				nodes.push(schema.node('hard_break'))

				break
			default:
				nodes.push(schema.node('raw_inline', { source: token.raw }))
		}
	}

	return nodes
}
