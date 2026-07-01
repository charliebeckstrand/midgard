'use client'

import { Trash } from 'lucide-react'
import { isValidElement, type ReactNode } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { AffixContext, affixStepDown } from '../../primitives/affix'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/chat-list-item'
import { useInChatList } from './context'

/** Props for {@link ChatListItem}. */
export type ChatListItemProps = {
	/** Conversation title; the primary line, truncated to one line. */
	title: ReactNode
	/** Secondary line under the title (e.g. the last message), truncated. */
	preview?: ReactNode
	/**
	 * Relative timestamp rendered as a {@link Badge} under the preview. Pass the
	 * value directly to show it, or `{ value, show: false }` to keep it hidden.
	 */
	timestamp?: ReactNode | { value: ReactNode; show?: boolean }
	/** Marks this row as the open conversation (`aria-current="true"`, morphing indicator). */
	current?: boolean
	/** Selects this conversation. When set, the title/preview region is a button. */
	onSelect?: () => void
	/** Trailing controls (e.g. a delete button), kept as a sibling of the select button so it never nests interactives. */
	actions?: ReactNode
	/** Shows a trailing remove button after `actions`. Call `onRemove` to wire it up. */
	remove?: boolean
	/** Called when the remove button is activated. */
	onRemove?: () => void
	className?: string
}

/**
 * Normalizes `timestamp` into `{ value, show }`, treating a bare value as
 * shown — `show` only ever opts out.
 *
 * @internal
 */
function normalizeTimestamp(timestamp: ChatListItemProps['timestamp']): {
	value: ReactNode
	show: boolean
} {
	if (
		typeof timestamp === 'object' &&
		timestamp !== null &&
		!isValidElement(timestamp) &&
		'value' in timestamp
	) {
		return { value: timestamp.value, show: timestamp.show ?? true }
	}

	return { value: timestamp, show: timestamp !== undefined }
}

/**
 * A single conversation row for a chat list or sidebar: a `title` over an
 * optional `preview`, with an optional `timestamp` beneath the preview and
 * trailing `actions`.
 *
 * @remarks
 * The title/preview/timestamp region is a `<button>` invoking `onSelect` when
 * provided, otherwise a static `<span>`. The button's hit area stretches across
 * the whole row via a pointer-capturing `::after`, so clicking the surrounding
 * chrome (row padding, the gap) also selects. `actions` render beside it rather
 * than within it — so a control like a delete button never nests inside the select
 * button (nested-interactive markup) — and sit above the overlay to stay clickable.
 * The open conversation (`current`) gets `aria-current` and an {@link ActiveIndicator}
 * that morphs between rows as selection moves, mirroring `SidebarItem`; it resolves
 * its `layoutId` from the nearest `ActiveIndicatorScope` — {@link ChatList} opens one,
 * so its rows morph against each other rather than any indicator outside the list.
 * Inside a {@link ChatList} the row is an `<li>` and joins the list's roving-tabindex
 * keyboard model; standalone it is a `<div>`.
 * `actions` and the `remove` button (rendered last, to its right) share a
 * stepped-down size — `sm` at the ambient `md` Density — broadcast through an
 * `Affix`, so a passed-in `Button` needs no explicit `size` to match.
 */
export function ChatListItem({
	title,
	preview,
	timestamp,
	current,
	onSelect,
	actions,
	remove,
	onRemove,
	className,
}: ChatListItemProps) {
	// Inside a ChatList the row is a list item; standalone it is a plain row.
	const inList = useInChatList()

	const Wrapper = inList ? 'li' : 'div'

	const density = useDensity()

	const { value: timestampValue, show: showTimestamp } = normalizeTimestamp(timestamp)

	const body = (
		<>
			<span className={k.title}>{title}</span>
			{preview !== undefined && <span className={k.preview}>{preview}</span>}
			{showTimestamp && timestampValue !== undefined && (
				<Badge data-slot="chat-list-item-timestamp" size="xs" className={k.timestamp}>
					{timestampValue}
				</Badge>
			)}
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

			{(actions !== undefined || remove) && (
				<div data-slot="chat-list-item-actions" className={k.actions}>
					<AffixContext value={affixStepDown(density.size)}>
						{actions}
						{remove && (
							<Button aria-label="Remove" variant="bare" color="red" onClick={onRemove}>
								<Icon icon={<Trash />} />
							</Button>
						)}
					</AffixContext>
				</div>
			)}

			{current && <ActiveIndicator className={k.indicator} />}
		</Wrapper>
	)
}
