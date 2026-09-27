import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { Text } from 'ui/text'

/** One event in the history of an account, as the gateway lists it. */
export type Activity = {
	id: string
	action: string
	/** More about the action: the sign-in method, or the provider. */
	detail: string | null
	/** The account that did the action: the user, an admin, or `null` for the operator. */
	actor_id: string | null
	ip: string | null
	created_at: string
}

/** Props for {@link ActivityTable}. */
export type ActivityTableProps = {
	/** The events, newest first. */
	activity: Activity[]
}

const dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

const methodNames: Record<string, string> = {
	password: 'a password',
	passkey: 'a passkey',
	github: 'GitHub',
	google: 'Google',
}

const providerNames: Record<string, string> = { github: 'GitHub', google: 'Google' }

const actionLabels: Record<string, string> = {
	signed_out_elsewhere: 'Signed out on the other devices',
	email_verified: 'Verified the email',
	password_reset: 'Reset the password',
	passkey_added: 'Added a passkey',
	passkey_removed: 'Removed a passkey',
	authenticator_added: 'Added an authenticator app',
	authenticator_removed: 'Removed the authenticator app',
	recovery_codes_created: 'Made new recovery codes',
	deactivated: 'Deactivated by an admin',
	reactivated: 'Reactivated by an admin',
	promoted: 'Made an admin by the operator',
	demoted: 'Removed from the admins by the operator',
	second_factors_reset: 'Second factors removed by the operator',
}

/**
 * Gives the text for one event. An action that the gateway adds later shows its
 * raw name, so the table never hides an event.
 *
 * @internal
 */
function describe({ action, detail }: Activity): string {
	const name = detail ? (providerNames[detail] ?? detail) : ''

	switch (action) {
		case 'signed_in':
			return detail ? `Signed in with ${methodNames[detail] ?? detail}` : 'Signed in'
		case 'account_connected':
			return `Connected a ${name} account`
		case 'account_disconnected':
			return `Disconnected a ${name} account`
		default:
			return actionLabels[action] ?? action
	}
}

/**
 * The recent activity of one account: the sign-ins, the changes to how the
 * account signs in, and the changes that an admin or the operator made.
 */
export function ActivityTable({ activity }: ActivityTableProps) {
	if (activity.length === 0) return <Text>No activity yet.</Text>

	return (
		<Table>
			<TableHead>
				<TableRow>
					<TableHeader>Activity</TableHeader>
					<TableHeader>IP address</TableHeader>
					<TableHeader>Time</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{activity.map((event) => (
					<TableRow key={event.id}>
						<TableCell>{describe(event)}</TableCell>
						<TableCell>{event.ip ?? ''}</TableCell>
						<TableCell>
							{new Date(event.created_at).toLocaleString(undefined, dateFormat)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
