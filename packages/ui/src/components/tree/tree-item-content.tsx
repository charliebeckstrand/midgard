'use client'

import { Check, ChevronRight, Minus } from 'lucide-react'
import {
	type KeyboardEvent,
	type MouseEvent,
	type ReactElement,
	type ReactNode,
	useId,
} from 'react'
import { ariaAttr, cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/tree'
import { Icon } from '../icon'
import { useTreeContext, useTreePosition } from './context'
import { CHECK_SELECTOR } from './tree-constants'
import { branchToggleKey } from './tree-keyboard'

/**
 * Props for {@link TreeItemContent}.
 *
 * @internal
 */
type TreeItemContentProps = {
	label: ReactNode
	icon?: ReactElement
	prefix?: ReactNode
	suffix?: ReactNode
	current?: boolean
	/** The check state. `undefined` makes a row with no check box. */
	checked?: boolean | 'mixed'
	/** Runs when the user toggles the check box. */
	onToggleChecked: () => void
	hasChildren: boolean
	/** Runs when the row itself is activated, by click or by Enter/Space. */
	onAction?: () => void
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The id of the child group, which the open row owns. */
	groupId: string
	className?: string
}

/**
 * The interactive `role="treeitem"` row rendered by {@link TreeItem}: chevron,
 * optional check box, optional `icon`, `label`, and `prefix`/`suffix` slots.
 * Toggles expansion on a branch row and the check on a checkable leaf row. On a
 * checkable row, `Space` and a click on the box toggle the check. `ArrowRight`
 * opens a closed branch and `ArrowLeft` closes an open one. Reads depth and
 * ARIA position from tree context.
 *
 * @internal
 */
export function TreeItemContent({
	label,
	icon,
	prefix,
	suffix,
	current,
	checked,
	onToggleChecked,
	hasChildren,
	onAction,
	open,
	onOpenChange,
	groupId,
	className,
}: TreeItemContentProps) {
	const { depth } = useTreeContext()

	const labelId = useId()

	const { posinset, setsize } = useTreePosition()

	const checkable = checked !== undefined

	// The row was activated. A branch toggles its expansion, and a checkable leaf
	// toggles its check, so the label is the hit area of the box.
	const activate = () => {
		onAction?.()

		if (hasChildren) onOpenChange(!open)
		else if (checkable) onToggleChecked()
	}

	const handleClick = (event: MouseEvent<HTMLDivElement>) => {
		// A click on the box toggles the check only. It is not a row activation.
		if (event.target instanceof Element && event.target.closest(CHECK_SELECTOR)) {
			onToggleChecked()

			return
		}

		activate()
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.target !== event.currentTarget) return

		// On a checkable row, Space toggles the check, as on a checkbox.
		if (event.key === ' ' && checkable) {
			event.preventDefault()

			onToggleChecked()

			return
		}

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()

			activate()

			return
		}
		// A branch opens on the arrow toward its children and closes on the arrow
		// back. The tree moves focus on the other two cases.
		if (hasChildren && branchToggleKey(event, open)) {
			event.preventDefault()

			onOpenChange(!open)
		}
	}

	return (
		<div
			role="treeitem"
			aria-expanded={hasChildren ? open : undefined}
			// The group is a sibling of the row, so the row owns it. The group is in the
			// DOM while the row is open, so the reference never dangles.
			aria-owns={hasChildren && open ? groupId : undefined}
			// The label alone names the row, so the affixes and the owned group stay out.
			aria-labelledby={labelId}
			aria-current={ariaAttr(current)}
			aria-checked={checked}
			aria-level={depth + 1}
			aria-posinset={posinset}
			aria-setsize={setsize}
			tabIndex={-1}
			data-slot="tree-item-content"
			data-open={dataAttr(open)}
			className={cn(
				'group/tree-item',
				k.item.content(),
				current && k.item.content.current,
				className,
			)}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
		>
			<span className={cn(k.chevron)} aria-hidden="true">
				{hasChildren && (
					<Icon
						icon={<ChevronRight />}
						className={cn('rtl:-scale-x-100', open && 'rotate-90 rtl:-rotate-90')}
					/>
				)}
			</span>
			{checkable && (
				<span
					data-slot="tree-item-check"
					data-checked={dataAttr(checked !== false)}
					aria-hidden="true"
					className={cn(k.check.base)}
				>
					{checked === 'mixed' ? (
						<Minus className={cn(k.check.mark)} strokeWidth={2} />
					) : (
						checked && <Check className={cn(k.check.mark)} strokeWidth={2} />
					)}
				</span>
			)}
			{prefix != null && (
				<span data-slot="tree-item-prefix" className={k.affix}>
					{prefix}
				</span>
			)}
			{icon && <Icon icon={icon} />}
			<span id={labelId} className={k.label}>
				{label}
			</span>
			{suffix != null && (
				<span data-slot="tree-item-suffix" className={k.affix}>
					{suffix}
				</span>
			)}
		</div>
	)
}
