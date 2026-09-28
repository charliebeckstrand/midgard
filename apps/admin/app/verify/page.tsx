import { bifrost, requireGateway, requireSession } from 'auth'
import { redirect } from 'next/navigation'
import { secondFactorMethods, VerifyPage } from 'shared/auth'

/**
 * The page reads the session and the second factors before it renders, so a navigation into it waits for the
 * gateway. This lets the route block. The read moves into a `<Suspense>`
 * boundary in a later change.
 */
export const instant = false

/**
 * Page of the second step. `requireAdmin` sends an admin session here until it
 * passes the second step.
 *
 * @remarks
 * A session that passed the second step goes to `/`. A user without a second
 * factor goes to `/account`, where the user adds a passkey. The first factor
 * passes the second step.
 */
export default async function Verify() {
	const session = await requireSession()

	if (session.two_step) redirect('/')

	// A failed read throws, so an outage does not send the admin to `/account`.
	const factors = await requireGateway('/auth/mfa', () => bifrost.GET('/auth/mfa'))

	const methods = factors ? secondFactorMethods(factors) : []

	if (methods.length === 0) redirect('/account')

	return <VerifyPage methods={methods} />
}
