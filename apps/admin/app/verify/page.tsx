import { bifrost, requireSession } from 'auth'
import { redirect } from 'next/navigation'
import { type SecondFactors, secondFactorMethods, VerifyPage } from 'shared/auth'

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

	const res = await bifrost('/auth/mfa')

	const methods = res.ok ? secondFactorMethods((await res.json()) as SecondFactors) : []

	if (methods.length === 0) redirect('/account')

	return <VerifyPage methods={methods} />
}
