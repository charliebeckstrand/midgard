'use client'

import { type KeyboardEvent, type ReactNode, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { ChatListContext } from './context'

/** Props for {@link ChatList}. */
export type ChatListProps = {
	/** Accessible name for the list (e.g. `"Conversations"`). */
	'aria-label'?: string
	/** Points at a visible heading labelling the list, in place of `aria-label`. */
	'aria-labelledby'?: string
	/** {@link ChatListItem} rows. */
	children?: ReactNode
	className?: string
	onKeyDown?: (event: KeyboardEvent<HTMLUListElement>) => void
}

/**
 * Roving-tabindex container for a column of {@link ChatListItem} rows.
 *
 * @remarks
 * The list is a single Tab stop resting on the current conversation
 * (`aria-current="true"`, else the first item). While an item holds focus,
 * Up/Down arrows rove between items, and Left/Right rove into that row's action
 * controls and back — the actions stay out of the Tab order, so Tab always
 * re-enters on an item. Establishes the {@link useInChatList} context so nested
 * items take `role="listitem"`, and an `ActiveIndicatorScope` so the current
 * row's indicator morphs between siblings rather than against indicators
 * outside the list.
 */
export function ChatList({
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
	children,
	className,
	onKeyDown,
}: ChatListProps) {
	const ref = useRef<HTMLUListElement>(null)

	const handleKeyDown = useA11yRoving(ref, {
		// Only the focusable select controls are roving stops; a read-only item's
		// static `<span>` select is skipped.
		itemSelector: '[data-slot="chat-list-item-select"]:is(button,a[href]):not(:disabled)',
		manageTabIndex: true,
		activeSelector: '[aria-current="true"]',
		row: {
			rowSelector: '[data-slot="chat-list-item"]',
			actionSelector: '[data-slot="chat-list-item-actions"] :is(button,a[href]):not(:disabled)',
		},
	})

	return (
		<ActiveIndicatorScope>
			<ChatListContext value={true}>
				<ul
					ref={ref}
					data-slot="chat-list"
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledBy}
					className={cn('flex flex-col gap-0.5', className)}
					onKeyDown={(event) => {
						handleKeyDown(event)
						onKeyDown?.(event)
					}}
				>
					{children}
				</ul>
			</ChatListContext>
		</ActiveIndicatorScope>
	)
}
