'use client'

import { ChatBubbleLeftIcon, PlusIcon } from '@heroicons/react/20/solid'
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
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { ShinyText } from 'reactbits'
import { SidebarUserFooter } from './sidebar-footer'

type User = { email: string; name?: string }

interface Chat {
	id: string
	title: string
}

export function ChatClient({ user, children }: { user?: User; children: ReactNode }) {
	const pathname = usePathname()
	const router = useRouter()
	const [chats, setChats] = useState<Chat[]>([])

	const fetchChats = useCallback(async () => {
		const response = await fetch('/api/chat/history').catch(() => null)

		if (response?.ok) {
			const data = await response.json()
			setChats(data)
		}
	}, [])

	useEffect(() => {
		fetchChats()
	}, [fetchChats])

	function newChat() {
		const id = crypto.randomUUID()
		router.push(`/${id}`)
	}

	return (
		<SidebarLayout
			navbar={
				<Navbar>
					<NavbarSpacer />
				</Navbar>
			}
			sidebar={
				<Sidebar>
					<SidebarHeader>
						<SidebarItem href="/" current={pathname === '/'}>
							<Image src="/gradient.png" alt="gradient" width={24} height={24} />
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
									<SidebarItem
										key={chat.id}
										href={`/${chat.id}`}
										current={pathname === `/${chat.id}`}
									>
										<ChatBubbleLeftIcon />
										<SidebarLabel>{chat.title}</SidebarLabel>
									</SidebarItem>
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
