import type { ReactNode } from 'react'
import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/chat-list-item'
import { useInChatList } from './context'

/** Props for {@link ChatListItem}. */
export type ChatListItemProps = {
	/** Conversation title; the primary line, truncated to one line. */
	title: ReactNode
	/** Secondary line under the title (e.g. the last message), truncated. */
	preview?: ReactNode
	/** Trailing label, typically a relative timestamp. */
	timestamp?: ReactNode
	/** Marks this row as the open conversation (`aria-current="true"`, morphing indicator). */
	current?: boolean
	/** Selects this conversation. When set, the title/preview region is a button. */
	onSelect?: () => void
	/** Trailing controls (e.g. a delete button), kept as a sibling of the select button so it never nests interactives. */
	actions?: ReactNode
	className?: string
}

/**
 * A single conversation row for a chat list or sidebar: a `title` over an
 * optional `preview`, with an optional `timestamp` and trailing `actions`.
 *
 * @remarks
 * The title/preview region is a `<button>` invoking `onSelect` when provided,
 * otherwise a static `<span>`. The button's hit area stretches across the whole
 * row via a pointer-capturing `::after`, so clicking the surrounding chrome (row
 * padding, the gap, the timestamp) also selects. `actions` render beside it rather
 * than within it — so a control like a delete button never nests inside the select
 * button (nested-interactive markup) — and sit above the overlay to stay clickable.
 * The open conversation (`current`) gets `aria-current` and an {@link ActiveIndicator}
 * that morphs between rows as selection moves, mirroring `SidebarItem`; it resolves
 * its `layoutId` from the nearest `ActiveIndicatorScope` — {@link ChatList} opens one,
 * so its rows morph against each other rather than any indicator outside the list.
 * Inside a {@link ChatList} the row is an `<li>` and joins the list's roving-tabindex
 * keyboard model; standalone it is a `<div>`.
 */
export function ChatListItem({
	title,
	preview,
	timestamp,
	current,
	onSelect,
	actions,
	className,
}: ChatListItemProps) {
	// Inside a ChatList the row is a list item; standalone it is a plain row.
	const inList = useInChatList()

	const Wrapper = inList ? 'li' : 'div'

	const body = (
		<>
			<span className={k.title}>{title}</span>
			{preview !== undefined && <span className={k.preview}>{preview}</span>}
		</>
	)

	return (
		<Wrapper
			data-slot="chat-list-item"
			data-current={current ? '' : undefined}
			className={cn(k(), className)}
		>
			{onSelect ? (
				<button
					type="button"
					data-slot="chat-list-item-select"
					aria-current={current ? 'true' : undefined}
					onClick={onSelect}
					className={cn(k.select, k.overlay)}
				>
					{body}
				</button>
			) : (
				<span data-slot="chat-list-item-select" className={k.select}>
					{body}
				</span>
			)}

			{timestamp !== undefined && (
				<span data-slot="chat-list-item-timestamp" className={k.timestamp}>
					{timestamp}
				</span>
			)}

			{actions !== undefined && (
				<div data-slot="chat-list-item-actions" className={k.actions}>
					{actions}
				</div>
			)}

			{current && <ActiveIndicator className={k.indicator} />}
		</Wrapper>
	)
}
