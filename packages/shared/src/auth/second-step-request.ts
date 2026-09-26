/** A way to give the second step, as the gateway names it. */
export type SecondFactorMethod = 'passkey' | 'totp' | 'recovery_code'

/** The second factors of a user, as the gateway's `GET /auth/mfa` reports them. */
export type SecondFactors = {
	passkeys: number
	totp: boolean
	recovery_codes: number
}

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

async function checkSecondStep(): Promise<boolean> {
	const session = await fetch('/auth/session')

	if (!session.ok) return false

	if (((await session.json()) as { two_step: boolean }).two_step) return true

	const factors = await fetch('/auth/mfa')

	if (!factors.ok) return false

	const methods = secondFactorMethods((await factors.json()) as SecondFactors)

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
 * When the user does not give the second step, the first response comes back.
 * Only a request with a body that can be sent again, such as a string, can use
 * it.
 */
export async function fetchWithSecondStep(input: string, init?: RequestInit): Promise<Response> {
	const res = await fetch(input, init)

	if (res.status !== 403) return res

	const body = (await res
		.clone()
		.json()
		.catch(() => null)) as { code?: string } | null

	if (body?.code !== 'second_step_required' || !(await ensureSecondStep())) return res

	return fetch(input, init)
}
