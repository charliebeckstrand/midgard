'use client'

import type { User } from 'auth/user'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from 'ui/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from 'ui/dialog'
import { Field, Fieldset, Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { Text } from 'ui/text'

type UsersClientProps = {
	users: User[]
	currentUser: User | undefined
}

type EditUserDialogProps = {
	user: User | null
	onClose: () => void
	onSave: (userId: string, email: string) => Promise<boolean>
}

/**
 * Modal for editing a user's email; id and timestamps shown read-only.
 *
 * @internal
 * @remarks Open while `user` is non-null. Surfaces a retry message when `onSave`
 *   resolves `false`; closes on success.
 */
function EditUserDialog({ user, onClose, onSave }: EditUserDialogProps) {
	const [email, setEmail] = useState(user?.email ?? '')
	const [saving, setSaving] = useState(false)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		if (user) {
			setEmail(user.email)
			setFailed(false)
		}
	}, [user])

	const handleSave = async () => {
		if (!user) return

		setSaving(true)
		setFailed(false)

		const ok = await onSave(user.id, email)

		setSaving(false)

		if (ok) {
			onClose()
		} else {
			setFailed(true)
		}
	}

	return (
		<Dialog open={user !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogTitle>Edit User</DialogTitle>
			<DialogBody>
				<Fieldset className="space-y-4">
					<Field data-slot="control">
						<Label htmlFor="user-id">ID</Label>
						<Input id="user-id" value={user?.id ?? ''} readOnly />
					</Field>
					<Field data-slot="control">
						<Label htmlFor="user-email">Email</Label>
						<Input id="user-email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
					{failed && <Text className="text-red-600">Couldn't save changes. Please try again.</Text>}
				</Fieldset>
			</DialogBody>
			<DialogFooter>
				<Button variant="plain" onClick={onClose} disabled={saving}>
					Cancel
				</Button>
				<Button color="blue" onClick={handleSave} disabled={saving}>
					{saving ? 'Saving…' : 'Save'}
				</Button>
			</DialogFooter>
		</Dialog>
	)
}

/**
 * Users table with edit and delete actions over the seeded user list.
 *
 * @remarks
 * Mutations call `/api/users/:id` (PATCH/DELETE) and update local state
 * optimistically on success. Deleting `currentUser` is disabled.
 */
export function UsersClient({ users: initialUsers, currentUser }: UsersClientProps) {
	const [users, setUsers] = useState(initialUsers)
	const [editingUser, setEditingUser] = useState<User | null>(null)
	const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null)

	const saveUser = async (userId: string, email: string): Promise<boolean> => {
		const res = await fetch(`/api/users/${userId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email }),
		}).catch(() => null)

		if (!res?.ok) return false

		setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, email } : user)))

		return true
	}

	const deleteUser = async (userId: string) => {
		const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' }).catch(() => null)

		if (res?.ok) {
			setUsers((prev) => prev.filter((user) => user.id !== userId))
		}

		setConfirmDeleteUser(null)
	}

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
								<Link href={`/users/${user.id}`} className="text-blue-600 hover:underline">
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

			<EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} onSave={saveUser} />

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
					<Button color="red" onClick={() => confirmDeleteUser && deleteUser(confirmDeleteUser.id)}>
						Delete
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	)
}
