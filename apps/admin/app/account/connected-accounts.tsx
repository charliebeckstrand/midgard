'use client'

import { useState } from 'react'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import type { Identity, Provider } from './account-api'
import { useIdentities, useUnlinkIdentity } from './account-queries'

type ConnectedAccountsProps = {
	/** The providers that the gateway has set up. */
	providers: Provider[]
	identities: Identity[]
	/** The `?error=` code that a connect came back with, if any. */
	connectError?: string
}

const providerNames: Record<Provider, string> = { github: 'GitHub', google: 'Google' }

/** The messages of the `?error=` codes that a connect comes back with. */
const connectErrors: Record<string, string> = {
	identity_in_use: 'That account is connected to another user.',
	provider_linked: 'Disconnect your other account of that provider first.',
	sign_in_again: 'Sign in again to connect an account.',
	oauth_unavailable: 'That sign-in method is not available.',
	oauth_failed: 'Connecting the account did not complete. Please try again.',
}

/**
 * GitHub and Google accounts of the signed-in user.
 *
 * @remarks
 * "Connect" leaves the app for the provider, and the gateway sends the browser
 * back to `/account`, or to `/account?error=<code>` when the connect fails. The
 * gateway accepts a connect or a disconnect only soon after the sign-in, and
 * keeps the last way to sign in. A disconnect asks for confirmation first.
 */
export function ConnectedAccounts({
	providers,
	identities: initialIdentities,
	connectError,
}: ConnectedAccountsProps) {
	const { data: identities } = useIdentities(initialIdentities)
	const unlink = useUnlinkIdentity()
	const [unlinking, setUnlinking] = useState<Provider | null>(null)

	// A provider that the gateway turned off still shows while an account of it is connected.
	const shown = [
		...new Set<Provider>([...providers, ...identities.map((identity) => identity.provider)]),
	]

	if (shown.length === 0) return null

	const error =
		unlink.error?.message ??
		(connectError && (connectErrors[connectError] ?? connectErrors.oauth_failed))

	return (
		<Stack gap="sm">
			<Heading level={3}>Connected accounts</Heading>

			{error && <Text tone="error">{error}</Text>}

			{shown.map((provider) => {
				const identity = identities.find((item) => item.provider === provider)

				return (
					<div key={provider} className="flex items-center justify-between gap-2">
						<div>
							<Text className="font-medium">{providerNames[provider]}</Text>
							<Text>{identity ? (identity.email ?? 'Connected') : 'Not connected'}</Text>
						</div>
						{identity ? (
							<Button
								variant="outline"
								disabled={unlink.isPending}
								onClick={() => setUnlinking(provider)}
							>
								Disconnect
							</Button>
						) : (
							<Button
								variant="outline"
								disabled={!providers.includes(provider)}
								// A full page load: the gateway answers with a redirect to the provider.
								onClick={() =>
									window.location.assign(`/auth/oauth/${provider}/start?link=1&return_to=/account`)
								}
							>
								Connect
							</Button>
						)}
					</div>
				)
			})}

			<Confirm
				open={unlinking !== null}
				onOpenChange={(open) => !open && setUnlinking(null)}
				onConfirm={() => {
					if (unlinking) unlink.mutate(unlinking)

					setUnlinking(null)
				}}
				title={`Disconnect ${unlinking ? providerNames[unlinking] : ''}?`}
				description="You cannot sign in with this account after you disconnect it."
				confirm={{ label: 'Disconnect', color: 'red' }}
			/>
		</Stack>
	)
}
