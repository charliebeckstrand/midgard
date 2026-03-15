'use client'

import {
	Button,
	Dialog,
	DialogActions,
	DialogBody,
	DialogTitle,
	Field,
	Fieldset,
	Heading,
	Input,
	Label,
} from 'catalyst'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'catalyst/table'
import type { User } from 'heimdall/user'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface UsersClientProps {
	users: User[]
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
						<Label>ID</Label>
						<Input value={user?.id ?? ''} readOnly />
					</Field>
					<Field data-slot="control">
						<Label>Email</Label>
						<Input value={email} onChange={(e) => setEmail(e.target.value)} />
					</Field>
					<Field data-slot="control">
						<Label>Created At</Label>
						<Input
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
						<Label>Updated At</Label>
						<Input
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

export function UsersClient({ users }: UsersClientProps) {
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
									<Button variant="outline">Delete</Button>
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
