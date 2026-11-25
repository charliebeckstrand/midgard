'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/chat-message'
import { Stack } from '../../structure/stack'
import { ChatMessageContent } from './chat-message-content'
import { ChatPanel, ChatPanelBody } from './chat-panel'
import { ChatActionContext } from './context'
import type { ChatPart } from './engine/chat-content/types'

/** @internal */
const messages = defineMessages<{
	revised: Record<never, never>
	open: Record<never, never>
	title: Record<never, never>
	version: { index: number }
}>({
	revised: {
		id: 'ui.chat.revised',
		defaultMessage: '(revised)',
		description:
			'The quiet button below a chat message that the assistant revised after it sent the message. It opens the earlier versions.',
	},
	open: {
		id: 'ui.chat.revisedOpen',
		defaultMessage: 'Revised, show earlier versions',
		description:
			'The name of the "(revised)" button below a chat message that the assistant revised, for a screen reader. It starts with the visible text of the button.',
	},
	title: {
		id: 'ui.chat.revisionsTitle',
		defaultMessage: 'Earlier versions',
		description:
			'The title of the panel that shows the earlier versions of a revised chat message.',
	},
	version: {
		id: 'ui.chat.revision',
		defaultMessage: 'Version {index, number}',
		description:
			'The heading of one earlier version of a revised chat message, such as "Version 1". The index counts from 1, and version 1 is the first that the assistant sent.',
	},
})

/**
 * The "(revised)" button of a message that its sender revised, and the panel
 * that it opens: each earlier version, oldest first. It is its own client
 * module, so that a message with no versions reads no context and renders on
 * the server.
 *
 * @remarks
 * A version draws through {@link ChatMessageContent}, as the bubble drew it.
 * The panel provides no answer to an action, so each action in a version draws
 * read-only, and no control in it acts. An ask is answered once, and the
 * bubble holds the ask as it stands now.
 *
 * @internal
 */
export function ChatMessageHistory({
	versions,
	className,
}: {
	versions: readonly (string | ChatPart[])[]
	className: string
}) {
	const intl = useIntl()

	// Null until the first open, so a message that nobody reviews pays for no panel.
	const [open, setOpen] = useState<boolean | null>(null)

	const slots = k()

	return (
		<>
			<Button
				type="button"
				variant="bare"
				size="sm"
				color="inherit"
				// The history writes no field, so a locked scope leaves it live.
				lockable={false}
				data-slot="chat-message-revised"
				aria-label={intl.formatMessage(messages.open)}
				className={className}
				onClick={() => setOpen(true)}
			>
				{intl.formatMessage(messages.revised)}
			</Button>
			{open !== null && (
				<ChatPanel open={open} onOpenChange={setOpen} title={intl.formatMessage(messages.title)}>
					<ChatPanelBody>
						<ChatActionContext value={undefined}>
							<Stack gap="lg">
								{versions
									.map((content, index) => ({ content, number: index + 1 }))
									.map(
										// The number of a version names it: version 1 stays version 1 as
										// the list grows at its end.
										({ content, number }) => (
											<section key={number} data-slot="chat-message-version">
												<h3 className={slots.versionHeading}>
													{intl.formatMessage(messages.version, { index: number })}
												</h3>
												<div className={slots.version}>
													<ChatMessageContent content={content} partClassName={slots.part} />
												</div>
											</section>
										),
									)}
							</Stack>
						</ChatActionContext>
					</ChatPanelBody>
				</ChatPanel>
			)}
		</>
	)
}
