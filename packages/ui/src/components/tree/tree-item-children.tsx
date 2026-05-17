'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useMemo } from 'react'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { ugoki } from '../../recipes'
import { k } from '../../recipes/kata/tree'
import { TreeProvider, useTreeContext } from './context'

export type TreeItemChildrenProps = {
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
					<TreeProvider value={childContextValue}>
						<motion.div
							role="group"
							aria-label={typeof label === 'string' ? label : undefined}
							data-slot="tree-group"
							{...ugoki.collapse.fade}
							className={k.group}
						>
							{children}
						</motion.div>
					</TreeProvider>
				)}
			</AnimatePresence>
		</ReducedMotion>
	)
}
