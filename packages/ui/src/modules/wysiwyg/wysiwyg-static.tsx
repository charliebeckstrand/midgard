import { createElement, type ReactNode } from 'react'
import type { MarkdownRange } from '../../components/markdown/markdown-ranges'
import { dataAttr } from '../../core/data-attr'
import { markDOM, nodeDOM, textblockTypes, type WysiwygSpec } from './wysiwyg-dom'
import {
	isEmptyDocJSON,
	markdownDoc,
	type WysiwygDocMark,
	type WysiwygDocNode,
} from './wysiwyg-markdown-doc'

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
 * The React element of a spec, with `content` in its hole, as the
 * `DOMSerializer` of ProseMirror makes the DOM node of a spec.
 *
 * @internal
 */
function fromSpec(spec: WysiwygSpec, content: ReactNode, key: number): ReactNode {
	const [tag, second, ...rest] = spec

	const hasAttrs = typeof second === 'object' && second !== null && !Array.isArray(second)

	const children = (hasAttrs ? rest : [second, ...rest]).filter((child) => child !== undefined)

	return createElement(
		tag,
		specProps(hasAttrs ? (second as Record<string, unknown>) : {}, key),
		...children.map((child, index) => {
			if (child === 0) return content

			if (typeof child === 'string') return child

			return fromSpec(child as WysiwygSpec, content, index)
		}),
	)
}

/** Whether two marks are one mark: the same type with the same attributes. @internal */
function sameMark(a: WysiwygDocMark, b: WysiwygDocMark | undefined): boolean {
	return b !== undefined && a.type === b.type && JSON.stringify(a.attrs) === JSON.stringify(b.attrs)
}

/** The spec of a node or a mark by its type, or none for a type with no markup. @internal */
function findSpec(
	specs: Readonly<Record<string, (attrs: Record<string, unknown>) => WysiwygSpec>>,
	type: string,
	attrs: Record<string, unknown> | undefined,
): WysiwygSpec | undefined {
	return specs[type]?.(attrs ?? {})
}

/**
 * The inline content of a textblock. Neighbors that share their outermost mark
 * go into one element of that mark, as the view of ProseMirror draws them.
 *
 * @internal
 */
function inlineContent(
	items: readonly { node: WysiwygDocNode; marks: readonly WysiwygDocMark[] }[],
): ReactNode[] {
	const out: ReactNode[] = []

	let index = 0

	while (index < items.length) {
		const item = items[index] as (typeof items)[number]

		const mark = item.marks[0]

		if (!mark) {
			out.push(item.node.type === 'text' ? item.node.text : nodeElement(item.node, index))

			index++

			continue
		}

		let end = index + 1

		while (end < items.length && sameMark(mark, items[end]?.marks[0])) end++

		const inner = items.slice(index, end).map((each) => ({ ...each, marks: each.marks.slice(1) }))

		const spec = findSpec(markDOM, mark.type, mark.attrs)

		out.push(spec ? fromSpec(spec, inlineContent(inner), index) : inlineContent(inner))

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
function hasTrailingBreak(textblock: WysiwygDocNode): boolean {
	const last = textblock.content?.at(-1)

	return last === undefined || last.type !== 'text' || (last.text ?? '').endsWith('\n')
}

/** The element of a node of the doc. @internal */
function nodeElement(node: WysiwygDocNode, key: number): ReactNode {
	const spec = findSpec(nodeDOM, node.type, node.attrs)

	if (!spec) return null

	const children = node.content ?? []

	if (!textblockTypes.has(node.type)) {
		return fromSpec(
			spec,
			children.map((child, index) => nodeElement(child, index)),
			key,
		)
	}

	const content = inlineContent(
		children.map((child) => ({ node: child, marks: child.marks ?? [] })),
	)

	if (hasTrailingBreak(node)) content.push(<br key="trailing-break" />)

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
 * doc of the value, drawn with the markup of the schema, as the editor draws
 * it. The first paint thus shows the formatting and the layout of the field.
 * The editor puts its own element beside it, and this one then goes.
 *
 * @remarks It imports no ProseMirror, so the engine stays out of the bundle
 * that draws the first paint.
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
	const doc = markdownDoc(value, ranges)

	return (
		// biome-ignore lint/a11y/useSemanticElements: the field holds the blocks of the editor, which a <textarea> cannot hold.
		<div
			{...reactProps(attributes)}
			role="textbox"
			tabIndex={focusable ? 0 : undefined}
			data-empty={dataAttr(isEmptyDocJSON(doc))}
			onFocus={onWant}
			onPointerDown={onWant}
		>
			{(doc.content ?? []).map((block, index) => nodeElement(block, index))}
		</div>
	)
}
