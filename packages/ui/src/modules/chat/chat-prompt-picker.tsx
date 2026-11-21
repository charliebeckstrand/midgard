'use client'

import type { CSSProperties, Ref } from 'react'
import { ariaAttr } from '../../core/aria-attr'
import { cn } from '../../core/cn'
import { defineMessages, intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { Option, OptionDescription, OptionLabel, OptionText } from '../../primitives/option'
import { PopoverPanel } from '../../primitives/popover'
import { Portal } from '../../primitives/portal'
import { k } from '../../recipes/kata/chat-prompt'
import type { ChatPromptItem, ChatPromptSource } from './types'
import type { PickerStatus } from './use-chat-prompt-picker'

const messages = defineMessages({
	loading: {
		id: 'ui.chat.pickerLoading',
		defaultMessage: 'Loading',
		description: 'The status of the picker of the chat composer while it loads its choices.',
	},
	failed: {
		id: 'ui.chat.pickerFailed',
		defaultMessage: 'Could not load the choices',
		description: 'The status of the picker of the chat composer when its choices failed to load.',
	},
})

/** Props for {@link ChatPromptPicker}. @internal */
export type ChatPromptPickerProps = {
	open: boolean
	listId: string
	listRef: Ref<HTMLDivElement>
	source: ChatPromptSource | undefined
	items: readonly ChatPromptItem[]
	status: PickerStatus
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
 * The status line is a live `<output>`. It says that the list loads, that it
 * holds no item, or that it failed. A list that holds items has no status, and
 * its options carry the count to a screen reader.
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
	floatingStyles,
	setFloating,
	getFloatingProps,
	onChoose,
}: ChatPromptPickerProps) {
	const intl = useIntl()

	const slots = k()

	const statusText =
		status === 'failed'
			? intl.formatMessage(messages.failed)
			: items.length > 0
				? ''
				: status === 'loading'
					? intl.formatMessage(messages.loading)
					: intl.formatMessage(intlMessages.noResults)

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
					<output
						data-slot="chat-prompt-picker-status"
						className={cn(slots.status, !statusText && 'hidden')}
					>
						{statusText}
					</output>
				</PopoverPanel>
			</div>
		</Portal>
	)
}
