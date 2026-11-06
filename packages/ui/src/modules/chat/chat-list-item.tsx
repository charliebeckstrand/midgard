'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { ariaAttr } from '../../core/aria-attr'
import { cn } from '../../core/cn'
import { dataAttr } from '../../core/data-attr'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/chat-list-item'
import { useInChatList } from './context'

/**
 * Props for {@link ChatListItem}. The row takes the rest: an `<li>` in a
 * {@link ChatList}, or else a `<div>`. `title` is the content of the row, and
 * `onSelect` selects the conversation.
 */
export type ChatListItemProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'onSelect'> & {
	/** Conversation title; the primary line, truncated to one line. */
	title: ReactNode
	/** Secondary line under the title (e.g. the last message), truncated. */
	preview?: ReactNode
	/**
	 * Marks this row as the open conversation (`aria-current="true"`, morphing indicator).
	 * @defaultValue false
	 */
	current?: boolean
	/**
	 * Fires when the user selects this conversation. When set, the title/preview
	 * region is a button.
	 */
	onSelect?: () => void
	/**
	 * Trailing controls, such as a delete button. They are a sibling of the
	 * select button, so no control nests inside another.
	 */
	actions?: ReactNode
}

/**
 * A single conversation row for a chat list or sidebar: a `title` over an
 * optional `preview`, and trailing `actions`.
 *
 * @remarks
 * The title and preview region is a `<button>` that calls `onSelect` when it is
 * provided, otherwise a static `<span>`. Either one carries `aria-current`. The
 * hit area of the button stretches across the whole row through a
 * pointer-capturing `::after`. A click on the padding or the gap of the row
 * thus also selects. `actions` render beside the button, not in it, and sit above
 * the overlay to stay clickable. A control such as a delete button therefore
 * never nests inside the select button (nested-interactive markup).
 *
 * The open conversation (`current`) gets `aria-current` and an
 * {@link ActiveIndicator} that morphs between rows as the selection moves, as
 * `SidebarItem` does. The indicator resolves its `layoutId` from the nearest
 * `ActiveIndicatorScope`. {@link ChatList} opens one, so its rows morph against
 * each other and not against an indicator outside the list.
 *
 * Inside a {@link ChatList}, the row is an `<li>` and joins the roving-tabindex
 * keyboard model of the list. Standalone, it is a `<div>`.
 *
 * `actions` render in a slot scope, one step below the nearest density scope:
 * `sm` at `md`. A passed-in `Button` therefore needs no explicit `size` to
 * match.
 */
export function ChatListItem({
	title,
	preview,
	current,
	onSelect,
	actions,
	className,
	...props
}: ChatListItemProps) {
	// Inside a ChatList the row is a list item; standalone it is a plain row.
	const inList = useInChatList()

	const Wrapper = inList ? 'li' : 'div'

	const slots = k({ overlay: onSelect !== undefined })

	const body = (
		<>
			<span className={slots.title}>{title}</span>
			{preview !== undefined && <span className={slots.preview}>{preview}</span>}
		</>
	)

	return (
		<Wrapper
			{...props}
			// The keyboard navigation of ChatList selects the anchor, so it comes after the spread.
			data-slot="chat-list-item"
			data-current={dataAttr(current)}
			className={cn(slots.base, className)}
		>
			{onSelect ? (
				<button
					type="button"
					data-slot="chat-list-item-select"
					aria-current={ariaAttr(current)}
					onClick={onSelect}
					className={slots.select}
				>
					{body}
				</button>
			) : (
				<span
					data-slot="chat-list-item-select"
					aria-current={ariaAttr(current)}
					className={slots.select}
				>
					{body}
				</span>
			)}

			{actions !== undefined && (
				<div data-slot="chat-list-item-actions" data-density="slot" className={slots.actions}>
					{actions}
				</div>
			)}

			{current && <ActiveIndicator className={slots.indicator} />}
		</Wrapper>
	)
}
