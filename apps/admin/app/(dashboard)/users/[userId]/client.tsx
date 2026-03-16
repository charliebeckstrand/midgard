'use client'

import { XMarkIcon } from '@heroicons/react/20/solid'
import type { User } from 'heimdall/user'
import { useCallback, useEffect, useState } from 'react'
import type { Chat, ChatContent } from 'sindri/chat'
import { ChatMessages } from 'sindri/chat'
import { Button } from 'ui/button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from 'ui/dialog'
import { Heading, Subheading } from 'ui/heading'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from 'ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'

interface UserDetailsClientProps {
	details: User | null
	chats: Chat[] | null
}

export function UserDetailsClient({ details, chats: initialChats }: UserDetailsClientProps) {
	const [chats, setChats] = useState(initialChats)
	const [confirmDeleteChatId, setConfirmDeleteChatId] = useState<string | null>(null)
	const [viewChatId, setViewChatId] = useState<string | null>(null)
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
		if (viewChatId) {
			fetchChatMessages(viewChatId)
		}
	}, [viewChatId, fetchChatMessages])

	const deleteChat = async (chatId: string) => {
		await fetch(`/api/chat/${chatId}`, { method: 'DELETE' }).catch(() => null)

		setChats((prev) => prev?.filter((chat) => chat.id !== chatId) ?? null)

		setConfirmDeleteChatId(null)
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
											<Button variant="outline" onClick={() => setViewChatId(chat.id)}>
												View
											</Button>
											<Button variant="outline" onClick={() => setConfirmDeleteChatId(chat.id)}>
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

			<Sheet open={viewChatId !== null} onOpenChange={(open) => !open && setViewChatId(null)}>
				<SheetContent>
					<SheetHeader>
						<div className="flex items-center justify-between">
							<SheetTitle>Chat History</SheetTitle>
							<SheetClose className="rounded-md p-1 text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300">
								<XMarkIcon className="size-5" />
							</SheetClose>
						</div>
					</SheetHeader>
					<div className="flex flex-col flex-1 overflow-hidden px-6 pb-6">
						{loadingMessages ? (
							<p className="text-sm text-zinc-500">Loading messages…</p>
						) : chatMessages.length > 0 ? (
							<ChatMessages messages={chatMessages} />
						) : (
							<p className="text-sm text-zinc-500">No messages in this chat.</p>
						)}
					</div>
				</SheetContent>
			</Sheet>

			<Dialog open={confirmDeleteChatId !== null} onClose={() => setConfirmDeleteChatId(null)}>
				<DialogTitle>Delete Chat</DialogTitle>
				<DialogBody>
					Are you sure you want to delete{' '}
					<div>
						"<strong>{confirmDeleteChatId}</strong>"?
					</div>
				</DialogBody>
				<DialogActions>
					<Button variant="outline" onClick={() => setConfirmDeleteChatId(null)}>
						Cancel
					</Button>
					<Button
						color="red"
						onClick={() => confirmDeleteChatId && deleteChat(confirmDeleteChatId)}
					>
						Delete
					</Button>
				</DialogActions>
			</Dialog>
		</>
	)
}
