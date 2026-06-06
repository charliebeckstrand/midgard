'use client'

import { ChevronRight } from 'lucide-react'
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/tree'
import { Icon } from '../icon'
import { useTreeContext } from './context'
import { AFFIX_SELECTOR, PREFIX_INTERACTIVE_SELECTOR } from './tree-constants'

type TreeItemContentProps = {
	label: ReactNode
	icon?: ReactElement
	prefix?: ReactNode
	suffix?: ReactNode
	current?: boolean
	hasChildren: boolean
	open: boolean
	onOpenChange: (open: boolean) => void
	className?: string
}

export function TreeItemContent({
	label,
	icon,
	prefix,
	suffix,
	current,
	hasChildren,
	open,
	onOpenChange,
	className,
}: TreeItemContentProps) {
	const { depth, size, indent } = useTreeContext()

	const paddingLeft = indent ? `${0.5 + depth * k.indentStep[size]}rem` : '0.5rem'

	const toggle = () => {
		if (hasChildren) onOpenChange(!open)
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

			onOpenChange(true)

			return
		}
		if (e.key === 'ArrowLeft' && hasChildren && open) {
			e.preventDefault()

			onOpenChange(false)
		}
	}

	return (
		<div
			role="treeitem"
			aria-expanded={hasChildren ? open : undefined}
			aria-current={current || undefined}
			aria-level={depth + 1}
			tabIndex={-1}
			data-slot="tree-item-content"
			data-open={open || undefined}
			className={cn(
				'group/tree-item',
				k.itemContent({ size }),
				current && k.itemContent.current,
				className,
			)}
			style={{ paddingLeft }}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
		>
			<span className={k.chevron({ size })} aria-hidden="true">
				{hasChildren && (
					<Icon icon={<ChevronRight />} size={size} className={cn(open && 'rotate-90')} />
				)}
			</span>
			{prefix != null && (
				<span data-slot="tree-item-prefix" className="flex flex-none items-center">
					{prefix}
				</span>
			)}
			{icon && <Icon icon={icon} size={size} />}
			<span className={k.label}>{label}</span>
			{suffix != null && (
				<span data-slot="tree-item-suffix" className="flex flex-none items-center">
					{suffix}
				</span>
			)}
		</div>
	)
}
