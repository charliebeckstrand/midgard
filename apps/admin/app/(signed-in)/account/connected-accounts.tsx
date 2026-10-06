'use client'

import { ensureSecondStep, oauthStartPath, signInProviderNames } from 'shared/auth'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from 'ui/card'
import { useConfirm } from 'ui/confirm'
import { List, ListDescription, ListItem, ListLabel } from 'ui/list'
import { Stack } from 'ui/structure/stack'
import type { Identity, Provider } from './account-api'
import { useIdentities, useUnlinkIdentity } from './account-queries'

type ConnectedAccountsProps = {
	/** The providers that the gateway has set up. */
	providers: Provider[]
	identities: Identity[]
	/** The `?error=` code that a connect came back with, if any. */
	connectError?: string
}

/** The messages of the `?error=` codes that a connect comes back with. */
const connectErrors: Record<string, string> = {
	identity_in_use: 'That account is connected to another user.',
	provider_linked: 'Disconnect your other account of that provider first.',
	sign_in_again: 'Sign in again to connect an account.',
	second_step_required: 'Confirm that it is you to connect an account.',
	email_unverified: 'Verify your email to connect an account.',
	oauth_unavailable: 'That sign-in method is not available.',
	oauth_failed: 'Connecting the account did not complete. Please try again.',
}

/**
 * Card of the GitHub and Google accounts of the signed-in user.
 *
 * @remarks
 * "Connect" leaves the app for the provider, and the gateway sends the browser
 * back to `/account`, or to `/account?error=<code>` when the connect fails. The
 * gateway accepts a connect or a disconnect only with a verified email, soon
 * after the sign-in, and after the second step. It keeps the last way to sign in. Before a connect,
 * the page asks for the second step when the session did not pass it. A disconnect asks for confirmation first.
 */
export function ConnectedAccounts({
	providers,
	identities: initialIdentities,
	connectError,
}: ConnectedAccountsProps) {
	const { data: identities } = useIdentities(initialIdentities)
	const unlink = useUnlinkIdentity()
	const confirm = useConfirm()

	// A provider that the gateway turned off still shows while an account of it is connected.
	const shown = [
		...new Set<Provider>([...providers, ...identities.map((identity) => identity.provider)]),
	]

	if (shown.length === 0) return null

	const error =
		unlink.error?.message ??
		(connectError && (connectErrors[connectError] ?? connectErrors.oauth_failed))

	return (
		<Card>
			<CardHeader>
				<CardTitle level={2}>Connected accounts</CardTitle>
				<CardDescription>
					Sign in with one of these accounts in place of your password.
				</CardDescription>
			</CardHeader>

			<Stack gap="md">
				{error && <Alert severity="error" title={error} />}

				<List
					items={shown}
					getKey={(provider) => provider}
					variant="outline"
					sortable={false}
					aria-label="Connected accounts"
				>
					{(provider) => {
						const identity = identities.find((item) => item.provider === provider)

						return (
							<ListItem
								suffix={
									identity ? (
										<Button
											variant="outline"
											size="sm"
											disabled={unlink.isPending}
											onClick={async () => {
												const confirmed = await confirm({
													title: `Disconnect ${signInProviderNames[provider]}?`,
													description:
														'You cannot sign in with this account after you disconnect it.',
													confirm: { label: 'Disconnect', color: 'red' },
												})

												if (confirmed) unlink.mutate(provider)
											}}
										>
											Disconnect
										</Button>
									) : (
										<Button
											variant="outline"
											size="sm"
											disabled={!providers.includes(provider)}
											// A full page load: the gateway answers with a redirect to the provider.
											onClick={async () => {
												if (!(await ensureSecondStep())) return

												window.location.assign(
													oauthStartPath(provider, { link: true, returnTo: '/account' }),
												)
											}}
										>
											Connect
										</Button>
									)
								}
							>
								<ListLabel>{signInProviderNames[provider]}</ListLabel>
								<ListDescription>
									{identity ? (identity.email ?? 'Connected') : 'Not connected'}
								</ListDescription>
							</ListItem>
						)
					}}
				</List>
			</Stack>
		</Card>
	)
}
