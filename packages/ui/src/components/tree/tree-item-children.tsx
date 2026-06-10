'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Children, createElement, isValidElement, type ReactNode, useMemo } from 'react'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k } from '../../recipes/kata/tree'
import { TreeContext, TreePositionContext, useTreeContext } from './context'

/**
 * Stamps each element child with its 1-based sibling position via
 * `TreePositionContext`, feeding the items' `aria-posinset`/`aria-setsize`.
 */
export function stampTreePositions(children: ReactNode): ReactNode {
	const items = Children.toArray(children)

	const setsize = items.filter((child) => isValidElement(child)).length

	let index = 0

	return items.map((child) => {
		if (!isValidElement(child)) return child

		index += 1

		return createElement(
			TreePositionContext,
			{ key: child.key ?? index, value: { posinset: index, setsize } },
			child,
		)
	})
}

type TreeItemChildrenProps = {
	open: boolean
	label: ReactNode
	children: ReactNode
}

export function TreeItemChildren({ open, label, children }: TreeItemChildrenProps) {
	const { depth, size, indent } = useTreeContext()

	const childContextValue = useMemo(
		() => ({ depth: depth + 1, size, indent }),
		[depth, size, indent],
	)

	return (
		<ReducedMotion>
			<AnimatePresence initial={false}>
				{open && (
					<TreeContext value={childContextValue}>
						<motion.div
							role="group"
							aria-label={typeof label === 'string' ? label : undefined}
							data-slot="tree-group"
							{...k.motion}
							className={k.group}
						>
							{stampTreePositions(children)}
						</motion.div>
					</TreeContext>
				)}
			</AnimatePresence>
		</ReducedMotion>
	)
}
