import { forwardToSecondStep, getSignInProviders } from 'auth'
import { LoginPage } from 'shared/auth'

/**
 * Sign-in page. A sign-in that waits on its second step goes on to
 * `/login/verify`, where the user finishes it or cancels it. The page shows a
 * button for each provider that the gateway has set up.
 */
export default async function Login() {
	await forwardToSecondStep()

	return <LoginPage providers={await getSignInProviders()} />
}
