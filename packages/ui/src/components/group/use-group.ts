import { cloneElement, isValidElement, type ReactNode, useMemo } from 'react'
import type { GroupOrientation, GroupPosition } from '../../recipes'
import { flattenChildren } from '../../utilities/flatten-children'

function positionAt(index: number, length: number): GroupPosition {
	if (length === 1) return 'only'
	if (index === 0) return 'start'
	if (index === length - 1) return 'end'

	return 'middle'
}

/**
 * Stamps `data-group={start|middle|end|only}` and
 * `data-group-orientation={horizontal|vertical}` onto each child of a group.
 * Descendants that swap their render path pick up the join geometry from those
 * data attributes, through the container-scoped `tsunagi` selectors. No control
 * has to forward `data-group` itself. A leaf control rendering `<Placeholder>`
 * in skeleton mode is one such descendant.
 *
 * @internal
 */
export function useGroup(children: ReactNode, orientation: GroupOrientation): ReactNode {
	// Memoized: stable element identity across parent re-renders preserves
	// descendant state (focus, transient hover/active classes, etc.).
	return useMemo(() => {
		const flat = flattenChildren(children)

		// Stamps position on joinable elements only; non-element children pass
		// through in place without affecting start/middle/end calculation.
		const total = flat.reduce((count, { node }) => (isValidElement(node) ? count + 1 : count), 0)

		const stamped: ReactNode[] = []

		let elementIndex = 0

		for (const { node, key } of flat) {
			if (!isValidElement(node)) {
				stamped.push(node)

				continue
			}

			stamped.push(
				cloneElement(node, {
					'data-group': positionAt(elementIndex, total),
					'data-group-orientation': orientation,
					key,
				} as Partial<unknown>),
			)

			elementIndex += 1
		}

		return stamped
	}, [children, orientation])
}
