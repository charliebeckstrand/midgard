import { bifrost, getSession, getSignInProviders, requireGateway } from 'auth'
import { redirect } from 'next/navigation'
import { LoginPage, secondFactorMethods } from 'shared/auth'

/**
 * The page reads the session to select the sign-in, the second step, or a
 * redirect. The route blocks, so that no form shows before a redirect.
 */
export const instant = false

/**
 * Page of the sign-in and of the second step. Without a session, it shows the
 * sign-in, with a button for each provider that the gateway has set up. The
 * admin app has no register or forgot-password page, so the page shows no
 * link to one.
 *
 * @remarks
 * After a sign-in, the page refreshes and reads the session again, so the
 * admin gives the second step here, before any admin page renders. An admin
 * session without the second step gets its form. `requireAdmin` also sends
 * such a session here, for example after a GitHub sign-in.
 *
 * A signed-in user that is not an admin goes to `/account`. An admin session
 * that passed the second step goes to `/`. An admin without a second factor
 * goes to `/account`, where the admin adds a passkey.
 */
export default async function Login() {
	const session = await getSession()

	if (!session) {
		return (
			<LoginPage
				providers={await getSignInProviders()}
				registration={false}
				passwordReset={false}
				secondStep
			/>
		)
	}

	if (!session.user.roles.includes('admin')) redirect('/account')

	if (session.two_step) redirect('/')

	// A failed read throws, so an outage does not send the admin to `/account`.
	const factors = await requireGateway('/auth/mfa', () => bifrost.GET('/auth/mfa'))

	const methods = factors ? secondFactorMethods(factors) : []

	if (methods.length === 0) redirect('/account')

	return <LoginPage secondStep methods={methods} />
}
