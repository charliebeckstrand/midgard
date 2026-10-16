'use client'

import { type ComponentProps, useRef } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { useA11yRoving } from '../../hooks'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { ChatListContext } from './context'

/**
 * Props for {@link ChatList}. The `<ul>` takes the rest. Name the list with
 * `aria-label` (for example `"Conversations"`) or `aria-labelledby`. Put
 * {@link ChatListItem} rows in `children`.
 */
export type ChatListProps = ComponentProps<'ul'>

/**
 * Roving-tabindex container for a column of {@link ChatListItem} rows.
 *
 * @remarks
 * The list is a single Tab stop resting on the current conversation
 * (`aria-current="true"`, else the first item). While an item holds focus,
 * Up/Down arrows rove between items, and Left/Right rove into that row's action
 * controls and back. The actions stay out of the Tab order, so Tab always
 * re-enters on an item. Establishes the list context, so nested
 * items take `role="listitem"`. It also establishes an `ActiveIndicatorScope`,
 * so the current row's indicator morphs between siblings rather than against
 * indicators outside the list.
 */
export function ChatList({ className, onKeyDown, ref: consumerRef, ...props }: ChatListProps) {
	const ref = useRef<HTMLUListElement>(null)

	// The roving model reads `ref`, so a consumer `ref` joins it.
	const setRef = useComposedRef(ref, consumerRef)

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
					data-slot="chat-list"
					{...props}
					ref={setRef}
					className={cn('flex flex-col gap-0.5', className)}
					onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown, {
						checkForDefaultPrevented: false,
					})}
				/>
			</ChatListContext>
		</ActiveIndicatorScope>
	)
}
