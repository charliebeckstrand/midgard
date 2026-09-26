'use client'

import type { User } from 'auth'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Heading } from 'ui/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { useSetUserActive, useUsers } from './users-queries'

type UsersClientProps = {
	users: User[]
}

const dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

/**
 * Users table, with an action that deactivates or reactivates each user.
 *
 * @remarks
 * The server page seeds the `useUsers` query. An admin changes only the status
 * of an account, and never its credentials. The gateway refuses a change to an
 * admin account, so the action of an admin row is disabled. A deactivation
 * signs the user out on each device, so it asks for confirmation first.
 */
export function UsersClient({ users: initialUsers }: UsersClientProps) {
	const { data: users } = useUsers(initialUsers)
	const { mutate: setActive, isPending: saving } = useSetUserActive()
	const [deactivating, setDeactivating] = useState<User | null>(null)

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
						<TableHeader>Role</TableHeader>
						<TableHeader>Status</TableHeader>
						<TableHeader>Created At</TableHeader>
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
							<TableCell>
								<Badge color={user.is_active ? 'green' : 'zinc'}>
									{user.is_active ? 'Active' : 'Inactive'}
								</Badge>
							</TableCell>
							<TableCell>
								{new Date(user.created_at).toLocaleString(undefined, dateFormat)}
							</TableCell>
							<TableCell>
								<Button
									variant="outline"
									disabled={user.role === 'admin' || saving}
									onClick={() =>
										user.is_active
											? setDeactivating(user)
											: setActive({ userId: user.id, isActive: true })
									}
								>
									{user.is_active ? 'Deactivate' : 'Reactivate'}
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<Confirm
				open={deactivating !== null}
				onOpenChange={(open) => !open && setDeactivating(null)}
				onConfirm={() => {
					if (deactivating) setActive({ userId: deactivating.id, isActive: false })

					setDeactivating(null)
				}}
				title={deactivating === null ? '' : `Deactivate ${deactivating.email}?`}
				description="The user is signed out on each device, and cannot sign in until you reactivate the account."
				confirm={{ label: 'Deactivate', color: 'red' }}
			/>
		</>
	)
}
