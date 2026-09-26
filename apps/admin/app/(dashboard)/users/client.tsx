'use client'

import type { User } from 'auth'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from 'ui/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from 'ui/dialog'
import { Field, Fieldset, Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Form } from 'ui/form'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { Text } from 'ui/text'
import { useDeleteUser, useSaveUserEmail, useUsers } from './users-queries'

type UsersClientProps = {
	users: User[]
	currentUser: User | undefined
}

type EditUserDialogProps = {
	user: User | null
	onClose: () => void
}

type EditUserValues = { email: string }

/**
 * Modal for editing a user's email; id and timestamps shown read-only.
 *
 * @internal
 * @remarks Open while `user` is non-null. Surfaces a retry message when the
 *   save fails; closes on success.
 */
function EditUserDialog({ user, onClose }: EditUserDialogProps) {
	const { mutateAsync: save, reset, isPending: saving, isError: failed } = useSaveUserEmail()

	// Clear the error of an earlier save when the dialog opens.
	useEffect(() => {
		if (user) reset()
	}, [user, reset])

	return (
		<Dialog open={user !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogTitle>Edit User</DialogTitle>
			<Form<EditUserValues>
				// A new user mounts a new form, which seeds from `defaultValues`. The
				// unmount also discards a save that is still in flight, so its
				// `onSettled` cannot close the dialog of the next user.
				key={user?.id}
				defaultValues={{ email: user?.email ?? '' }}
				onSubmit={async ({ email }) => {
					if (user) await save({ userId: user.id, email })
				}}
				onSettled={(outcome) => {
					if (outcome.ok) onClose()
				}}
			>
				<DialogBody>
					<Fieldset className="space-y-4">
						<Field data-slot="control">
							<Label htmlFor="user-id">ID</Label>
							<Input id="user-id" value={user?.id ?? ''} readOnly />
						</Field>
						<Field data-slot="control">
							<Label htmlFor="user-email">Email</Label>
							<Input id="user-email" name="email" />
						</Field>
						<Field data-slot="control">
							<Label htmlFor="user-created-at">Created At</Label>
							<Input
								id="user-created-at"
								value={
									user
										? new Date(user.created_at).toLocaleString(undefined, {
												dateStyle: 'medium',
												timeStyle: 'short',
											})
										: ''
								}
								readOnly
							/>
						</Field>
						<Field data-slot="control">
							<Label htmlFor="user-updated-at">Updated At</Label>
							<Input
								id="user-updated-at"
								value={
									user
										? new Date(user.updated_at).toLocaleString(undefined, {
												dateStyle: 'medium',
												timeStyle: 'short',
											})
										: ''
								}
								readOnly
							/>
						</Field>
						{failed && (
							<Text className="text-red-600">Couldn't save changes. Please try again.</Text>
						)}
					</Fieldset>
				</DialogBody>
				<DialogFooter>
					{/* The form disables its fieldset while it submits, which covers both buttons. */}
					<Button type="button" variant="plain" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" color="blue">
						{saving ? 'Saving…' : 'Save'}
					</Button>
				</DialogFooter>
			</Form>
		</Dialog>
	)
}

/**
 * Users table with edit and delete actions over the seeded user list.
 *
 * @remarks
 * The server page seeds the `useUsers` query. Mutations call `/api/users/:id`
 * (PATCH/DELETE) and write the result into the cached list on success.
 * Deleting `currentUser` is disabled.
 */
export function UsersClient({ users: initialUsers, currentUser }: UsersClientProps) {
	const { data: users } = useUsers(initialUsers)
	const { mutate: deleteUser, isPending: deleting } = useDeleteUser()
	const [editingUser, setEditingUser] = useState<User | null>(null)
	const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null)

	return (
		<>
			<div>
				<Heading>Users</Heading>
			</div>

			<Table>
				<TableHead>
					<TableRow>
						<TableHeader>ID</TableHeader>
						<TableHeader>Email</TableHeader>
						<TableHeader>Created At</TableHeader>
						<TableHeader>Updated At</TableHeader>
						<TableHeader></TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					{users.map((user) => (
						<TableRow key={user.id}>
							<TableCell>
								<Link
									href={`/users/${user.id}`}
									className="text-blue-600 hover:underline dark:text-blue-500"
								>
									{user.id}
								</Link>
							</TableCell>
							<TableCell>{user.email}</TableCell>
							<TableCell>
								{new Date(user.created_at).toLocaleString(undefined, {
									dateStyle: 'medium',
									timeStyle: 'short',
								})}
							</TableCell>
							<TableCell>
								{new Date(user.updated_at).toLocaleString(undefined, {
									dateStyle: 'medium',
									timeStyle: 'short',
								})}
							</TableCell>
							<TableCell>
								<Flex gap="xs">
									<Button variant="outline" onClick={() => setEditingUser(user)}>
										Edit
									</Button>
									<Button
										variant="outline"
										disabled={user.id === currentUser?.id}
										onClick={() => setConfirmDeleteUser(user)}
									>
										Delete
									</Button>
								</Flex>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} />

			<Dialog
				open={confirmDeleteUser !== null}
				onOpenChange={(open) => !open && setConfirmDeleteUser(null)}
			>
				<DialogTitle>Delete User</DialogTitle>
				<DialogBody>
					Are you sure you want to delete{' '}
					<div>
						"<strong>{confirmDeleteUser?.email}</strong>"?
					</div>
				</DialogBody>
				<DialogFooter>
					<Button variant="outline" onClick={() => setConfirmDeleteUser(null)}>
						Cancel
					</Button>
					<Button
						color="red"
						disabled={deleting}
						onClick={() =>
							confirmDeleteUser &&
							deleteUser(confirmDeleteUser.id, { onSettled: () => setConfirmDeleteUser(null) })
						}
					>
						Delete
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	)
}
