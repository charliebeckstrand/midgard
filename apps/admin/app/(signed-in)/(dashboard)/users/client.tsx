'use client'

import type { User } from 'auth'
import type { ReactNode } from 'react'
import type { Seed } from 'shared/queries'
import { Alert } from 'ui/alert'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Card } from 'ui/card'
import { useConfirm } from 'ui/confirm'
import { DateTime } from 'ui/date-time'
import { Link } from 'ui/link'
import { Grid, type GridColumn } from 'ui/modules/grid'
import { Stack } from 'ui/structure/stack'
import { useSetUserActive, useUsers } from './users-queries'

type UsersClientProps = {
	users: Seed<User[]>
}

const roleName = (user: User) => (user.roles.includes('admin') ? 'Admin' : 'User')

/**
 * The columns of the users grid. `action` renders the control at the end of a
 * row, so the loading grid can give the same columns with no control.
 *
 * @internal
 */
function usersColumns(action: (user: User) => ReactNode): GridColumn<User>[] {
	return [
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
			cell: (user) => <DateTime value={user.created_at} format={{ dateStyle: 'medium' }} />,
		},
		{
			id: 'actions',
			sortable: false,
			actions: action,
		},
	]
}

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
	const confirm = useConfirm()

	const columns = usersColumns((user) => (
		<Button
			variant="outline"
			size="sm"
			disabled={user.roles.includes('admin') || saving}
			onClick={async () => {
				if (!user.is_active) {
					setActive({ userId: user.id, isActive: true })

					return
				}

				const confirmed = await confirm({
					title: `Deactivate ${user.email}?`,
					description:
						'The user is signed out on each device, and cannot sign in until you reactivate the account.',
					confirm: { label: 'Deactivate', color: 'red' },
				})

				if (confirmed) setActive({ userId: user.id, isActive: false })
			}}
		>
			{user.is_active ? 'Deactivate' : 'Reactivate'}
		</Button>
	))

	return (
		<Stack gap="xl">
			{error && <Alert severity="error" title={error.message} />}

			<Card>
				<Grid
					columns={columns}
					rows={users}
					getKey={(user) => user.id}
					sort={{ defaultValue: [{ column: 'created', direction: 'desc' }] }}
				/>
			</Card>
		</Stack>
	)
}

/**
 * The users grid while the list loads: the same columns, and skeleton rows.
 * The page gives it as the fallback of its boundary.
 */
export function UsersLoading() {
	return (
		<Card>
			<Grid columns={usersColumns(() => null)} rows={[]} getKey={(user) => user.id} loading />
		</Card>
	)
}
