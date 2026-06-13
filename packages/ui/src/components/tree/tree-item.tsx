'use client'

import type { ReactElement, ReactNode } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { k } from '../../recipes/kata/tree'
import { useTreeContext } from './context'
import { TreeItemChildren } from './tree-item-children'
import { TreeItemContent } from './tree-item-content'

/** Props for {@link TreeItem}. */
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

/**
 * A `role="treeitem"` row within a `<Tree>`: renders a chevron when it has
 * children, the optional `icon` and `label`, and `prefix`/`suffix` slots
 * whose clicks don't toggle expansion. Tracks expanded state controllably
 * (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`), nests its
 * `children` as a collapsible group, and inherits depth, size, and indent
 * from tree context.
 */
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

	const [open = false, setOpen] = useControllable<boolean>({
		value: controlledOpen,
		defaultValue: defaultOpen,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	const hasChildren = children != null

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
