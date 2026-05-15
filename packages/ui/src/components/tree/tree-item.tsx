'use client'

import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
	type KeyboardEvent,
	type MouseEvent,
	type ReactElement,
	type ReactNode,
	useMemo,
	useState,
} from 'react'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { ugoki } from '../../recipes'
import { k } from '../../recipes/kata/tree'
import { Icon } from '../icon'
import { TreeProvider, useTreeContext } from './context'

export type TreeItemProps = {
	/** The item label. */
	label: ReactNode
	/** Icon before the label. */
	icon?: ReactElement
	/** Initially expanded (uncontrolled). Ignored when `open` is provided. */
	defaultOpen?: boolean
	/** Controlled expanded state. When provided, the item operates in controlled mode. */
	open?: boolean
	/** Called when the user toggles the item. Fires in both controlled and uncontrolled modes. */
	onOpenChange?: (open: boolean) => void
	/** Active/selected state. */
	active?: boolean
	/** Slot before the icon (e.g. a Checkbox). Clicks here don't toggle the row. */
	prefix?: ReactNode
	/** Slot after the label. Clicks here don't toggle the row. */
	suffix?: ReactNode
	/** Nested tree items. */
	children?: ReactNode
	className?: string
}

const AFFIX_SELECTOR = '[data-slot="tree-item-prefix"], [data-slot="tree-item-suffix"]'

const PREFIX_INTERACTIVE_SELECTOR =
	'[data-slot="tree-item-prefix"] input, [data-slot="tree-item-prefix"] button, [data-slot="tree-item-prefix"] [role="checkbox"]'

export function TreeItem({
	label,
	icon,
	defaultOpen = false,
	open: controlledOpen,
	onOpenChange,
	active,
	prefix,
	suffix,
	children,
	className,
}: TreeItemProps) {
	const { depth, size, indent } = useTreeContext()

	const [internalOpen, setInternalOpen] = useState(defaultOpen)

	const isControlled = controlledOpen !== undefined

	const open = isControlled ? controlledOpen : internalOpen

	const hasChildren = children != null

	const childContextValue = useMemo(
		() => ({ depth: depth + 1, size, indent }),
		[depth, size, indent],
	)

	const iconSize = k.iconSize[size]

	const paddingLeft = indent ? `${0.5 + depth * k.indentStep[size]}rem` : '0.5rem'

	const setOpen = (next: boolean) => {
		if (!isControlled) setInternalOpen(next)

		onOpenChange?.(next)
	}

	const toggle = () => {
		if (hasChildren) setOpen(!open)
	}

	const handleClick = (e: MouseEvent<HTMLDivElement>) => {
		if (e.target instanceof Element && e.target.closest(AFFIX_SELECTOR)) return

		if (hasChildren) {
			toggle()
			return
		}

		// Leaf row: forward the click to the first interactive control in the prefix slot
		// so clicking the label toggles its Checkbox.
		const target = e.currentTarget.querySelector<HTMLElement>(PREFIX_INTERACTIVE_SELECTOR)

		target?.click()
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.target !== e.currentTarget) return
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()

			if (hasChildren) {
				toggle()

				return
			}

			const target = e.currentTarget.querySelector<HTMLElement>(PREFIX_INTERACTIVE_SELECTOR)

			target?.click()

			return
		}
		if (e.key === 'ArrowRight' && hasChildren && !open) {
			e.preventDefault()

			setOpen(true)

			return
		}
		if (e.key === 'ArrowLeft' && hasChildren && open) {
			e.preventDefault()

			setOpen(false)
		}
	}

	return (
		<div data-slot="tree-item" className={cn(depth === 0 && k.item)}>
			<div
				role="treeitem"
				aria-expanded={hasChildren ? open : undefined}
				aria-level={depth + 1}
				tabIndex={-1}
				data-slot="tree-item-content"
				data-open={open || undefined}
				className={cn(
					'group/tree-item',
					k.itemContent,
					k.itemContentSize[size],
					active && k.itemContentActive,
					className,
				)}
				style={{ paddingLeft }}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
			>
				<span className={cn(k.chevron, k.chevronWidth[size])} aria-hidden="true">
					{hasChildren && (
						<Icon icon={<ChevronRight />} size={iconSize} className={cn(open && 'rotate-90')} />
					)}
				</span>
				{prefix != null && (
					<span data-slot="tree-item-prefix" className="flex flex-none items-center">
						{prefix}
					</span>
				)}
				{icon && <Icon icon={icon} size={iconSize} />}
				<span className={k.label}>{label}</span>
				{suffix != null && (
					<span data-slot="tree-item-suffix" className="flex flex-none items-center">
						{suffix}
					</span>
				)}
			</div>

			{hasChildren && (
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
			)}
		</div>
	)
}
