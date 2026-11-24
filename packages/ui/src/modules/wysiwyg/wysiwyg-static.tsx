import { createElement, type ReactNode } from 'react'
import type { MarkdownRange } from '../../components/markdown/markdown-ranges'
import { dataAttr } from '../../core/data-attr'
import { parseMarkdown } from './engine/wysiwyg-markdown/parse'
import { isEmptyDoc } from './engine/wysiwyg-schema'

/** A node of a doc. @internal */
type DocNode = ReturnType<typeof parseMarkdown>

/** A mark of a doc. @internal */
type DocMark = DocNode['marks'][number]

/**
 * A DOM output spec of the schema: a tag name, its attributes, and its
 * children, where `0` is the hole of the content. The schema gives only this
 * form.
 *
 * @internal
 */
type Spec = readonly [string, ...unknown[]]

/** The attributes of a spec as React props: `class` is `className`, and a `null` drops out. @internal */
function specProps(attrs: Record<string, unknown>, key: number): Record<string, unknown> {
	const props: Record<string, unknown> = { key }

	for (const [name, value] of Object.entries(attrs)) {
		if (value === null || value === undefined) continue

		props[name === 'class' ? 'className' : name] = value
	}

	return props
}

/**
 * The React element of a spec of the schema, with `content` in its hole, as
 * the `DOMSerializer` of ProseMirror makes the DOM node of a spec.
 *
 * @internal
 */
function fromSpec(spec: Spec, content: ReactNode, key: number): ReactNode {
	const [tag, second, ...rest] = spec

	const hasAttrs = typeof second === 'object' && second !== null && !Array.isArray(second)

	const children = (hasAttrs ? rest : [second, ...rest]).filter((child) => child !== undefined)

	return createElement(
		tag,
		specProps(hasAttrs ? (second as Record<string, unknown>) : {}, key),
		...children.map((child, index) => {
			if (child === 0) return content

			if (typeof child === 'string') return child

			return fromSpec(child as Spec, content, index)
		}),
	)
}

/**
 * The inline content of a textblock. Neighbors that share their outermost mark
 * go into one element of that mark, as the view of ProseMirror draws them.
 *
 * @internal
 */
function inlineContent(
	items: readonly { node: DocNode; marks: readonly DocMark[] }[],
): ReactNode[] {
	const out: ReactNode[] = []

	let index = 0

	while (index < items.length) {
		const item = items[index] as (typeof items)[number]

		const mark = item.marks[0]

		if (!mark) {
			out.push(item.node.isText ? item.node.text : nodeElement(item.node, index))

			index++

			continue
		}

		let end = index + 1

		while (end < items.length && items[end]?.marks[0]?.eq(mark)) end++

		const inner = items.slice(index, end).map((each) => ({ ...each, marks: each.marks.slice(1) }))

		out.push(fromSpec(mark.type.spec.toDOM?.(mark, true) as Spec, inlineContent(inner), index))

		index = end
	}

	return out
}

/**
 * Whether the view of ProseMirror ends a textblock with a line break of its
 * own, so the block keeps the height of its last line: an empty block, a
 * block that ends with a node that is not text, such as a line break, and a
 * code block that ends with a newline.
 *
 * @internal
 */
function hasTrailingBreak(textblock: DocNode): boolean {
	const last = textblock.lastChild

	return last === null || !last.isText || (last.text ?? '').endsWith('\n')
}

/** The element of a node of the doc. @internal */
function nodeElement(node: DocNode, key: number): ReactNode {
	const spec = node.type.spec.toDOM?.(node) as Spec

	if (node.isLeaf) return fromSpec(spec, null, key)

	const content: ReactNode[] = []

	if (node.isTextblock) {
		const items: { node: DocNode; marks: readonly DocMark[] }[] = []

		node.forEach((child) => {
			items.push({ node: child, marks: child.marks })
		})

		content.push(...inlineContent(items))

		if (hasTrailingBreak(node)) content.push(<br key="trailing-break" />)
	} else {
		node.forEach((child, _, index) => {
			content.push(nodeElement(child, index))
		})
	}

	return fromSpec(spec, content, key)
}

/** Props for {@link WysiwygStatic}. @internal */
type WysiwygStaticProps = {
	attributes: Record<string, string>
	value: string
	ranges: readonly MarkdownRange[]
	focusable: boolean
	/** Fires on the first focus or press, which loads the editor at once. */
	onWant: () => void
}

/**
 * The HTML attributes of the field as React props. The editor takes them by
 * their HTML names.
 *
 * @internal
 */
function reactProps(attributes: Record<string, string>): Record<string, string> {
	const { class: className = '', tabindex, enterkeyhint, ...rest } = attributes

	return {
		...rest,
		className,
		...(tabindex === undefined ? {} : { tabIndex: tabindex }),
		...(enterkeyhint === undefined ? {} : { enterKeyHint: enterkeyhint }),
	}
}

/**
 * The field before the editor loads, and the markup of the server render: the
 * doc of the value, drawn with the DOM output of the schema, as the editor
 * draws it. The first paint thus shows the formatting and the layout of the
 * field. The editor puts its own element beside it, and this one then goes.
 *
 * @internal
 */
export function WysiwygStatic({
	attributes,
	value,
	ranges,
	focusable,
	onWant,
}: WysiwygStaticProps) {
	const doc = parseMarkdown(value, ranges)

	const blocks: ReactNode[] = []

	doc.forEach((block, _, index) => {
		blocks.push(nodeElement(block, index))
	})

	return (
		// biome-ignore lint/a11y/useSemanticElements: the field holds the blocks of the editor, which a <textarea> cannot hold.
		<div
			{...reactProps(attributes)}
			role="textbox"
			tabIndex={focusable ? 0 : undefined}
			data-empty={dataAttr(isEmptyDoc(doc))}
			onFocus={onWant}
			onPointerDown={onWant}
		>
			{blocks}
		</div>
	)
}
