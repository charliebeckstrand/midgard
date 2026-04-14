'use client'

import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactElement, type ReactNode, useRef, useState } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import { ugoki } from '../../recipes'
import { type TreeColor, treeColorMap } from '../../recipes/katachi/tree'
import { Icon } from '../icon'
import { TreeProvider, useTreeContext } from './context'
import { k } from './variants'

// ── Tree ───────────────────────────────────────────────

export type TreeProps = {
	children: ReactNode
	/** Default icon color. */
	color?: TreeColor
	className?: string
}

export function Tree({ children, color, className }: TreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(ref, {
		itemSelector: '[role="treeitem"]',
		orientation: 'vertical',
	})

	return (
		<TreeProvider value={{ depth: 0, color }}>
			<div
				ref={ref}
				role="tree"
				data-slot="tree"
				className={cn(k.root, className)}
				onKeyDown={handleKeyDown}
			>
				{children}
			</div>
		</TreeProvider>
	)
}

// ── TreeItem ───────────────────────────────────────────

export type TreeItemProps = {
	/** The item label. */
	label: ReactNode
	/** Icon before the label. */
	icon?: ReactElement
	/** Initially expanded. */
	defaultOpen?: boolean
	/** Active/selected state. */
	active?: boolean
	/** Icon color. */
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
				aria-level={depth + 1}
				tabIndex={-1}
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
			)}
		</div>
	)
}
