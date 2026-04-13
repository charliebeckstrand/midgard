'use client'

import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactElement, type ReactNode, useState } from 'react'
import { cn } from '../../core'
import { katachi, ugoki } from '../../recipes'
import { type TreeColor, treeColorMap } from '../../recipes/katachi/tree'
import { Icon } from '../icon'
import { TreeProvider, useTreeContext } from './context'

const k = katachi.tree

// ── Tree ───────────────────────────────────────────────

export type TreeProps = {
	children: ReactNode
	/** Default color applied to all item icons. */
	color?: TreeColor
	className?: string
}

export function Tree({ children, color, className }: TreeProps) {
	return (
		<TreeProvider value={{ depth: 0, color }}>
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
	/** Whether the item is the active/selected item. */
	active?: boolean
	/** Color applied to the icon. */
	color?: TreeColor
	/** Nested tree items. */
	children?: ReactNode
	className?: string
}

export function TreeItem({
	label,
	icon,
	defaultOpen = false,
	active,
	color,
	children,
	className,
}: TreeItemProps) {
	const { depth, color: contextColor } = useTreeContext()

	const resolvedColor = color ?? contextColor
	const [open, setOpen] = useState(defaultOpen)

	const hasChildren = children != null

	return (
		<div data-slot="tree-item">
			<button
				type="button"
				role="treeitem"
				aria-expanded={hasChildren ? open : undefined}
				data-slot="tree-item-content"
				data-open={open || undefined}
				className={cn('group/tree-item', k.itemContent, active && k.itemContentActive, className)}
				style={{ paddingLeft: `${depth * 1.375 + 0.5}rem` }}
				onClick={() => hasChildren && setOpen((prev) => !prev)}
			>
				{hasChildren && (
					<span className={k.chevron} aria-hidden="true">
						<Icon icon={<ChevronRight />} size="sm" className={cn(open && 'rotate-90')} />
					</span>
				)}
				{icon && (
					<Icon icon={icon} size="sm" className={resolvedColor && treeColorMap[resolvedColor]} />
				)}
				<span className={k.label}>{label}</span>
			</button>

			{hasChildren && (
				<AnimatePresence initial={false}>
					{open && (
						<TreeProvider value={{ depth: depth + 1, color: resolvedColor }}>
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
