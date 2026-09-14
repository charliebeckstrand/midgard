'use client'

import { Children, type ReactElement, type ReactNode } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { TreeItemChildren } from './tree-item-children'
import { TreeItemContent } from './tree-item-content'

/** Props for {@link TreeItem}. */
export type TreeItemProps = {
	/** The item label. */
	label: ReactNode
	/** Icon before the label. */
	icon?: ReactElement
	/** Initially expanded (uncontrolled). Ignored when `open` is provided. @defaultValue false */
	defaultOpen?: boolean
	/** Controlled expanded state. When provided, the item operates in controlled mode. */
	open?: boolean
	/** Called when the user toggles the item. Fires in both controlled and uncontrolled modes. */
	onOpenChange?: (open: boolean) => void
	/**
	 * Fires when the row is activated, by a click or by Enter/Space.
	 *
	 * A branch row toggles, which `onOpenChange` already reports; a leaf row
	 * forwards the activation to the first interactive control in `prefix` and
	 * otherwise does nothing a caller can see. Without this, selecting a leaf
	 * meant planting a control in `prefix` to catch the synthesized click. It
	 * fires for both kinds of row, because the fact reported is the activation
	 * rather than what follows it. A click inside `prefix` or `suffix` is that
	 * slot's own and never reaches here. ArrowRight and ArrowLeft move the
	 * expansion, not the row, so neither fires.
	 */
	onAction?: () => void
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
 *
 * @remarks
 * Client component. Reflects expansion as `aria-expanded` and nesting as
 * `aria-level`/`aria-posinset`/`aria-setsize`. Keyboard: Enter/Space toggle (or
 * activate a leaf's prefix control), ArrowRight expands a collapsed branch,
 * ArrowLeft collapses an open one; cross-item roving lives on {@link Tree}.
 *
 * @see {@link Tree}
 */
export function TreeItem({
	label,
	icon,
	defaultOpen = false,
	open: controlledOpen,
	onOpenChange,
	onAction,
	current,
	prefix,
	suffix,
	children,
	className,
}: TreeItemProps) {
	const [open = false, setOpen] = useControllable<boolean>({
		value: controlledOpen,
		defaultValue: defaultOpen,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	// `Children.toArray` drops `null`/`undefined`/`false` and empty arrays, so a
	// falsy or empty `children` reads as a leaf — no chevron, `aria-expanded`
	// stays off. A bare `!= null` check would announce `children={[]}` as a
	// collapsed parent.
	const hasChildren = Children.toArray(children).length > 0

	return (
		<div data-slot="tree-item">
			<TreeItemContent
				label={label}
				icon={icon}
				prefix={prefix}
				suffix={suffix}
				current={current}
				hasChildren={hasChildren}
				onAction={onAction}
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
