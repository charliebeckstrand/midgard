import {
	Children,
	cloneElement,
	Fragment,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useMemo,
} from 'react'
import type { GroupOrientation, GroupPosition } from '../../recipes/ryu/tsunagi'

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
 * group. Participating kata read these attributes via `tsunagi.base` to
 * render the correct end-cap radii and 1 px overlap.
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

		return arr.map((child, index) =>
			cloneElement(child, {
				'data-group': positionAt(index, arr.length),
				'data-group-orientation': orientation,
				key: child.key ?? index,
			} as Partial<unknown>),
		)
	}, [children, orientation])
}
