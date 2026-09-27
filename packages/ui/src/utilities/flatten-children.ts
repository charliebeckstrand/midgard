import {
	Children,
	cloneElement,
	Fragment,
	isValidElement,
	type JSXElementConstructor,
	type ReactElement,
	type ReactNode,
} from 'react'

/** One child from {@link flattenChildren}, with its key for the flat list. @internal */
export type FlatChild = { node: ReactNode; key: string }

/**
 * Flattens `children` into one list, and recurses into each Fragment.
 * `Children.toArray` treats a Fragment as one opaque child, so a caller that
 * counts siblings reads the wrong number.
 *
 * @remarks Each key carries its Fragment path, so keys stay unique in one flat
 * list. `Children.forEach` keeps the slot index of a `false` child. Thus a
 * sibling key does not shift when a conditional child toggles. Non-element
 * children (text, numbers) stay in place.
 *
 * @param children - The children to flatten.
 * @param prefix - The Fragment path of the current level; the recursion sets it.
 * @returns Each child with its namespaced key, in render order.
 * @internal
 */
export function flattenChildren(children: ReactNode, prefix = ''): FlatChild[] {
	const result: FlatChild[] = []

	Children.forEach(children, (child, index) => {
		if (isValidElement(child) && child.type === Fragment) {
			result.push(
				...flattenChildren(
					(child.props as { children?: ReactNode }).children,
					`${prefix}${index}.`,
				),
			)

			return
		}

		const ownKey = isValidElement(child) && child.key != null ? child.key : String(index)

		result.push({ node: child, key: `${prefix}${ownKey}` })
	})

	return result
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
	return flattenChildren(children).some(({ node }) => isElementOfType(node, type))
}

/**
 * Splits `children` into the elements of `type` and the rest, through each
 * Fragment. A slot in a Fragment is found as if it were a direct child.
 *
 * @remarks Each element takes its key from {@link flattenChildren}, so the two
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

	for (const { node, key } of flattenChildren(children)) {
		const keyed = isValidElement(node) ? cloneElement(node, { key }) : node

		if (isElementOfType(keyed, type)) {
			matched.push(keyed)
		} else {
			rest.push(keyed)
		}
	}

	return { matched, rest }
}
