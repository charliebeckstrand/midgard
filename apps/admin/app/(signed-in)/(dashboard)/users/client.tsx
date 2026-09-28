'use client'

import type { User } from 'auth'
import { useState } from 'react'
import { Alert } from 'ui/alert'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Card } from 'ui/card'
import { Confirm } from 'ui/confirm'
import { Link } from 'ui/link'
import { Stack } from 'ui/structure/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { PageHeader } from '@/components/page-header'
import { useSetUserActive, useUsers } from './users-queries'

type UsersClientProps = {
	users: User[]
}

const dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }

/**
 * Users table, with an action that deactivates or reactivates each user.
 *
 * @remarks
 * The server page seeds the `useUsers` query. An admin changes only the status
 * of an account, and never its credentials. The gateway refuses a change to an
 * admin account, so the action of an admin row is disabled. A deactivation
 * signs the user out on each device, so it asks for confirmation first. When
 * the gateway refuses a change, the page shows its message.
 */
export function UsersClient({ users: initialUsers }: UsersClientProps) {
	const { data: users } = useUsers(initialUsers)
	const { mutate: setActive, isPending: saving, error } = useSetUserActive()
	const [deactivating, setDeactivating] = useState<User | null>(null)

	return (
		<Stack gap="xl">
			<PageHeader
				title="Users"
				description="The accounts that sign in through the gateway. Open an account to see its activity."
			/>

			{error && <Alert severity="error" title={error.message} />}

			<Card>
				<Table>
					<TableHead>
						<TableRow>
							<TableHeader>Email</TableHeader>
							<TableHeader>Role</TableHeader>
							<TableHeader>Status</TableHeader>
							<TableHeader>Created</TableHeader>
							<TableHeader>
								<span className="sr-only">Actions</span>
							</TableHeader>
						</TableRow>
					</TableHead>
					<TableBody>
						{users.map((user) => (
							<TableRow key={user.id}>
								<TableCell>
									<Link href={`/users/${user.id}`} color="blue" className="font-medium">
										{user.email}
									</Link>
								</TableCell>
								<TableCell>{user.roles.includes('admin') ? 'Admin' : 'User'}</TableCell>
								<TableCell>
									<Badge color={user.is_active ? 'green' : 'zinc'}>
										{user.is_active ? 'Active' : 'Inactive'}
									</Badge>
								</TableCell>
								<TableCell>
									{new Date(user.created_at).toLocaleDateString(undefined, dateFormat)}
								</TableCell>
								<TableCell className="text-end">
									<Button
										variant="outline"
										size="sm"
										disabled={user.roles.includes('admin') || saving}
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
			</Card>

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
		</Stack>
	)
}
