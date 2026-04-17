'use client'

import { ChatBubbleLeftIcon, PlusIcon, XMarkIcon } from '@heroicons/react/20/solid'
import type { User } from 'heimdall/user'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type ReactNode, useCallback, useMemo } from 'react'
import { SidebarUserMenu } from 'sindri/auth'
import { useChat } from 'sindri/chat'
import { Button } from 'ui/button'
import { useArrowAction } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { SidebarLayout } from 'ui/layouts'
import { Navbar } from 'ui/navbar'
import {
	Sidebar,
	SidebarBody,
	SidebarFooter,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
} from 'ui/sidebar'
import { Spacer } from 'ui/spacer'
import { Text } from 'ui/text'
import { ChatContext } from './context'
import type { Chat } from './types'

function ChatItem({
	chat,
	current,
	onDelete,
}: {
	chat: Chat
	current: boolean
	onDelete: (id: string) => void
}) {
	const { onPrimaryKeyDown, onActionKeyDown } = useArrowAction<HTMLButtonElement>()

	return (
		<div className="group relative">
			<SidebarItem
				className="group-hover:pr-10"
				href={`/${chat.id}`}
				current={current}
				onKeyDown={onPrimaryKeyDown}
			>
				<ChatBubbleLeftIcon />
				<SidebarLabel>{chat.id}</SidebarLabel>
			</SidebarItem>
			<Button
				size="xs"
				color="red"
				className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 z-10 -translate-y-1/2"
				tabIndex={-1}
				onKeyDown={onActionKeyDown}
				onClick={(e) => {
					e.preventDefault()
					onDelete(chat.id)
				}}
			>
				<Icon icon={<XMarkIcon />} />
			</Button>
		</div>
	)
}

export function ChatClient({
	user,
	chats,
	children,
}: {
	user?: User
	chats: Chat[]
	children: ReactNode
}) {
	const pathname = usePathname()

	const router = useRouter()

	const searchParams = useSearchParams()

	const { newChat, deleteChat } = useChat({ onDelete: () => router.refresh() })

	const activeChatId = useMemo(() => {
		const match = pathname.match(/^\/([^/]+)/)

		return match ? match[1] : null
	}, [pathname])

	const isDraft = searchParams.get('draft') === 'true'

	const openChat = useCallback(
		(chatId: string) => {
			router.push(`/${chatId}`)
		},
		[router],
	)

	const openDraft = useCallback(() => {
		newChat()
	}, [newChat])

	const refreshChats = useCallback(() => {
		router.refresh()
	}, [router])

	const contextValue = useMemo(
		() => ({ activeChatId, isDraft, openChat, openDraft, refreshChats }),
		[activeChatId, isDraft, openChat, openDraft, refreshChats],
	)

	return (
		<SidebarLayout
			navbar={
				<Navbar>
					<Spacer />
				</Navbar>
			}
			sidebar={
				<Sidebar>
					<SidebarHeader>
						<SidebarItem href="/" current={pathname === '/'}>
							<img src="/hexagon.png" alt="hexagon" width={24} height={24} />
							<SidebarLabel>
								<Text className="font-black text-lg">Chat</Text>
							</SidebarLabel>
						</SidebarItem>
					</SidebarHeader>
					<SidebarBody>
						<SidebarSection>
							<SidebarItem onClick={newChat}>
								<PlusIcon />
								<SidebarLabel>New chat</SidebarLabel>
							</SidebarItem>
						</SidebarSection>
						{chats.length > 0 && (
							<SidebarSection>
								{chats.map((chat) => (
									<ChatItem
										key={chat.id}
										chat={chat}
										current={pathname === `/${chat.id}`}
										onDelete={deleteChat}
									/>
								))}
							</SidebarSection>
						)}
					</SidebarBody>
					<SidebarFooter>
						<SidebarUserMenu user={user} />
					</SidebarFooter>
				</Sidebar>
			}
		>
			<ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
		</SidebarLayout>
	)
}
