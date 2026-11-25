import { createElement, type ReactNode, useState } from 'react'
import type { MarkdownRange } from '../../components/markdown/markdown-ranges'
import { dataAttr } from '../../core/data-attr'
import { useHydrated } from '../../hooks/use-hydrated'
import {
	cancelLink,
	markDOM,
	nodeDOM,
	textblockTypes,
	type WysiwygSpec,
} from './engine/wysiwyg-dom'
import {
	isEmptyDocJSON,
	markdownDoc,
	type WysiwygDocMark,
	type WysiwygDocNode,
} from './engine/wysiwyg-markdown/doc'
import {
	captureEarlyInput,
	type WysiwygEarlyInput,
	type WysiwygEarlyItem,
	type WysiwygSource,
} from './wysiwyg-early-input'

/** The React name of each HTML attribute that the editor or a spec gives with another name. @internal */
const REACT_NAMES: Readonly<Record<string, string>> = {
	class: 'className',
	tabindex: 'tabIndex',
	enterkeyhint: 'enterKeyHint',
}

/**
 * HTML attributes as React props. The editor and the specs give them by their
 * HTML names, and a `null` or an `undefined` attribute drops out, as in the
 * `DOMSerializer` of ProseMirror.
 *
 * @internal
 */
function reactProps(attrs: Readonly<Record<string, unknown>>): Record<string, unknown> {
	const props: Record<string, unknown> = {}

	for (const [name, value] of Object.entries(attrs)) {
		if (value === null || value === undefined) continue

		props[REACT_NAMES[name] ?? name] = value
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
		{ key, ...reactProps(hasAttrs ? (second as Record<string, unknown>) : {}) },
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

/**
 * Whether the markup of a field holds no content: one paragraph with no text,
 * as an empty doc draws it.
 *
 * @internal
 */
function isEmptyMarkup(root: Element): boolean {
	const first = root.firstElementChild

	return (
		root.childElementCount === 1 &&
		first?.localName === 'p' &&
		first.textContent === '' &&
		first.querySelector('[data-raw], br:not(:last-child)') === null
	)
}

/** Props for {@link WysiwygStatic}. @internal */
type WysiwygStaticProps = {
	attributes: Record<string, string>
	value: string
	ranges: readonly MarkdownRange[]
	focusable: boolean
	/** Whether the reader can edit the field. */
	editable: boolean
	/** The input before the editor loads. */
	early: WysiwygEarlyInput
	/** Holds an input for the editor. */
	hold: (item: WysiwygEarlyItem) => void
}

/**
 * The field before the editor loads, and the markup of the server render: the
 * doc of the value, drawn with the markup of the schema, as the editor draws
 * it. The first paint thus shows the formatting and the layout of the field.
 * The editor puts its own element beside it, and this one then goes.
 *
 * After hydration, an editable field takes input. The browser makes each edit
 * of the text in a block, so the reader sees each key at once, and the field
 * holds each other input for the editor ({@link WysiwygEarlyInput}).
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
	editable,
	early,
	hold,
}: WysiwygStaticProps) {
	// The server markup takes no input, so an edit before hydration does not
	// make the markup differ from the render that hydrates it.
	const live = useHydrated() && editable

	// The source at the first edit of the browser. The markup keeps drawing it,
	// so React changes no node that the browser edited.
	const [edited, setEdited] = useState<WysiwygSource | null>(null)

	// Whether the markup is empty after an edit of the browser, for the placeholder.
	const [emptied, setEmptied] = useState<boolean | null>(null)

	const drawn = edited ?? { value, ranges }

	const doc = markdownDoc(drawn.value, drawn.ranges)

	const capture = (root: HTMLDivElement | null) => {
		if (!root || !live) return

		return captureEarlyInput(root, {
			early,
			hold,
			onEdit: () => {
				if (early.edited()) return

				early.edit(drawn)

				setEdited(drawn)
			},
			onInput: (field) => setEmptied(isEmptyMarkup(field)),
		})
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: the field holds the blocks of the editor, which a <textarea> cannot hold.
		// biome-ignore lint/a11y/useKeyWithClickEvents: the click handler only stops a link from navigating, and a key does not press a link here: the links are out of the Tab order.
		<div
			{...reactProps(attributes)}
			ref={capture}
			role="textbox"
			tabIndex={focusable ? 0 : undefined}
			contentEditable={live || undefined}
			suppressContentEditableWarning
			data-empty={dataAttr(emptied ?? isEmptyDocJSON(doc))}
			onClick={cancelLink}
			onAuxClick={cancelLink}
		>
			{(doc.content ?? []).map((block, index) => nodeElement(block, index))}
		</div>
	)
}
