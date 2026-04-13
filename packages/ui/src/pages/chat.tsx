import type React from 'react'
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

			<ChatLayoutBody ref={bodyRef} className="flex flex-col gap-4">
				{messages}
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
			{role === 'agent' && <Spacer />}

			<div
				className={cn(
					'max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap',
					role === 'user'
						? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
						: 'bg-blue-600 text-white dark:bg-blue-500',
				)}
			>
				{children}
			</div>
		</Stack>
	)
}
