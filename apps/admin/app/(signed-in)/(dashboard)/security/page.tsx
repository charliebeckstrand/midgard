import { bifrost } from 'auth'
import { Suspense } from 'react'
import { seed } from 'shared/queries'
import { Alert } from 'ui/alert'
import { Stack } from 'ui/structure/stack'
import { TextSkeleton } from 'ui/text'
import { PageHeader } from '@/components/page-header'
import { SecurityClient } from './client'
import { BansSection, ThreatsSection } from './sections'

/**
 * Reads the threats and the bans from the gateway, and hands them to the
 * tables. When Vidar is not available, the gateway answers `503`, and the page
 * tells the admin.
 *
 * @internal
 */
async function Security() {
	const [threats, bans] = await Promise.all([
		bifrost.GET('/api/security/threats'),
		bifrost.GET('/api/security/bans'),
	])

	if (!threats.data || !bans.data) {
		return (
			<Alert
				severity="error"
				title="Security monitoring is not available."
				description="The gateway cannot reach Vidar. Try again soon."
			/>
		)
	}

	return <SecurityClient threats={seed(threats.data.data)} bans={seed(bans.data.data)} />
}

/**
 * The two cards while the threats and the bans load, each with a skeleton line.
 *
 * @internal
 */
function SecurityLoading() {
	return (
		<Stack gap="xl">
			<BansSection>
				<TextSkeleton />
			</BansSection>
			<ThreatsSection>
				<TextSkeleton />
			</ThreatsSection>
		</Stack>
	)
}

/**
 * Security: the threats that Vidar found, and the bans in force.
 *
 * @remarks
 * The header and the two cards are in the static shell, so a navigation to the
 * page shows them at once. The tables stream into the cards.
 */
export default function SecurityPage() {
	return (
		<Stack gap="xl">
			<PageHeader
				title="Security"
				description="The threats that Vidar found, and the addresses that cannot sign in."
			/>

			<Suspense fallback={<SecurityLoading />}>
				<Security />
			</Suspense>
		</Stack>
	)
}
