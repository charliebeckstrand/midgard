import { getTurnstileSiteKey } from 'auth'
import { RegisterPage } from 'shared/auth'

/**
 * The page reads the Turnstile site key before it renders, because a fallback
 * form would change when the check arrives. Thus a navigation from another
 * sign-in page blocks.
 */
export const instant = false

/**
 * Register page. When the gateway has Cloudflare Turnstile, the page shows its
 * check, and the gateway refuses a sign-up without it.
 */
export default async function Register() {
	return <RegisterPage turnstileSiteKey={await getTurnstileSiteKey()} />
}
