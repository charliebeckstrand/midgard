import { getSignInProviders } from 'auth'
import { LoginPage } from 'shared/auth'

/**
 * The page reads the providers before it renders, because a fallback form
 * would change when the buttons arrive. Thus a navigation from another sign-in
 * page blocks.
 */
export const instant = false

/**
 * Sign-in page. The page shows a button for each provider that the gateway has
 * set up. After the sign-in, an admin gives the second step at `/verify`.
 */
export default async function Login() {
	return <LoginPage providers={await getSignInProviders()} />
}
