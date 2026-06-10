import {
	Children,
	cloneElement,
	createElement,
	Fragment,
	isValidElement,
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

type FlatChild = { node: ReactNode; key: string }

// Recurse into fragments, flattening them into the position-stamping pass.
// `Children.toArray` treats a fragment as a single opaque child. Each entry
// carries a key namespaced by its fragment path; keys unique within a fragment
// stay unique once hoisted into one list. Non-element children (text/number)
// stay in place.
function flattenChildren(children: ReactNode, prefix = ''): FlatChild[] {
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
		const flat = flattenChildren(children)

		// Stamps position on joinable elements only; non-element children pass
		// through in place without affecting start/middle/end calculation.
		const total = flat.reduce((count, { node }) => (isValidElement(node) ? count + 1 : count), 0)

		let elementIndex = 0

		return flat.map(({ node, key }) => {
			if (!isValidElement(node)) return node

			const position = positionAt(elementIndex, total)

			elementIndex += 1

			const cloned = cloneElement(node, {
				'data-group': position,
				'data-group-orientation': orientation,
				key,
			} as Partial<unknown>)

			return createElement(JoinContext, { key, value: { position, orientation } }, cloned)
		})
	}, [children, orientation])
}
