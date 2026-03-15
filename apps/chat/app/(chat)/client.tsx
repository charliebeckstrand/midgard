'use client'

import { ChatBubbleLeftIcon, PlusIcon, XMarkIcon } from '@heroicons/react/20/solid'
import {
	Navbar,
	NavbarSpacer,
	Sidebar,
	SidebarBody,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarLayout,
	SidebarSection,
} from 'catalyst'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { ShinyText } from 'reactbits'

import { useChatActions } from './hooks/use-chat-actions'
import { SidebarUserFooter } from './sidebar-footer'
import type { Chat, User } from './types'

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
	const { newChat, deleteChat } = useChatActions()

	return (
		<SidebarLayout
			scrollable={false}
			navbar={
				<Navbar>
					<NavbarSpacer />
				</Navbar>
			}
			sidebar={
				<Sidebar>
					<SidebarHeader>
						<SidebarItem href="/" current={pathname === '/'}>
							<img src="/hexagon.png" alt="hexagon" width={24} height={24} />
							<SidebarLabel>
								<ShinyText text="Chat" className="font-black text-lg" delay={10} yoyo />
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
									<div key={chat.id} className="group relative">
										<SidebarItem href={`/${chat.id}`} current={pathname === `/${chat.id}`}>
											<ChatBubbleLeftIcon />
											<SidebarLabel>{chat.id}</SidebarLabel>
										</SidebarItem>
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault()
												deleteChat(chat.id)
											}}
											className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-0.75 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 bg-zinc-800 hover:bg-zinc-700"
										>
											<XMarkIcon className="size-4 fill-zinc-950 dark:fill-white" />
										</button>
									</div>
								))}
							</SidebarSection>
						)}
					</SidebarBody>
					<SidebarUserFooter user={user} />
				</Sidebar>
			}
		>
			{children}
		</SidebarLayout>
	)
}
