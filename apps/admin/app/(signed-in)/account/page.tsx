import { bifrost, getSignInProviders, requireGateway, requireSession } from 'auth'
import { Suspense } from 'react'
import { seed } from 'shared/queries'
import { Card, CardHeader, CardTitle } from 'ui/card'
import { Stack } from 'ui/structure/stack'
import { TextSkeleton } from 'ui/text'
import type { Activity } from '@/components/activity-table'
import { PageHeader } from '@/components/page-header'
import type { Factors, Identity, Passkey } from './account-api'
import { AccountClient } from './client'

/**
 * Fetches the passkeys of the signed-in user from the gateway, server-side.
 *
 * @internal
 * @returns The passkey list. A failed read throws.
 */
async function getPasskeys(): Promise<Passkey[]> {
	const data = await requireGateway('/auth/passkeys', () => bifrost.GET('/auth/passkeys'))

	return data?.data ?? []
}

const noFactors: Factors = { enabled: false, passkeys: 0, totp: false, recovery_codes: 0 }

/**
 * Fetches the second factors of the signed-in user from the gateway, server-side.
 *
 * @internal
 * @returns The factors. A failed read throws, so an outage does not show "no second factor".
 */
async function getFactors(): Promise<Factors> {
	const data = await requireGateway('/auth/mfa', () => bifrost.GET('/auth/mfa'))

	return data ?? noFactors
}

/**
 * Fetches the GitHub and Google accounts of the signed-in user from the
 * gateway, server-side.
 *
 * @internal
 * @returns The accounts. A failed read throws.
 */
async function getIdentities(): Promise<Identity[]> {
	const data = await requireGateway('/auth/oauth/identities', () =>
		bifrost.GET('/auth/oauth/identities'),
	)

	return data?.identities ?? []
}

/**
 * Fetches the recent activity of the signed-in user from the gateway, server-side.
 *
 * @internal
 * @returns The events, newest first. A failed read throws.
 */
async function getActivity(): Promise<Activity[]> {
	const data = await requireGateway('/auth/activity', () => bifrost.GET('/auth/activity'))

	return data?.data ?? []
}

type SearchParams = Promise<{ error?: string | string[] }>

/**
 * Reads the session and the account data, and renders the account page.
 *
 * @internal
 */
async function Account({ searchParams }: { searchParams: SearchParams }) {
	const { user } = await requireSession()

	const [passkeys, factors, identities, activity, providers, { error }] = await Promise.all([
		getPasskeys(),
		getFactors(),
		getIdentities(),
		getActivity(),
		getSignInProviders(),
		searchParams,
	])

	return (
		<AccountClient
			user={user}
			passkeys={seed(passkeys)}
			factors={seed(factors)}
			identities={seed(identities)}
			activity={activity}
			providers={providers}
			connectError={typeof error === 'string' ? error : undefined}
		/>
	)
}

const loadingCards = ['Two-step sign-in', 'Connected accounts', 'Recent activity', 'Your data']

/**
 * The header and the cards of the account page while the data loads, each
 * with a skeleton line.
 *
 * @internal
 */
function AccountLoading() {
	return (
		<Stack gap="xl">
			<PageHeader title="Account" description={<TextSkeleton />} />

			{loadingCards.map((title) => (
				<Card key={title}>
					<CardHeader>
						<CardTitle level={2}>{title}</CardTitle>
					</CardHeader>
					<TextSkeleton />
				</Card>
			))}
		</Stack>
	)
}

/**
 * Account page of each signed-in user. The proxy only finds the cookie, so
 * `requireSession` checks the session, and sends a guest to `/login`.
 *
 * @remarks
 * The header shows the email of the user, so the page reads the session in
 * the boundary. A navigation to the page shows the skeleton at once.
 */
export default function AccountPage({ searchParams }: { searchParams: SearchParams }) {
	return (
		<Suspense fallback={<AccountLoading />}>
			<Account searchParams={searchParams} />
		</Suspense>
	)
}
