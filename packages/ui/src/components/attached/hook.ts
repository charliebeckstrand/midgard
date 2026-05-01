import {
	Children,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useMemo,
} from 'react'
import type { AttachedOrientation, AttachedPosition } from '../../recipes/ryu/tsunagi'

function positionAt(index: number, length: number): AttachedPosition {
	if (length === 1) return 'only'
	if (index === 0) return 'start'
	if (index === length - 1) return 'end'
	return 'middle'
}

/**
 * Stamp `data-attached={start|middle|end|only}` and
 * `data-attached-orientation={horizontal|vertical}` onto each child of an
 * attached group. Participating kata read these attributes via `tsunagi.base`
 * to render the correct end-cap radii and 1 px overlap.
 *
 * Use this hook directly when a group component owns additional concerns
 * (keyboard navigation, focus management) and renders its own container.
 * For declarative use, prefer `<Attached>`.
 */
export function useAttached(children: ReactNode, orientation: AttachedOrientation): ReactNode {
	// Memoizing the cloned children stabilizes element identity across parent
	// re-renders so React's reconciliation doesn't reset descendant state
	// (focus, transient hover/active classes, etc.) every render.
	return useMemo(() => {
		const arr = Children.toArray(children).filter(isValidElement) as ReactElement[]

		return arr.map((child, index) =>
			cloneElement(child, {
				'data-attached': positionAt(index, arr.length),
				'data-attached-orientation': orientation,
				key: child.key ?? index,
			} as Partial<unknown>),
		)
	}, [children, orientation])
}
