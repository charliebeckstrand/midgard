'use client'

import type { User } from 'auth'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from 'ui/dialog'
import { Heading } from 'ui/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { Text } from 'ui/text'
import { useSetUserActive, useUsers } from './users-queries'

type UsersClientProps = {
	users: User[]
}

/**
 * Users table with a deactivate or reactivate action over the seeded user list.
 *
 * @remarks
 * The server page seeds the `useUsers` query. The action PATCHes
 * `/api/users/:id` with `is_active` and writes the changed user into the cached
 * list. The gateway lets an admin change only the standing of an account of the
 * `user` role, so the action is disabled for admins. A deactivation asks for
 * confirmation, because it also ends every session of the user.
 */
export function UsersClient({ users: initialUsers }: UsersClientProps) {
	const { data: users } = useUsers(initialUsers)
	const { mutate: setActive, isPending: saving, isError: failed, reset } = useSetUserActive()
	const [confirmDeactivateUser, setConfirmDeactivateUser] = useState<User | null>(null)

	return (
		<>
			<div>
				<Heading>Users</Heading>
			</div>

			{failed && <Text className="text-red-600">Couldn't change the user. Please try again.</Text>}

			<Table>
				<TableHead>
					<TableRow>
						<TableHeader>ID</TableHeader>
						<TableHeader>Email</TableHeader>
						<TableHeader>Role</TableHeader>
						<TableHeader>Status</TableHeader>
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
							<TableCell>{user.role === 'admin' ? 'Admin' : 'User'}</TableCell>
							<TableCell>{user.is_active ? 'Active' : 'Inactive'}</TableCell>
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
								<Button
									variant="outline"
									disabled={user.role === 'admin' || saving}
									onClick={() => {
										reset()

										if (user.is_active) {
											setConfirmDeactivateUser(user)
										} else {
											setActive({ userId: user.id, isActive: true })
										}
									}}
								>
									{user.is_active ? 'Deactivate' : 'Reactivate'}
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<Dialog
				open={confirmDeactivateUser !== null}
				onOpenChange={(open) => !open && setConfirmDeactivateUser(null)}
			>
				<DialogTitle>Deactivate User</DialogTitle>
				<DialogBody>
					Deactivate{' '}
					<div>
						"<strong>{confirmDeactivateUser?.email}</strong>"?
					</div>
					<Text>The user is signed out on every device and can't sign in until reactivated.</Text>
				</DialogBody>
				<DialogFooter>
					<Button variant="outline" onClick={() => setConfirmDeactivateUser(null)}>
						Cancel
					</Button>
					<Button
						color="red"
						disabled={saving}
						onClick={() =>
							confirmDeactivateUser &&
							setActive(
								{ userId: confirmDeactivateUser.id, isActive: false },
								{ onSettled: () => setConfirmDeactivateUser(null) },
							)
						}
					>
						Deactivate
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	)
}
