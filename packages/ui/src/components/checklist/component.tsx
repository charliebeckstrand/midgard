'use client'

import { Check } from 'lucide-react'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { cn } from '../../core'
import { Collapse, CollapsePanel, CollapseTrigger } from '../collapse'
import { Icon } from '../icon'
import { ProgressBar } from '../progress'
import { k } from './variants'

// ── Checklist ───────────────────────────────────────────

export type ChecklistProps = {
	/** Header title. */
	title?: ReactNode
	/** Header description shown below the title. */
	description?: ReactNode
	/**
	 * Completed count. When omitted, derived from `complete` props on
	 * `<ChecklistItem>` children.
	 */
	value?: number
	/**
	 * Total count. When omitted, derived from the number of
	 * `<ChecklistItem>` children.
	 */
	max?: number
	/** When true, the item list collapses behind a trigger. */
	collapsible?: boolean
	/** Initial open state when `collapsible`. Defaults to `true` until complete. */
	defaultOpen?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	className?: string
	children?: ReactNode
}

export function Checklist({
	title,
	description,
	value,
	max,
	collapsible,
	defaultOpen,
	open,
	onOpenChange,
	className,
	children,
}: ChecklistProps) {
	const items = collectItems(children)

	const resolvedMax = max ?? items.length
	const resolvedValue = value ?? items.filter((item) => item.props.complete).length
	const complete = resolvedMax > 0 && resolvedValue >= resolvedMax

	const header = (
		<div data-slot="checklist-header" className={cn(k.header)}>
			<div className={cn(k.heading)}>
				{title && (
					<div data-slot="checklist-title" className={cn(k.title)}>
						{title}
					</div>
				)}
				{resolvedMax > 0 && (
					<div data-slot="checklist-summary" className={cn(k.summary)}>
						{resolvedValue} of {resolvedMax}
					</div>
				)}
			</div>
			{description && (
				<div data-slot="checklist-description" className={cn(k.description)}>
					{description}
				</div>
			)}
			<ProgressBar
				value={resolvedValue}
				max={Math.max(resolvedMax, 1)}
				color={complete ? 'green' : 'blue'}
				aria-label="Checklist progress"
			/>
		</div>
	)

	const list = (
		<div data-slot="checklist-list" className={cn(k.list)}>
			{children}
		</div>
	)

	return (
		<div
			data-slot="checklist"
			data-complete={complete || undefined}
			className={cn(k.base, className)}
		>
			{collapsible ? (
				<Collapse
					defaultOpen={defaultOpen ?? !complete}
					open={open}
					onOpenChange={onOpenChange}
					animate="slide"
				>
					<CollapseTrigger className="text-left">{header}</CollapseTrigger>
					<CollapsePanel>{list}</CollapsePanel>
				</Collapse>
			) : (
				<>
					{header}
					{list}
				</>
			)}
		</div>
	)
}

// ── ChecklistItem ───────────────────────────────────────

export type ChecklistItemProps = {
	complete?: boolean
	title?: ReactNode
	description?: ReactNode
	/** Trailing action slot (e.g. a Button). */
	actions?: ReactNode
	className?: string
	children?: ReactNode
}

export function ChecklistItem({
	complete,
	title,
	description,
	actions,
	className,
	children,
}: ChecklistItemProps) {
	return (
		<div
			data-slot="checklist-item"
			data-complete={complete || undefined}
			className={cn(k.item, className)}
		>
			<span data-slot="checklist-item-indicator" className={cn(k.indicator)} aria-hidden>
				<Icon icon={<Check />} size="xs" />
			</span>
			<div data-slot="checklist-item-content" className={cn(k.content)}>
				{title && (
					<div data-slot="checklist-item-title" className={cn(k.itemTitle)}>
						{title}
					</div>
				)}
				{description && (
					<div data-slot="checklist-item-description" className={cn(k.itemDescription)}>
						{description}
					</div>
				)}
				{children}
			</div>
			{actions && (
				<div data-slot="checklist-item-actions" className={cn(k.actions)}>
					{actions}
				</div>
			)}
		</div>
	)
}

// ── internals ───────────────────────────────────────────

function collectItems(children: ReactNode): ReactElement<ChecklistItemProps>[] {
	return Children.toArray(children).filter(
		(child): child is ReactElement<ChecklistItemProps> =>
			isValidElement(child) && child.type === ChecklistItem,
	)
}
