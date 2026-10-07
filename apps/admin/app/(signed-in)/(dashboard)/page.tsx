import { bifrost, requireGateway } from 'auth'
import { type ReactNode, Suspense } from 'react'
import { Card } from 'ui/card'
import { Link } from 'ui/link'
import { Stat, StatDescription, StatLabel, StatValue, StatValueSkeleton } from 'ui/stat'
import { Columns } from 'ui/structure/columns'
import { Stack } from 'ui/structure/stack'
import { PageHeader } from '@/components/page-header'

type SummaryProps = {
	label: string
	/**
	 * The count, or `undefined` when the gateway did not give it, which shows as
	 * a dash. `null` shows a skeleton while the count loads.
	 */
	value: number | undefined | null
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
				{value === null ? <StatValueSkeleton /> : <StatValue>{value ?? '—'}</StatValue>}
				<StatDescription>
					<Link href={href} underline>
						{children}
					</Link>
				</StatDescription>
			</Stat>
		</Card>
	)
}

type Counts = {
	users: number | undefined
	inactive: number | undefined
	threats: number | undefined
	bans: number | undefined
}

/**
 * The four counts of the dashboard. Without `counts`, each value is a
 * skeleton, and the grid is the fallback of the boundary.
 *
 * @internal
 */
function Summaries({ counts }: { counts?: Counts }) {
	return (
		<Columns columns={{ initial: 1, sm: 2, xl: 4 }}>
			<Summary label="Users" value={counts ? counts.users : null} href="/users">
				Manage the users
			</Summary>
			<Summary label="Inactive users" value={counts ? counts.inactive : null} href="/users">
				Reactivate a user
			</Summary>
			<Summary label="Open threats" value={counts ? counts.threats : null} href="/security">
				Review the threats
			</Summary>
			<Summary label="Bans" value={counts ? counts.bans : null} href="/security">
				Review the bans
			</Summary>
		</Columns>
	)
}

/**
 * Reads the counts from the gateway, and renders them.
 *
 * @remarks
 * A failed read of the users throws, as on the users page. When Vidar is not
 * available, the gateway answers `503` for the threats and the bans, and their
 * counts show as not available.
 *
 * @internal
 */
async function DashboardCounts() {
	const [users, threats, bans] = await Promise.all([
		requireGateway('/api/users', () => bifrost.GET('/api/users')),
		bifrost.GET('/api/security/threats'),
		bifrost.GET('/api/security/bans'),
	])

	const accounts = users?.data ?? []

	return (
		<Summaries
			counts={{
				users: accounts.length,
				inactive: accounts.filter((user) => !user.is_active).length,
				threats: threats.data?.data.filter((threat) => !threat.resolved).length,
				bans: bans.data?.data.length,
			}}
		/>
	)
}

/**
 * Dashboard: the counts of the users, the open threats, and the bans.
 *
 * @remarks
 * The header and the cards are in the static shell, so a navigation to the
 * page shows them at once. The counts come from the gateway on each request,
 * and stream into the cards.
 */
export default function DashboardPage() {
	return (
		<Stack gap="xl">
			<PageHeader title="Dashboard" description="The accounts and the security of the gateway." />

			<Suspense fallback={<Summaries />}>
				<DashboardCounts />
			</Suspense>
		</Stack>
	)
}
