'use client'

import { useEffect } from 'react'
import { ChatComposer } from './composer'
import { ChatContent } from './message'
import type { ClientChatMessage } from './types'
import { useScrollToBottom } from './use-scroll-to-bottom'

interface ChatLayoutProps {
	messages: ClientChatMessage[]
	sending?: boolean
	isDraft?: boolean
	onSend: (message: string) => void
}

export function ChatLayout({ messages, sending, isDraft, onSend }: ChatLayoutProps) {
	const { ref: messagesEndRef, scrollToBottom } = useScrollToBottom()

	useEffect(() => {
		if (messages.length > 0) {
			scrollToBottom()
		}
	}, [messages, scrollToBottom])

	return (
		<div className="flex h-full justify-center">
			<div className="flex flex-col h-full max-w-4xl flex-1 justify-center">
				{!isDraft && (
					<div className="flex-1 grow overflow-y-auto p-4">
						{messages.length > 0 && (
							<div className="mx-auto space-y-4">
								{messages.map((message) => (
									<ChatContent key={message.id} role={message.role} content={message.content} />
								))}
								<div ref={messagesEndRef} />
							</div>
						)}
					</div>
				)}

				<ChatComposer onSend={onSend} disabled={sending} />
			</div>
		</div>
	)
}
