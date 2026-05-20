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
import type { GroupOrientation, GroupPosition } from '../../core/recipe'
import { JoinProvider } from '../../primitives/join'

function positionAt(index: number, length: number): GroupPosition {
	if (length === 1) return 'only'
	if (index === 0) return 'start'
	if (index === length - 1) return 'end'

	return 'middle'
}

// Recurse into fragments so callers can wrap branches in `<>` without
// breaking position stamping. `Children.toArray` would treat a fragment
// as a single child.
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
 * Stamp `data-group={start|middle|end|only}` and
 * `data-group-orientation={horizontal|vertical}` onto each child of a
 * group, and broadcast the same position via `JoinContext` so descendants
 * that swap their render path (e.g. a leaf control rendering `<Placeholder>`
 * in skeleton mode) can still pick up the correct end-cap radii without
 * each control having to forward `data-group` itself.
 *
 * Use this hook directly when a group component owns additional concerns
 * (keyboard navigation, focus management) and renders its own container.
 * For declarative use, prefer `<Group>`.
 */
export function useGroup(children: ReactNode, orientation: GroupOrientation): ReactNode {
	// Memoizing the cloned children stabilizes element identity across parent
	// re-renders so React's reconciliation doesn't reset descendant state
	// (focus, transient hover/active classes, etc.) every render.
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

			return createElement(JoinProvider, { key, value: { position, orientation } }, cloned)
		})
	}, [children, orientation])
}
