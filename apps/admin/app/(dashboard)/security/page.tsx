import { bifrost } from 'auth'
import { Heading } from 'ui/heading'
import { Text } from 'ui/text'
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
			<>
				<Heading>Security</Heading>

				<Text tone="error">Security monitoring is not available.</Text>
			</>
		)
	}

	return <SecurityClient threats={threats.data.data} bans={bans.data.data} />
}
