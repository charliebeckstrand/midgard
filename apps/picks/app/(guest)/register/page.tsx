import { getTurnstileSiteKey } from 'auth'
import { RegisterPage } from 'shared/auth'

/**
 * Register page. When the gateway has Cloudflare Turnstile, the page shows its
 * check, and the gateway refuses a sign-up without it.
 */
export default async function Register() {
	return <RegisterPage turnstileSiteKey={await getTurnstileSiteKey()} />
}
