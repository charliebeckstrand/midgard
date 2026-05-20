'use client'

import { type ReactElement, type ReactNode, useState } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/tree'
import { useTreeContext } from './context'
import { TreeItemChildren } from './tree-item-children'
import { TreeItemContent } from './tree-item-content'

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
	/** Current/selected state. */
	current?: boolean
	/** Slot before the icon (e.g. a Checkbox). Clicks here don't toggle the row. */
	prefix?: ReactNode
	/** Slot after the label. Clicks here don't toggle the row. */
	suffix?: ReactNode
	/** Nested tree items. */
	children?: ReactNode
	className?: string
}

export function TreeItem({
	label,
	icon,
	defaultOpen = false,
	open: controlledOpen,
	onOpenChange,
	current,
	prefix,
	suffix,
	children,
	className,
}: TreeItemProps) {
	const { depth } = useTreeContext()

	const [internalOpen, setInternalOpen] = useState(defaultOpen)

	const isControlled = controlledOpen !== undefined

	const open = isControlled ? controlledOpen : internalOpen

	const hasChildren = children != null

	const setOpen = (next: boolean) => {
		if (!isControlled) setInternalOpen(next)

		onOpenChange?.(next)
	}

	return (
		<div data-slot="tree-item" className={cn(depth === 0 && k.item)}>
			<TreeItemContent
				label={label}
				icon={icon}
				prefix={prefix}
				suffix={suffix}
				current={current}
				hasChildren={hasChildren}
				open={open}
				onOpenChange={setOpen}
				className={className}
			/>
			{hasChildren && (
				<TreeItemChildren open={open} label={label}>
					{children}
				</TreeItemChildren>
			)}
		</div>
	)
}
