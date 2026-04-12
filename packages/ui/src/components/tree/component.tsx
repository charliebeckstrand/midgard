'use client'

import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactElement, type ReactNode, useState } from 'react'
import { cn } from '../../core'
import { katachi, ugoki } from '../../recipes'
import { Icon } from '../icon'
import { TreeProvider, useTreeContext } from './context'

const k = katachi.tree

// ── Tree ───────────────────────────────────────────────

export type TreeProps = {
	children: ReactNode
	className?: string
}

export function Tree({ children, className }: TreeProps) {
	return (
		<TreeProvider value={{ depth: 0 }}>
			<div role="tree" data-slot="tree" className={cn(k.root, className)}>
				{children}
			</div>
		</TreeProvider>
	)
}

// ── TreeItem ───────────────────────────────────────────

export type TreeItemProps = {
	/** The item label. */
	label: ReactNode
	/** Optional icon displayed before the label. */
	icon?: ReactElement
	/** Whether the item is expanded by default. */
	defaultOpen?: boolean
	/** Nested tree items. */
	children?: ReactNode
	className?: string
}

export function TreeItem({ label, icon, defaultOpen = false, children, className }: TreeItemProps) {
	const { depth } = useTreeContext()
	const [open, setOpen] = useState(defaultOpen)
	const hasChildren = children != null

	return (
		<div data-slot="tree-item">
			<button
				type="button"
				role="treeitem"
				aria-expanded={hasChildren ? open : undefined}
				data-slot="tree-item-content"
				className={cn(k.itemContent, className)}
				style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
				onClick={() => hasChildren && setOpen((prev) => !prev)}
			>
				<span className={cn(k.chevron, !hasChildren && 'invisible')} aria-hidden="true">
					<Icon icon={<ChevronRight />} size="sm" className={cn(open && 'rotate-90')} />
				</span>
				{icon && <Icon icon={icon} size="sm" />}
				<span className={k.label}>{label}</span>
			</button>

			{hasChildren && (
				<AnimatePresence initial={false}>
					{open && (
						<TreeProvider value={{ depth: depth + 1 }}>
							<motion.div
								role="group"
								data-slot="tree-group"
								{...ugoki.collapse}
								className={k.group}
							>
								{children}
							</motion.div>
						</TreeProvider>
					)}
				</AnimatePresence>
			)}
		</div>
	)
}
