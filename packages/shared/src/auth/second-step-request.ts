import type { Paths, Schema } from 'auth'
import createClient from 'openapi-fetch'

/** A way to give the second step, as the gateway names it. */
export type SecondFactorMethod = 'passkey' | 'totp' | 'recovery_code'

/** The second factors of a user, as the gateway's `GET /auth/mfa` reports them. */
export type SecondFactors = Schema<'Factors'>

/**
 * Returns the methods that can give the second step, in the order of the
 * gateway. Recovery codes count only next to a passkey or an authenticator app.
 */
export function secondFactorMethods({
	passkeys,
	totp,
	recovery_codes,
}: SecondFactors): SecondFactorMethod[] {
	const methods: SecondFactorMethod[] = []

	if (passkeys > 0) methods.push('passkey')

	if (totp) methods.push('totp')

	if (methods.length > 0 && recovery_codes > 0) methods.push('recovery_code')

	return methods
}

type OpenDialog = (methods: SecondFactorMethod[]) => Promise<boolean>

// Opens the dialog of the mounted `SecondStepDialog`, and resolves to `true`
// when the user gives the second step.
let openDialog: OpenDialog | undefined

/**
 * Sets the function that opens the dialog of the second step, or clears it.
 *
 * @internal
 */
export function setSecondStepDialog(open: OpenDialog | undefined): void {
	openDialog = open
}

// The check in progress, which calls at the same time share.
let current: Promise<boolean> | undefined

// The check does not use `fetchWithSecondStep`, because that function waits on the check.
// The client reads the global `fetch` at each call.
const gateway = createClient<Paths>({ fetch: (request) => fetch(request) })

async function checkSecondStep(): Promise<boolean> {
	const { data: session } = await gateway.GET('/auth/session')

	if (!session) return false

	if (session.two_step) return true

	const { data: factors } = await gateway.GET('/auth/mfa')

	if (!factors) return false

	const methods = secondFactorMethods(factors)

	// The gateway asks a user without a second factor for no second step.
	if (methods.length === 0) return true

	return openDialog ? openDialog(methods) : false
}

/**
 * Makes sure that the current session passed the second step, and resolves to
 * `true` when it did. When the session did not, and the user has a second
 * factor, it opens the `SecondStepDialog`.
 *
 * @remarks
 * Use it before a full page load that needs the second step, such as the
 * connect of a GitHub account. For a request, use {@link fetchWithSecondStep}.
 * It resolves to `false` when the user closes the dialog, or when no dialog is
 * mounted.
 */
export function ensureSecondStep(): Promise<boolean> {
	current ??= checkSecondStep().finally(() => {
		current = undefined
	})

	return current
}

/**
 * Sends a same-origin request. When the gateway answers `403` with the code
 * `second_step_required`, it calls {@link ensureSecondStep}, and after the
 * second step it sends the request again.
 *
 * @remarks
 * The `fetch` of the `bifrost` client. When the user does not give the second
 * step, the first response comes back.
 */
export async function fetchWithSecondStep(request: Request): Promise<Response> {
	const res = await fetch(request.clone())

	if (res.status !== 403) return res

	const body = (await res
		.clone()
		.json()
		.catch(() => null)) as { code?: string } | null

	if (body?.code !== 'second_step_required' || !(await ensureSecondStep())) return res

	return fetch(request)
}
