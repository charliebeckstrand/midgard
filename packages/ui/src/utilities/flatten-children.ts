import { Children, Fragment, isValidElement, type ReactNode } from 'react'

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
