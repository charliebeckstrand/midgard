'use client'

import type { CSSProperties, Ref } from 'react'
import { ariaAttr } from '../../core/aria-attr'
import { cn } from '../../core/cn'
import { Option, OptionDescription, OptionLabel, OptionText } from '../../primitives/option'
import { PopoverPanel } from '../../primitives/popover'
import { Portal } from '../../primitives/portal'
import { k } from '../../recipes/kata/chat-prompt'
import type { ChatPromptItem, ChatPromptSource } from './types'
import type { PickerStatus } from './use-chat-prompt-picker'

/** Props for {@link ChatPromptPicker}. @internal */
export type ChatPromptPickerProps = {
	open: boolean
	listId: string
	listRef: Ref<HTMLDivElement>
	source: ChatPromptSource | undefined
	items: readonly ChatPromptItem[]
	status: PickerStatus
	/** The status line: that the list loads, that it holds no item, or that it failed. */
	statusText: string
	floatingStyles: CSSProperties
	setFloating: (node: HTMLElement | null) => void
	getFloatingProps: () => Record<string, unknown>
	onChoose: (item: ChatPromptItem) => void
}

/**
 * The panel of the picker in `ChatPrompt`: a listbox of the items of one
 * source, and a status line. The textarea keeps the focus, so each option
 * keeps the press of the pointer off itself.
 *
 * The status line says that the list loads, that it holds no item, or that it
 * failed. A list that holds items has no status, and its options carry the
 * count to a screen reader. The line is not live. The panel mounts with each
 * open, and a screen reader does not speak the text that a new live region
 * holds. Thus `useChatPromptPicker` speaks the status through the shared
 * announcer.
 *
 * @internal
 */
export function ChatPromptPicker({
	open,
	listId,
	listRef,
	source,
	items,
	status,
	statusText,
	floatingStyles,
	setFloating,
	getFloatingProps,
	onChoose,
}: ChatPromptPickerProps) {
	const slots = k()

	return (
		<Portal open={open}>
			<div
				ref={setFloating}
				data-slot="chat-prompt-picker"
				style={floatingStyles}
				className={cn(k.portal)}
				{...getFloatingProps()}
			>
				{/* No role: the listbox inside carries the widget role. */}
				<PopoverPanel open={open} role="none" autoFocus={false} className={cn(slots.options)}>
					<div
						ref={listRef}
						role="listbox"
						id={listId}
						aria-label={source?.label}
						aria-busy={ariaAttr(status === 'loading')}
						className={cn(slots.list)}
					>
						{items.map((item, index) => (
							<Option
								key={item.key}
								activeDescendant
								// The highlight is the selection here, so the roving hook
								// writes `aria-selected` on the active option.
								selected={false}
								data-index={index}
								onSelect={() => onChoose(item)}
							>
								{item.description ? (
									<OptionText>
										<OptionLabel>{item.label}</OptionLabel>
										<OptionDescription>{item.description}</OptionDescription>
									</OptionText>
								) : (
									<OptionLabel>{item.label}</OptionLabel>
								)}
							</Option>
						))}
					</div>
					<p
						data-slot="chat-prompt-picker-status"
						className={cn(slots.status, !statusText && 'hidden')}
					>
						{statusText}
					</p>
				</PopoverPanel>
			</div>
		</Portal>
	)
}
