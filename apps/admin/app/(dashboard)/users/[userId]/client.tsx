'use client'

import { XMarkIcon } from '@heroicons/react/20/solid'
import type { User } from 'heimdall/user'
import { useCallback, useEffect, useState } from 'react'
import type { Chat, ChatContent } from 'sindri/chat'
import { ChatMessages } from 'sindri/chat'
import { Button } from 'ui/button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from 'ui/dialog'
import { Heading, Subheading } from 'ui/heading'
import { Placeholder } from 'ui/placeholder'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetSubtitle, SheetTitle } from 'ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { Text } from 'ui/text'

interface UserDetailsClientProps {
	details: User | null
	chats: Chat[] | null
}

export function UserDetailsClient({ details, chats: initialChats }: UserDetailsClientProps) {
	const [chats, setChats] = useState(initialChats)
	const [confirmDeleteChat, setConfirmDeleteChat] = useState<string | null>(null)
	const [viewChat, setViewChat] = useState<string | null>(null)
	const [chatMessages, setChatMessages] = useState<ChatContent[]>([])
	const [loadingMessages, setLoadingMessages] = useState(false)

	const fetchChatMessages = useCallback(async (chatId: string) => {
		setLoadingMessages(true)
		setChatMessages([])

		const res = await fetch(`/api/chat/${chatId}`).catch(() => null)

		if (res?.ok) {
			const { messages } = await res.json()
			setChatMessages(messages ?? [])
		}

		setLoadingMessages(false)
	}, [])

	useEffect(() => {
		if (viewChat) {
			fetchChatMessages(viewChat)
		}
	}, [viewChat, fetchChatMessages])

	const deleteChat = async (chatId: string) => {
		await fetch(`/api/chat/${chatId}`, { method: 'DELETE' }).catch(() => null)

		setChats((prev) => prev?.filter((chat) => chat.id !== chatId) ?? null)

		setConfirmDeleteChat(null)
	}

	return (
		<>
			<div className="flex flex-col gap-6">
				<Heading>{details?.email}</Heading>

				<pre className="dark:text-white">{JSON.stringify(details, null, 2)}</pre>

				<div className="flex flex-col">
					<Subheading>Chats</Subheading>

					<Table>
						<TableHead>
							<TableRow>
								<TableHeader>ID</TableHeader>
								<TableHeader>User ID</TableHeader>
								<TableHeader>Created At</TableHeader>
								<TableHeader>Updated At</TableHeader>
								<TableHeader></TableHeader>
							</TableRow>
						</TableHead>
						<TableBody>
							{chats?.map((chat) => (
								<TableRow key={chat.id}>
									<TableCell>{chat.id}</TableCell>
									<TableCell>{chat.user_id}</TableCell>
									<TableCell>
										{new Date(chat.created_at).toLocaleString(undefined, {
											dateStyle: 'medium',
											timeStyle: 'short',
										})}
									</TableCell>
									<TableCell>
										{new Date(chat.updated_at).toLocaleString(undefined, {
											dateStyle: 'medium',
											timeStyle: 'short',
										})}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<Button variant="outline" onClick={() => setViewChat(chat.id)}>
												View
											</Button>
											<Button variant="outline" onClick={() => setConfirmDeleteChat(chat.id)}>
												Delete
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>

			<Sheet open={viewChat !== null} onOpenChange={(open) => !open && setViewChat(null)}>
				<SheetContent size="3xl">
					<SheetHeader>
						<div className="flex items-center justify-between">
							<div className="flex flex-col">
								<SheetTitle>Chat History</SheetTitle>
								<SheetSubtitle>{viewChat}</SheetSubtitle>
							</div>
							<SheetClose className="rounded-md p-1 text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300">
								<XMarkIcon className="size-6" />
							</SheetClose>
						</div>
					</SheetHeader>
					<div className="flex flex-col flex-1 overflow-hidden p-6">
						{loadingMessages ? (
							<Placeholder />
						) : chatMessages.length > 0 ? (
							<ChatMessages messages={chatMessages} />
						) : (
							<Text className="text-zinc-500">No messages in this chat.</Text>
						)}
					</div>
				</SheetContent>
			</Sheet>

			<Dialog open={confirmDeleteChat !== null} onClose={() => setConfirmDeleteChat(null)}>
				<DialogTitle>Delete Chat</DialogTitle>
				<DialogBody>
					Are you sure you want to delete{' '}
					<div>
						"<strong>{confirmDeleteChat}</strong>"?
					</div>
				</DialogBody>
				<DialogActions>
					<Button variant="outline" onClick={() => setConfirmDeleteChat(null)}>
						Cancel
					</Button>
					<Button color="red" onClick={() => confirmDeleteChat && deleteChat(confirmDeleteChat)}>
						Delete
					</Button>
				</DialogActions>
			</Dialog>
		</>
	)
}
