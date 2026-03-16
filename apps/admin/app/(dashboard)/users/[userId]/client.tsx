'use client'

import {
	Button,
	Dialog,
	DialogActions,
	DialogBody,
	DialogTitle,
	Heading,
	Subheading,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from 'catalyst'
import type { User } from 'heimdall/user'
import { useState } from 'react'
import type { Chat } from 'sindri/chat'

interface UserDetailsClientProps {
	details: User | null
	chats: Chat[] | null
}

export function UserDetailsClient({ details, chats: initialChats }: UserDetailsClientProps) {
	const [chats, setChats] = useState(initialChats)
	const [confirmDeleteChatId, setConfirmDeleteChatId] = useState<string | null>(null)

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
											<Button variant="outline" disabled>
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
