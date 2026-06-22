'use client'

import { ChatComposer } from './composer'
import { ChatMessages } from './messages'
import type { ChatContent } from './types'

type ChatLayoutProps = {
	messages: ChatContent[]
	/** Whether a reply is streaming; disables the composer and shimmers the latest bubble. */
	sending?: boolean
	/** Draft (no messages yet) mode; centers the composer and hides the transcript. */
	isDraft?: boolean
	onSend: (message: string) => void
}

/**
 * Chat surface: the message transcript above an input composer.
 *
 * @remarks
 * In draft mode (or with no messages) the transcript is hidden and the composer
 * is centered. Pairs {@link ChatMessages} with {@link ChatComposer}.
 */
export function ChatLayout({ messages, sending, isDraft, onSend }: ChatLayoutProps) {
	return (
		<div className="flex flex-col gap-6 h-full justify-center">
			{!isDraft && messages.length > 0 && <ChatMessages messages={messages} streaming={sending} />}

			<div className={`w-full ${isDraft ? 'lg:max-w-md mx-auto' : ''}`}>
				<ChatComposer onSend={onSend} disabled={sending} />
			</div>
		</div>
	)
}
