import { cookies } from 'next/headers'
import { redirect, unstable_rethrow } from 'next/navigation'
import { cache } from 'react'
import { bifrost } from './fetch'

// The gateway sets the ticket with the `__Host-` prefix, like the session.
const TICKET_COOKIE = '__Host-mfa'

/** A way to finish a sign-in that waits on its second step, as the gateway names it. */
export type SecondFactorMethod = 'passkey' | 'totp' | 'recovery_code'

/**
 * Returns the methods that can finish the pending sign-in, or `undefined` when
 * none is pending.
 *
 * @remarks
 * The password step leaves a `__Host-mfa` ticket cookie. Without the cookie,
 * the call sends no request. With it, the gateway's `GET /auth/login/mfa`
 * checks the ticket without a spent attempt. A spent or expired ticket gets a
 * `410`. Each failure except a `410` goes to the log. React `cache` wraps it,
 * so repeat calls in one request hit the gateway once.
 */
export const getSecondStep = cache(async (): Promise<SecondFactorMethod[] | undefined> => {
	try {
		if (!(await cookies()).has(TICKET_COOKIE)) return undefined

		const res = await bifrost('/auth/login/mfa')

		if (res.ok) {
			const { methods } = (await res.json()) as { methods: SecondFactorMethod[] }

			return methods.length > 0 ? methods : undefined
		}

		if (res.status !== 410) console.error(`auth: GET /auth/login/mfa failed (${res.status})`)
	} catch (error) {
		// A prerender reads `cookies()`, and Next throws to mark the route dynamic. Let it through.
		unstable_rethrow(error)

		console.error('auth: GET /auth/login/mfa threw', error)
	}

	return undefined
})

/**
 * Returns the methods that can finish the pending sign-in, or redirects to `/login`.
 *
 * @remarks
 * Call it from the page of the second step. A direct visit, or a reload after
 * the ticket ends, goes back to `/login`. A reload while the ticket is live
 * stays on the second step.
 */
export async function requireSecondStep(): Promise<SecondFactorMethod[]> {
	const methods = await getSecondStep()

	if (!methods) redirect('/login')

	return methods
}

/**
 * Redirects to `/login/verify` when a sign-in waits on its second step.
 *
 * @remarks
 * Call it from the sign-in page. Then a user with a live ticket cannot start a
 * second password step by accident. The second step has a way to cancel.
 */
export async function forwardToSecondStep(): Promise<void> {
	if (await getSecondStep()) redirect('/login/verify')
}
