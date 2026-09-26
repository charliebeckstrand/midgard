import { forwardToSecondStep } from 'auth'
import { LoginPage } from 'shared/auth'

/**
 * Sign-in page. A sign-in that waits on its second step goes on to
 * `/login/verify`, where the user finishes it or cancels it.
 */
export default async function Login() {
	await forwardToSecondStep()

	return <LoginPage />
}
