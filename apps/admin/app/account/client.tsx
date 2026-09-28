'use client'

import type { User } from 'auth'
import { useState } from 'react'
import { signOut } from 'shared/auth'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Heading } from 'ui/heading'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { Stack } from 'ui/structure/stack'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui/table'
import { Text } from 'ui/text'
import { type Activity, ActivityTable } from '@/components/activity-table'
import type { Factors, Identity, Passkey, Provider } from './account-api'
import {
	useAddPasskey,
	useFactors,
	usePasskeys,
	useRemovePasskey,
	useSendVerificationEmail,
} from './account-queries'
import { ConnectedAccounts } from './connected-accounts'
import { TwoStep } from './two-step'
import { YourData } from './your-data'

type AccountClientProps = {
	user: User
	passkeys: Passkey[]
	factors: Factors
	identities: Identity[]
	/** The recent activity of the user, newest first. */
	activity: Activity[]
	/** The providers that the gateway has set up. */
	providers: Provider[]
	/** The `?error=` code that a connect came back with, if any. */
	connectError?: string
}

const dateFormat: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

/**
 * Account page: the email notice, the passkeys, authenticator app, recovery
 * codes, GitHub and Google accounts, recent activity, and data of the
 * signed-in user, and sign-out.
 *
 * @remarks
 * The server page seeds the `usePasskeys`, `useFactors`, and `useIdentities` queries. The user owns the passkeys,
 * and no admin can change them. The gateway accepts a change only soon after
 * the sign-in, and shows why when it refuses. A removal asks for confirmation
 * first.
 */
export function AccountClient({
	user,
	passkeys: initialPasskeys,
	factors: initialFactors,
	identities,
	activity,
	providers,
	connectError,
}: AccountClientProps) {
	const { data: passkeys } = usePasskeys(initialPasskeys)
	const { data: factors } = useFactors(initialFactors)
	const add = useAddPasskey()
	const remove = useRemovePasskey()
	const sendLink = useSendVerificationEmail()
	const [removing, setRemoving] = useState<Passkey | null>(null)

	const error = add.error ?? remove.error ?? sendLink.error

	return (
		<AuthLayout>
			<Stack gap="lg" className="w-full sm:max-w-lg">
				<div>
					<Heading>Account</Heading>
					<Text>{user.email}</Text>
				</div>

				{!user.is_verified && (
					<Alert
						color="amber"
						variant="soft"
						title="Your email is not verified."
						description={
							sendLink.isSuccess
								? 'We sent you a new link. Open it to verify your email.'
								: 'Open the link that we sent you when you signed up, or get a new one.'
						}
						actions={
							<Button
								variant="outline"
								disabled={sendLink.isPending}
								onClick={() => sendLink.mutate()}
							>
								Send a new link
							</Button>
						}
						className="w-full"
					/>
				)}

				{error && <Text tone="error">{error.message}</Text>}

				<TwoStep factors={factors} admin={user.roles.includes('admin')}>
					<Heading level={3}>Passkeys</Heading>

					{passkeys.length === 0 ? (
						<Alert color="amber" variant="soft" title="You have no passkeys." className="w-full" />
					) : (
						<Table>
							<TableHead>
								<TableRow>
									<TableHeader>Passkey</TableHeader>
									<TableHeader>Added</TableHeader>
									<TableHeader></TableHeader>
								</TableRow>
							</TableHead>
							<TableBody>
								{passkeys.map((passkey, index) => (
									<TableRow key={passkey.id}>
										<TableCell>Passkey {index + 1}</TableCell>
										<TableCell>
											{new Date(passkey.created_at).toLocaleString(undefined, dateFormat)}
										</TableCell>
										<TableCell>
											<Button
												variant="outline"
												disabled={remove.isPending}
												onClick={() => setRemoving(passkey)}
											>
												Remove
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}

					<div className="flex flex-wrap gap-2">
						<Button color="blue" disabled={add.isPending} onClick={() => add.mutate()}>
							Add a passkey
						</Button>
						<Button variant="outline" onClick={signOut}>
							Sign out
						</Button>
					</div>
				</TwoStep>

				<ConnectedAccounts
					providers={providers}
					identities={identities}
					connectError={connectError}
				/>

				<Stack gap="sm">
					<Heading level={3}>Recent activity</Heading>

					<ActivityTable activity={activity} />
				</Stack>

				<YourData admin={user.roles.includes('admin')} />

				{user.roles.includes('admin') && (
					<Text className="text-center">
						<Link href="/" underline>
							Back to the dashboard
						</Link>
					</Text>
				)}
			</Stack>

			<Confirm
				open={removing !== null}
				onOpenChange={(open) => !open && setRemoving(null)}
				onConfirm={() => {
					if (removing) remove.mutate(removing.id)

					setRemoving(null)
				}}
				title="Remove this passkey?"
				description="You cannot sign in with this passkey after you remove it."
				confirm={{ label: 'Remove', color: 'red' }}
			/>
		</AuthLayout>
	)
}
