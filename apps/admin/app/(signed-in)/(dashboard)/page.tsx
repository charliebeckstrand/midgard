import { bifrost, requireGateway } from 'auth'
import type { ReactNode } from 'react'
import { Card } from 'ui/card'
import { Link } from 'ui/link'
import { Stat, StatDescription, StatLabel, StatValue } from 'ui/stat'
import { Stack } from 'ui/structure/stack'
import { PageHeader } from '@/components/page-header'

type SummaryProps = {
	label: string
	/** The count, or `undefined` when the gateway did not give it, which shows as a dash. */
	value: number | undefined
	href: string
	children: ReactNode
}

/**
 * One count of the dashboard, with a link to the page that manages it.
 *
 * @internal
 */
function Summary({ label, value, href, children }: SummaryProps) {
	return (
		<Card>
			<Stat>
				<StatLabel>{label}</StatLabel>
				<StatValue>{value ?? '—'}</StatValue>
				<StatDescription>
					<Link href={href} underline>
						{children}
					</Link>
				</StatDescription>
			</Stat>
		</Card>
	)
}

/**
 * Dashboard: the counts of the users, the open threats, and the bans.
 *
 * @remarks
 * A failed read of the users throws, as on the users page. When Vidar is not
 * available, the gateway answers `503` for the threats and the bans, and their
 * counts show as not available.
 */
export default async function DashboardPage() {
	const [users, threats, bans] = await Promise.all([
		requireGateway('/api/users', () => bifrost.GET('/api/users')),
		bifrost.GET('/api/security/threats'),
		bifrost.GET('/api/security/bans'),
	])

	const accounts = users?.data ?? []

	return (
		<Stack gap="xl">
			<PageHeader title="Dashboard" description="The accounts and the security of the gateway." />

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Summary label="Users" value={accounts.length} href="/users">
					Manage the users
				</Summary>
				<Summary
					label="Inactive users"
					value={accounts.filter((user) => !user.is_active).length}
					href="/users"
				>
					Reactivate a user
				</Summary>
				<Summary
					label="Open threats"
					value={threats.data?.data.filter((threat) => !threat.resolved).length}
					href="/security"
				>
					Review the threats
				</Summary>
				<Summary label="Bans" value={bans.data?.data.length} href="/security">
					Review the bans
				</Summary>
			</div>
		</Stack>
	)
}
