'use client'

import type { ReactNode } from 'react'
import { ContextMenu } from '../../components/context-menu'
import type { ContextMenuEntry } from '../../components/context-menu/types'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'

/** @internal */
const messages = defineMessages({
	menu: {
		id: 'ui.chat.messageActions',
		defaultMessage: 'Message actions',
		description:
			'The name of the menu that opens on a right-click or a long press on a chat message. It holds the actions of that message.',
	},
})

/**
 * The context menu of a chat message, over its bubble. It is its own client
 * module, so that a message with no menu reads no context and renders on the
 * server.
 *
 * @internal
 */
export function ChatMessageMenu({
	entries,
	children,
}: {
	entries: ContextMenuEntry[]
	children: ReactNode
}) {
	const intl = useIntl()

	return (
		<ContextMenu items={entries} aria-label={intl.formatMessage(messages.menu)}>
			{children}
		</ContextMenu>
	)
}
