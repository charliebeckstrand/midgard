import { bifrost } from 'auth'
import { Alert } from 'ui/alert'
import { Stack } from 'ui/structure/stack'
import { PageHeader } from '@/components/page-header'
import { SecurityClient } from './client'

/**
 * Fetches the threats and the bans from the gateway, server-side. When Vidar
 * is not available, the gateway answers `503`, and the page tells the admin.
 */
export default async function SecurityPage() {
	const [threats, bans] = await Promise.all([
		bifrost.GET('/api/security/threats'),
		bifrost.GET('/api/security/bans'),
	])

	if (!threats.data || !bans.data) {
		return (
			<Stack gap="xl">
				<PageHeader title="Security" />

				<Alert
					severity="error"
					title="Security monitoring is not available."
					description="The gateway cannot reach Vidar. Try again soon."
				/>
			</Stack>
		)
	}

	return <SecurityClient threats={threats.data.data} bans={bans.data.data} />
}
