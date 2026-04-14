import type React from 'react'
import { Flex } from '../components/flex'
import { Spacer } from '../components/spacer'
import { Stack } from '../components/stack'
import { cn } from '../core'
import { ChatLayout, ChatLayoutBody, ChatLayoutFooter, ChatLayoutHeader } from '../layouts/chat'

export type ChatPageProps = {
	sidebar: React.ReactNode
	navbar?: React.ReactNode
	title?: React.ReactNode
	messages: React.ReactNode
	prompt: React.ReactNode
	bodyRef?: React.Ref<HTMLDivElement>
}

export function ChatPage({ sidebar, navbar, title, messages, prompt, bodyRef }: ChatPageProps) {
	return (
		<ChatLayout sidebar={sidebar} navbar={navbar}>
			{title && <ChatLayoutHeader>{title}</ChatLayoutHeader>}

			<ChatLayoutBody ref={bodyRef}>
				<Flex direction="col" gap={4} width="full" flex>
					{messages}
				</Flex>
			</ChatLayoutBody>

			<ChatLayoutFooter>{prompt}</ChatLayoutFooter>
		</ChatLayout>
	)
}

export type ChatMessageProps = {
	role: 'user' | 'agent'
	className?: string
	children: React.ReactNode
}

export function ChatMessage({ role, className, children }: ChatMessageProps) {
	return (
		<Stack direction="row" gap={0} data-slot="chat-message" data-role={role} className={className}>
			{role === 'user' && <Spacer />}

			<div
				className={cn(
					'max-w-[80%] rounded-2xl px-4 py-3.5 whitespace-pre-wrap',
					role === 'user' ? 'bg-blue-600 text-white' : '',
				)}
			>
				{children}
			</div>
		</Stack>
	)
}
