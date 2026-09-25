'use client'

import { XMarkIcon } from '@heroicons/react/20/solid'
import type { User } from 'auth'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from 'ui/dialog'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { ChatTranscript } from 'ui/modules/chat'
import { Placeholder } from 'ui/placeholder'
import { Sheet, SheetBody, SheetClose, SheetDescription, SheetTitle } from 'ui/sheet'
import { Stack } from 'ui/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { Text } from 'ui/text'
import { useChatMessages, useDeleteChat, useUserChats } from '../users-queries'
import type { Chat } from './types'

type UserDetailsClientProps = {
	userId: string
	details: User | null
	chats: Chat[] | null
}

/**
 * User detail view: the user's chats, with read-only history and delete.
 *
 * @remarks
 * The server page seeds the `useUserChats` query. Opening a chat fetches its
 * messages from `/api/chat/:id` into a sheet, keyed by the chat id, so a late
 * response for one chat never shows under another. Delete calls
 * `DELETE /api/chat/:id` and removes the chat from the cached list on success.
 */
export function UserDetailsClient({
	userId,
	details,
	chats: initialChats,
}: UserDetailsClientProps) {
	const { data: chats } = useUserChats(userId, initialChats)
	const { mutate: deleteChat, isPending: deleting } = useDeleteChat(userId)
	const [confirmDeleteChat, setConfirmDeleteChat] = useState<string | null>(null)
	const [viewChat, setViewChat] = useState<string | null>(null)
	const { data: messages, isError: messagesFailed } = useChatMessages(viewChat)

	return (
		<>
			<Stack gap="xl">
				<Heading>{details?.email}</Heading>

				<Stack gap="md">
					<Heading level={2}>Chats</Heading>

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
										<Flex gap="xs">
											<Button variant="outline" onClick={() => setViewChat(chat.id)}>
												View
											</Button>
											<Button variant="outline" onClick={() => setConfirmDeleteChat(chat.id)}>
												Delete
											</Button>
										</Flex>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Stack>
			</Stack>

			<Sheet
				open={viewChat !== null}
				onOpenChange={(open) => !open && setViewChat(null)}
				width="3xl"
			>
				<Flex justify="between" className="mr-2.5">
					<Stack className="gap-0">
						<SheetTitle>Chat History</SheetTitle>
						<SheetDescription>{viewChat}</SheetDescription>
					</Stack>
					<SheetClose>
						<Button variant="plain">
							<Icon icon={<XMarkIcon />} />
						</Button>
					</SheetClose>
				</Flex>
				<SheetBody>
					{messages === undefined ? (
						messagesFailed ? (
							<Text className="text-red-600">Couldn't load this chat.</Text>
						) : (
							<Placeholder />
						)
					) : messages.length > 0 ? (
						<ChatTranscript messages={messages} />
					) : (
						<Text className="text-zinc-500">No messages in this chat.</Text>
					)}
				</SheetBody>
			</Sheet>

			<Dialog
				open={confirmDeleteChat !== null}
				onOpenChange={(open) => !open && setConfirmDeleteChat(null)}
			>
				<DialogTitle>Delete Chat</DialogTitle>
				<DialogBody>
					Are you sure you want to delete{' '}
					<div>
						"<strong>{confirmDeleteChat}</strong>"?
					</div>
				</DialogBody>
				<DialogFooter>
					<Button variant="outline" onClick={() => setConfirmDeleteChat(null)}>
						Cancel
					</Button>
					<Button
						color="red"
						disabled={deleting}
						onClick={() =>
							confirmDeleteChat &&
							deleteChat(confirmDeleteChat, { onSettled: () => setConfirmDeleteChat(null) })
						}
					>
						Delete
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	)
}
