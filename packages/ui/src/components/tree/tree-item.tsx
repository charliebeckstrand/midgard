'use client'

import { Children, type ReactElement, type ReactNode, useId } from 'react'
import { useControllable, useControllableFlag } from '../../hooks/use-controllable'
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
	/**
	 * Controlled expanded state. When provided, the item operates in controlled mode.
	 *
	 * @defaultValue Uncontrolled: the state starts from `defaultOpen`.
	 */
	open?: boolean
	/** Called when the user toggles the item. Fires in both controlled and uncontrolled modes. */
	onOpenChange?: (open: boolean) => void
	/**
	 * Fires when the row is activated, by a click or by Enter. Space also
	 * activates a row that is not checkable.
	 *
	 * A branch row toggles, which `onOpenChange` already reports. A checkable
	 * leaf row toggles its check, which `onCheckedChange` reports. Another leaf
	 * row does nothing a caller can see, so this is how a caller selects a leaf.
	 * It fires for each kind of row, because the fact reported is the activation
	 * rather than what follows it. A click on the check box and Space on a
	 * checkable row toggle the check only, so neither fires. ArrowRight and
	 * ArrowLeft open, close, or move focus, so neither fires.
	 */
	onAction?: () => void
	/**
	 * Marks the row as the current item, such as the page that a navigation tree
	 * shows. The row gets `aria-current="true"`.
	 *
	 * @remarks
	 * `current` is not a selection. The tree has no selection model, so the row
	 * gets no `aria-selected`. With `aria-selected` on one row, AT reads
	 * "not selected" on each other row.
	 * @defaultValue false
	 */
	current?: boolean
	/**
	 * The controlled check state. A value makes the row a checkable item: the row
	 * gets `aria-checked` and draws a check box before the icon.
	 *
	 * @remarks
	 * The row is the checkbox, as in the ARIA checkbox tree. Do not put a
	 * Checkbox in `prefix`. Use `'mixed'` for a branch with only some children
	 * checked. The tree does not compute it, because the caller holds the state
	 * of each item.
	 *
	 * @defaultValue Uncontrolled: the state starts from `defaultChecked`.
	 */
	checked?: boolean | 'mixed'
	/**
	 * The initial check state (uncontrolled). A value makes the row a checkable item. Ignored when `checked` is provided.
	 *
	 * @defaultValue No check state: the row is not a checkable item.
	 */
	defaultChecked?: boolean | 'mixed'
	/**
	 * Called when the user toggles the check, by Space, by a click on the box, or
	 * by an activation of a leaf row. A `'mixed'` row toggles to `true`. Fires in
	 * both controlled and uncontrolled modes.
	 */
	onCheckedChange?: (checked: boolean) => void
	/**
	 * Slot before the icon, for content such as a status dot. It must hold no
	 * interactive control: a treeitem is one control, so a nested control is a
	 * second Tab stop that AT reads as part of the row. A click here activates
	 * the row.
	 */
	prefix?: ReactNode
	/**
	 * Slot after the label, for content such as a count or a badge. It must hold
	 * no interactive control, as `prefix`. A click here activates the row.
	 */
	suffix?: ReactNode
	/** Nested tree items. */
	children?: ReactNode
	className?: string
}

/**
 * A `role="treeitem"` row within a `<Tree>`. It renders a chevron when it has
 * children, an optional check box, the optional `icon` and `label`, and
 * decorative `prefix`/`suffix` slots. Tracks expanded state controllably
 * (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`), nests its
 * `children` as a collapsible group, and inherits depth and indent from tree
 * context. Its row takes the step of the nearest density scope.
 *
 * @remarks
 * Client component. Reflects expansion as `aria-expanded` and nesting as
 * `aria-level`/`aria-posinset`/`aria-setsize`. The child group is a sibling of
 * the row in the DOM, so the open row owns it through `aria-owns`. The row takes
 * its name from its `label` alone through `aria-labelledby`, so the text of an
 * affix or of the owned group does not join the name. With `checked` or
 * `defaultChecked`, the row is a checkable item and reflects the state as
 * `aria-checked`. Keyboard: Enter toggles a branch (or the check of a checkable
 * leaf), Space toggles the check of a checkable row and acts as Enter on
 * another row, ArrowRight expands a collapsed branch, ArrowLeft collapses an
 * open one. Focus moves between items on {@link Tree}: ArrowRight on an open
 * branch to its first child, ArrowLeft on a closed branch or a leaf to its parent.
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
	checked: controlledChecked,
	defaultChecked,
	onCheckedChange,
	prefix,
	suffix,
	children,
	className,
}: TreeItemProps) {
	const [open, setOpen] = useControllableFlag({
		value: controlledOpen,
		defaultValue: defaultOpen,
		onValueChange: onOpenChange,
	})

	const [checked, setChecked] = useControllable<boolean | 'mixed'>({
		value: controlledChecked,
		defaultValue: defaultChecked,
		onValueChange: (next) => onCheckedChange?.(next === true),
	})

	// A `'mixed'` row toggles to `true`, as a tri-state checkbox does.
	const toggleChecked = () => setChecked((prev) => prev !== true)

	// `Children.toArray` drops `null`/`undefined`/`false` and empty arrays, so a
	// falsy or empty `children` reads as a leaf — no chevron, `aria-expanded`
	// stays off. A bare `!= null` check would announce `children={[]}` as a
	// collapsed parent.
	const hasChildren = Children.toArray(children).length > 0

	// The row owns the group by this id, which keeps two trees apart.
	const groupId = useId()

	return (
		<div data-slot="tree-item">
			<TreeItemContent
				label={label}
				icon={icon}
				prefix={prefix}
				suffix={suffix}
				current={current}
				checked={checked}
				onToggleChecked={toggleChecked}
				hasChildren={hasChildren}
				onAction={onAction}
				open={open}
				onOpenChange={setOpen}
				groupId={groupId}
				className={className}
			/>
			{hasChildren && (
				<TreeItemChildren id={groupId} open={open} label={label}>
					{children}
				</TreeItemChildren>
			)}
		</div>
	)
}
