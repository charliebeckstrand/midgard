import {
	Children,
	cloneElement,
	Fragment,
	isValidElement,
	type JSXElementConstructor,
	type ReactElement,
	type ReactNode,
} from 'react'

/** One child from {@link flattenFragments}, with its key for the flat list. @internal */
export type FlatChild = { node: ReactNode; key: string }

/**
 * The key segment of one child at its level. An explicit key takes a `$` mark,
 * and an index stays bare, so the two namespaces do not meet: `key="3"` gives
 * `$3`, and the child at index 3 gives `3`. A `.` in an explicit key is
 * escaped, so it cannot read as a level of the path.
 *
 * @internal
 */
function keySegment(child: ReactNode, index: number): string {
	if (!isValidElement(child) || child.key == null) return String(index)

	return `$${child.key.replace(/[=.]/g, (match) => (match === '=' ? '=0' : '=1'))}`
}

/**
 * Flattens `children` into one list, and recurses into each Fragment.
 * `Children.toArray` treats a Fragment as one opaque child, so a caller that
 * counts siblings reads the wrong number.
 *
 * @remarks Each key is the path of key segments from the top, joined by `.`.
 * A keyed Fragment gives its own key to the path, so its children keep their
 * keys when the Fragment moves. Keys therefore stay unique in one flat list.
 * `Children.forEach` keeps the slot index of a `false` child. Thus a sibling
 * key does not shift when a conditional child toggles. Non-element children
 * (text, numbers) stay in place.
 *
 * @param children - The children to flatten.
 * @param prefix - The Fragment path of the current level; the recursion sets it.
 * @returns Each child with its namespaced key, in render order.
 * @internal
 */
export function flattenFragments(children: ReactNode, prefix = ''): FlatChild[] {
	const result: FlatChild[] = []

	Children.forEach(children, (child, index) => {
		const key = `${prefix}${keySegment(child, index)}`

		if (isValidElement(child) && child.type === Fragment) {
			result.push(
				...flattenFragments((child.props as { children?: ReactNode }).children, `${key}.`),
			)

			return
		}

		result.push({ node: child, key })
	})

	return result
}

/**
 * Whether a slot holds content. `0` is content and renders in its slot.
 * `undefined`, `null`, `true`, `false`, `''`, an empty array, and an array or a
 * Fragment that holds only these are empty.
 *
 * @internal
 */
export function hasContent(node: ReactNode): boolean {
	// A single node needs no walk. A grid calls this once for each cell.
	if (node == null || typeof node === 'boolean') return false

	if (typeof node !== 'object') return node !== ''

	if (isValidElement(node) && node.type !== Fragment) return true

	// `Children.forEach` gives `null` for each boolean.
	return flattenFragments(node).some((child) => child.node != null && child.node !== '')
}

/**
 * Whether a child is an element of `type`.
 *
 * @internal
 */
export function isElementOfType<P>(
	node: ReactNode,
	type: JSXElementConstructor<P>,
): node is ReactElement<P> {
	return isValidElement(node) && node.type === type
}

/**
 * Whether a child of `type` is present, through each Fragment.
 *
 * @internal
 */
export function hasChildOfType(children: ReactNode, type: JSXElementConstructor<never>): boolean {
	return flattenFragments(children).some(({ node }) => isElementOfType(node, type))
}

/**
 * Splits `children` into the elements of `type` and the rest, through each
 * Fragment. A slot in a Fragment is found as if it were a direct child.
 *
 * @remarks Each element takes its key from {@link flattenFragments}, so the two
 * lists render with unique keys.
 *
 * @returns `matched`, the elements of `type`, and `rest`, the other children,
 * each in render order.
 * @internal
 */
export function partitionByType<P>(
	children: ReactNode,
	type: JSXElementConstructor<P>,
): { matched: ReactElement<P>[]; rest: ReactNode[] } {
	const matched: ReactElement<P>[] = []

	const rest: ReactNode[] = []

	for (const { node, key } of flattenFragments(children)) {
		const keyed = isValidElement(node) ? cloneElement(node, { key }) : node

		if (isElementOfType(keyed, type)) {
			matched.push(keyed)
		} else {
			rest.push(keyed)
		}
	}

	return { matched, rest }
}
