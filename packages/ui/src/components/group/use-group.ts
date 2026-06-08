import {
	Children,
	cloneElement,
	createElement,
	Fragment,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useMemo,
} from 'react'
import { JoinContext } from '../../primitives/join'
import type { GroupOrientation, GroupPosition } from '../../recipes'

function positionAt(index: number, length: number): GroupPosition {
	if (length === 1) return 'only'
	if (index === 0) return 'start'
	if (index === length - 1) return 'end'

	return 'middle'
}

// Recurse into fragments, flattening them into the position-stamping pass.
// `Children.toArray` treats a fragment as a single opaque child.
function flattenChildren(children: ReactNode): ReactElement[] {
	const result: ReactElement[] = []

	Children.forEach(children, (child) => {
		if (!isValidElement(child)) return

		if (child.type === Fragment) {
			result.push(...flattenChildren((child.props as { children?: ReactNode }).children))
		} else {
			result.push(child)
		}
	})

	return result
}

/**
 * Stamps `data-group={start|middle|end|only}` and
 * `data-group-orientation={horizontal|vertical}` onto each child of a
 * group, and broadcasts the same position via `JoinContext`. Descendants
 * that swap their render path (e.g. a leaf control rendering `<Placeholder>`
 * in skeleton mode) read position from context without each control
 * forwarding `data-group` itself.
 *
 * Use this hook directly when a group component owns additional concerns
 * (keyboard navigation, focus management) and renders its own container.
 * For declarative use, prefer `<Group>`.
 */
export function useGroup(children: ReactNode, orientation: GroupOrientation): ReactNode {
	// Memoized: stable element identity across parent re-renders preserves
	// descendant state (focus, transient hover/active classes, etc.).
	return useMemo(() => {
		const arr = flattenChildren(children)

		return arr.map((child, index) => {
			const position = positionAt(index, arr.length)
			const key = child.key ?? index

			const cloned = cloneElement(child, {
				'data-group': position,
				'data-group-orientation': orientation,
				key,
			} as Partial<unknown>)

			return createElement(JoinContext, { key, value: { position, orientation } }, cloned)
		})
	}, [children, orientation])
}
