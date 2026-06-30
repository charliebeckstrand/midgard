import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/chat-list-item'

/** Props for {@link ChatListItem}. */
export type ChatListItemProps = {
	/** Conversation title; the primary line, truncated to one line. */
	title: ReactNode
	/** Secondary line under the title (e.g. the last message), truncated. */
	preview?: ReactNode
	/** Trailing label, typically a relative timestamp. */
	timestamp?: ReactNode
	/** Marks this row as the open conversation (`aria-current="true"`, persistent wash). */
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
 * The title/preview region is the selectable target — a `<button>` invoking
 * `onSelect` when provided, otherwise a static `<span>`. `actions` render beside
 * it rather than within it, so a control like a delete button never nests inside
 * the select button (nested-interactive markup). The open conversation
 * (`current`) gets `aria-current` and a persistent background wash.
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
	const body = (
		<>
			<span className={k.title}>{title}</span>
			{preview !== undefined && <span className={k.preview}>{preview}</span>}
		</>
	)

	return (
		<div
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
					className={k.select}
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
		</div>
	)
}
