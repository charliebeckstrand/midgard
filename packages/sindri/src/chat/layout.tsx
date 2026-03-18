'use client'

import { ChatComposer } from './composer'
import { ChatMessages } from './messages'
import type { ChatContent } from './types'

interface ChatLayoutProps {
	messages: ChatContent[]
	sending?: boolean
	isDraft?: boolean
	onSend: (message: string) => void
}

export function ChatLayout({ messages, sending, isDraft, onSend }: ChatLayoutProps) {
	return (
		<div className="flex flex-col gap-6 h-full justify-center">
			{!isDraft && <>{messages.length > 0 && <ChatMessages messages={messages} />}</>}

			<ChatComposer
				className={`w-full ${isDraft ? 'lg:w-lg mx-auto' : ''}`}
				onSend={onSend}
				disabled={sending}
			/>
		</div>
	)
}
