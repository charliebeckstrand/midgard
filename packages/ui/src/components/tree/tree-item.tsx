'use client'

import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactElement, type ReactNode, useMemo, useState } from 'react'
import { cn } from '../../core'
import { ugoki } from '../../recipes'
import { Icon } from '../icon'
import { TreeProvider, useTreeContext } from './context'
import { k } from './variants'

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
	/** Nested tree items. */
	children?: ReactNode
	className?: string
}

export function TreeItem({
	label,
	icon,
	defaultOpen = false,
	active,
	children,
	className,
}: TreeItemProps) {
	const { depth } = useTreeContext()

	const [open, setOpen] = useState(defaultOpen)

	const hasChildren = children != null

	const childContextValue = useMemo(
		() => ({ depth: depth + 1 }),

		[depth],
	)

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
					<span className={cn(k.chevron)} aria-hidden="true">
						<Icon icon={<ChevronRight />} size="sm" className={cn(open && 'rotate-90')} />
					</span>
				)}
				{icon && <Icon icon={icon} size="sm" />}
				<span className={k.label}>{label}</span>
			</button>

			{hasChildren && (
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
			)}
		</div>
	)
}
