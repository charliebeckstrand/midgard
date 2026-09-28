'use client'

import { KeyIcon } from '@heroicons/react/20/solid'
import type { User } from 'auth'
import { useState } from 'react'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'
import { Card, CardHeader, CardTitle } from 'ui/card'
import { Confirm } from 'ui/confirm'
import { Icon } from 'ui/icon'
import { List, ListDescription, ListItem, ListLabel } from 'ui/list'
import { Stack } from 'ui/structure/stack'
import { type Activity, ActivityTable } from '@/components/activity-table'
import { PageHeader } from '@/components/page-header'
import type { Factors, Identity, Passkey, Provider } from './account-api'
import {
	useAddPasskey,
	useFactors,
	usePasskeys,
	useRemovePasskey,
	useSendVerificationEmail,
} from './account-queries'
import { ConnectedAccounts } from './connected-accounts'
import { Section } from './section'
import { TwoStep } from './two-step'

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
 * codes, GitHub and Google accounts, and recent activity of the signed-in user.
 * The account menu of the chrome holds sign-out.
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
		<Stack gap="xl">
			<PageHeader title="Account" description={user.email} />

			{!user.is_verified && (
				<Alert
					severity="warning"
					variant="soft"
					title="Your email is not verified."
					description={
						sendLink.isSuccess
							? 'We sent you a new link. Open it to verify your email.'
							: 'Open the link that we sent you when you signed up, or get a new one.'
					}
					actions={
						<Button disabled={sendLink.isPending} onClick={() => sendLink.mutate()}>
							Send a new link
						</Button>
					}
				/>
			)}

			{error && <Alert severity="error" title={error.message} />}

			<TwoStep factors={factors} admin={user.roles.includes('admin')}>
				<Section
					title="Passkeys"
					description={
						passkeys.length === 0
							? 'You have no passkeys. A passkey signs you in with your device.'
							: 'Each passkey signs you in with your device.'
					}
					action={
						<Button
							variant="outline"
							color={passkeys.length === 0 ? 'blue' : undefined}
							disabled={add.isPending}
							onClick={() => add.mutate()}
						>
							Add
						</Button>
					}
				>
					{passkeys.length > 0 && (
						<List
							items={passkeys}
							getKey={(passkey) => passkey.id}
							variant="outline"
							sortable={false}
							aria-label="Passkeys"
						>
							{(passkey, index) => (
								<ListItem
									prefix={<Icon icon={<KeyIcon />} />}
									suffix={
										<Button
											variant="plain"
											size="sm"
											disabled={remove.isPending}
											onClick={() => setRemoving(passkey)}
										>
											Remove
										</Button>
									}
								>
									<ListLabel>Passkey {index + 1}</ListLabel>
									<ListDescription>
										Added {new Date(passkey.created_at).toLocaleString(undefined, dateFormat)}
									</ListDescription>
								</ListItem>
							)}
						</List>
					)}
				</Section>
			</TwoStep>

			<ConnectedAccounts
				providers={providers}
				identities={identities}
				connectError={connectError}
			/>

			<Card>
				<CardHeader>
					<CardTitle level={2}>Recent activity</CardTitle>
				</CardHeader>
				<ActivityTable activity={activity} />
			</Card>

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
		</Stack>
	)
}
