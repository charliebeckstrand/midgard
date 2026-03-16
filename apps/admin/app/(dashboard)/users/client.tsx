'use client'

import type { User } from 'heimdall/user'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from 'ui/button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from 'ui/dialog'
import { Field, Fieldset, Label } from 'ui/fieldset'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'

interface UsersClientProps {
	users: User[]
	currentUser: User | undefined
}

interface EditUserDialogProps {
	user: User | null
	onClose: () => void
}

function EditUserDialog({ user, onClose }: EditUserDialogProps) {
	const [email, setEmail] = useState(user?.email ?? '')

	useEffect(() => {
		if (user) setEmail(user.email)
	}, [user])

	return (
		<Dialog open={user !== null} onClose={onClose}>
			<DialogTitle>Edit User</DialogTitle>
			<DialogBody>
				<Fieldset>
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
				</Fieldset>
			</DialogBody>
			<DialogActions>
				<Button variant="plain" onClick={onClose}>
					Cancel
				</Button>
				<Button color="blue">Save</Button>
			</DialogActions>
		</Dialog>
	)
}

export function UsersClient({ users, currentUser }: UsersClientProps) {
	const [editingUser, setEditingUser] = useState<User | null>(null)

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
								<Link href={`/users/${user.id}`} className="text-blue-500 hover:underline">
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
								<div className="flex gap-1">
									<Button variant="outline" onClick={() => setEditingUser(user)}>
										Edit
									</Button>
									<Button variant="outline" disabled={user.id === currentUser?.id}>
										Delete
									</Button>
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} />
		</>
	)
}
