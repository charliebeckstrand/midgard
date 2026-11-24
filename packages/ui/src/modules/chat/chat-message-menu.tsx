'use client'

import { type ReactNode, useMemo } from 'react'
import { Button } from '../../components/button'
import { ContextMenu, ContextMenuList } from '../../components/context-menu'
import { resolveContextMenuEntries } from '../../components/context-menu/context-menu-merge'
import type { ContextMenuConfig, ContextMenuEntry } from '../../components/context-menu/types'
import { Icon } from '../../components/icon'
import { Menu, MenuContent, MenuTrigger } from '../../components/menu'
import { Copy, EllipsisVertical } from '../../primitives/icons/icons'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { copyText } from '../../utilities/export-output'
import { chatContentText } from './engine/chat-content/text'
import type { ChatPart } from './engine/chat-content/types'

/** @internal */
const messages = defineMessages({
	menu: {
		id: 'ui.chat.messageActions',
		defaultMessage: 'Message actions',
		description:
			'The name of the menu of a chat message, and of the button that opens it. A right-click or a long press on the message also opens the menu. It holds the actions of that message.',
	},
	copy: {
		id: 'ui.chat.copy',
		defaultMessage: 'Copy',
		description:
			'The item of the menu of a chat message that copies the text of the message to the clipboard.',
	},
})

/** Props for {@link ChatMessageMenu} and {@link ChatMessageMenuButton}. @internal */
type ChatMessageMenuProps = {
	/** The configuration of the caller. `undefined` shows the default items alone. */
	config: ContextMenuConfig | undefined
	/** The content of the message, which the Copy item copies. */
	content: string | ChatPart[]
}

/**
 * The entries of the menu of a chat message: the default Copy item, merged
 * with the configuration of the caller. The menu over the bubble and the menu
 * button read the same entries.
 *
 * @internal
 */
function useMenuEntries({ config, content }: ChatMessageMenuProps): {
	entries: ContextMenuEntry[]
	name: string
} {
	const intl = useIntl()

	const copy = intl.formatMessage(messages.copy)

	const name = intl.formatMessage(messages.menu)

	const items = config?.items

	const defaultItems = config?.defaultItems

	const insert = config?.insert

	const entries = useMemo(() => {
		// The plain-text projection that the announcer and `retry` also read. A
		// message with no text yet, such as a reply that waits, has nothing to copy.
		const text = chatContentText(content)

		const defaults: ContextMenuEntry[] = [
			{
				key: 'copy',
				label: copy,
				icon: <Copy />,
				disabled: text === '',
				onAction: () => copyText(text),
			},
		]

		return resolveContextMenuEntries({ items, defaultItems, insert }, defaults)
	}, [content, copy, items, defaultItems, insert])

	return { entries, name }
}

/**
 * The context menu of a chat message, over its bubble. A right-click, a touch
 * long press, or the context-menu key opens it.
 *
 * @internal
 */
export function ChatMessageMenu({
	config,
	content,
	children,
}: ChatMessageMenuProps & { children: ReactNode }) {
	const { entries, name } = useMenuEntries({ config, content })

	return (
		<ContextMenu items={entries} capped={config?.capped} aria-label={name}>
			{children}
		</ContextMenu>
	)
}

/**
 * The button that opens the menu of a chat message as a dropdown. It holds the
 * same entries as the context menu, so a reader with a keyboard and a reader
 * who does not know the right-click get to each action.
 *
 * @internal
 */
export function ChatMessageMenuButton({ config, content }: ChatMessageMenuProps) {
	const { entries, name } = useMenuEntries({ config, content })

	return (
		<Menu placement="bottom-end" capped={config?.capped}>
			<MenuTrigger>
				<Button type="button" variant="bare" size="sm" aria-label={name}>
					<Icon icon={<EllipsisVertical />} />
				</Button>
			</MenuTrigger>

			<MenuContent>
				<ContextMenuList entries={entries} />
			</MenuContent>
		</Menu>
	)
}
