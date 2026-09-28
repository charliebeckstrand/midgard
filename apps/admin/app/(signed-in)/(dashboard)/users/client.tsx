'use client'

import type { User } from 'auth'
import { useState } from 'react'
import { Alert } from 'ui/alert'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Card } from 'ui/card'
import { Confirm } from 'ui/confirm'
import { Link } from 'ui/link'
import { Grid, type GridColumn } from 'ui/modules/grid'
import { Stack } from 'ui/structure/stack'
import { PageHeader } from '@/components/page-header'
import { useSetUserActive, useUsers } from './users-queries'

type UsersClientProps = {
	users: User[]
}

const dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }

const roleName = (user: User) => (user.roles.includes('admin') ? 'Admin' : 'User')

/**
 * Users grid, sortable by each column (newest first by default), with an action that deactivates or reactivates each user.
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

	const columns: GridColumn<User>[] = [
		{
			id: 'email',
			title: 'Email',
			value: (user) => user.email,
			cell: (user) => (
				<Link href={`/users/${user.id}`} color="blue" className="font-medium">
					{user.email}
				</Link>
			),
		},
		{ id: 'role', title: 'Role', value: roleName, cell: roleName },
		{
			id: 'status',
			title: 'Status',
			value: (user) => (user.is_active ? 'Active' : 'Inactive'),
			cell: (user) => (
				<Badge color={user.is_active ? 'green' : 'zinc'}>
					{user.is_active ? 'Active' : 'Inactive'}
				</Badge>
			),
		},
		{
			id: 'created',
			title: 'Created',
			value: (user) => user.created_at,
			cell: (user) => new Date(user.created_at).toLocaleDateString(undefined, dateFormat),
		},
		{
			id: 'actions',
			sortable: false,
			actions: (user) => (
				<Button
					variant="outline"
					size="sm"
					disabled={user.roles.includes('admin') || saving}
					onClick={() =>
						user.is_active ? setDeactivating(user) : setActive({ userId: user.id, isActive: true })
					}
				>
					{user.is_active ? 'Deactivate' : 'Reactivate'}
				</Button>
			),
		},
	]

	return (
		<Stack gap="xl">
			<PageHeader
				title="Users"
				description="The accounts that sign in through the gateway. Open an account to see its activity."
			/>

			{error && <Alert severity="error" title={error.message} />}

			<Card>
				<Grid
					columns={columns}
					rows={users}
					getKey={(user) => user.id}
					sort={{ defaultValue: [{ column: 'created', direction: 'desc' }] }}
				/>
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
