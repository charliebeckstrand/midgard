import { bifrost, requireGateway } from 'auth'
import { Suspense } from 'react'
import { seed } from 'shared/queries'
import { Stack } from 'ui/structure/stack'
import { PageHeader } from '@/components/page-header'
import { UsersClient, UsersLoading } from './client'

/**
 * Reads all users from the gateway, and hands them to the grid.
 *
 * @remarks
 * A failed read throws, so an outage does not show an empty list.
 *
 * @internal
 */
async function Users() {
	const data = await requireGateway('/api/users', () => bifrost.GET('/api/users'))

	return <UsersClient users={seed(data?.data ?? [])} />
}

/**
 * Users: each account that signs in through the gateway.
 *
 * @remarks
 * The header and the loading grid are in the static shell, so a navigation to
 * the page shows them at once. The list streams into the grid.
 */
export default function UsersPage() {
	return (
		<Stack gap="xl">
			<PageHeader
				title="Users"
				description="The accounts that sign in through the gateway. Open an account to see its activity."
			/>

			<Suspense fallback={<UsersLoading />}>
				<Users />
			</Suspense>
		</Stack>
	)
}
