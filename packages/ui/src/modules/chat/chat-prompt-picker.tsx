'use client'

import { memo, type Ref, type RefObject, useLayoutEffect } from 'react'
import { ariaAttr } from '../../core/aria-attr'
import { cn } from '../../core/cn'
import { useFloatingUI } from '../../hooks/use-floating-ui'
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
	/** The element of the field. The panel sits over its control frame. */
	elementRef: RefObject<HTMLElement | null>
	/** Fires when the reader dismisses the open panel, such as with a press outside it. */
	onDismiss: () => void
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
 * The panel sits over the composer, and not over the caret. It is memoized,
 * so a key in the field renders it only when a prop changes, such as the
 * query of an open picker.
 *
 * @internal
 */
export const ChatPromptPicker = memo(function ChatPromptPicker({
	open,
	listId,
	listRef,
	source,
	items,
	status,
	statusText,
	elementRef,
	onDismiss,
	onChoose,
}: ChatPromptPickerProps) {
	const slots = k()

	const { floatingStyles, setFloating, getFloatingProps } = usePickerPlacement(
		open,
		elementRef,
		onDismiss,
	)

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
})

/**
 * The placement of the panel of the picker: over the control frame of the
 * field, and not over the caret. A press outside the open panel calls
 * `onDismiss`.
 *
 * @internal
 */
function usePickerPlacement(
	open: boolean,
	elementRef: RefObject<HTMLElement | null>,
	onDismiss: () => void,
) {
	const floating = useFloatingUI({
		open,
		onOpenChange: (next) => {
			if (!next) onDismiss()
		},
		placement: 'top-start',
		matchReferenceWidth: true,
		fitHeight: true,
		role: null,
	})

	const { setReference, setFloating } = floating.refs

	// The element of a field can come after the mount, such as the element of an
	// editor that loads, so the reference updates at each open.
	useLayoutEffect(() => {
		const element = elementRef.current

		if (!open || !element) return

		setReference(element.closest<HTMLElement>('[data-slot="control-frame"]') ?? element)
	}, [setReference, elementRef, open])

	return {
		floatingStyles: floating.floatingStyles,
		setFloating,
		getFloatingProps: floating.getFloatingProps,
	}
}
