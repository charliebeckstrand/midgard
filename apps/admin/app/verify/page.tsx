import { readGateway, requireSession } from 'auth'
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

	const factors = await readGateway<SecondFactors>('/auth/mfa')

	const methods = factors ? secondFactorMethods(factors) : []

	if (methods.length === 0) redirect('/account')

	return <VerifyPage methods={methods} />
}
