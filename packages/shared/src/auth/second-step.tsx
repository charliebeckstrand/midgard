'use client'

import { startAuthentication } from '@simplewebauthn/browser'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from 'ui/button'
import { Dialog, DialogBody, DialogHeader, DialogTitle } from 'ui/dialog'
import { Field, Fieldset, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { AuthLayout } from 'ui/layouts'
import { Text } from 'ui/text'
import { chain, required } from './form-validators'
import { type SecondFactorMethod, setSecondStepDialog } from './second-step-request'
import { useLeaving } from './use-leaving'

/** The proof that `/auth/session/verify` accepts. */
type SecondFactorProof =
	| { totp: string }
	| { recovery_code: string }
	| { passkey: Awaited<ReturnType<typeof startAuthentication>> }

type SecondStepProps = {
	/** The methods that the user has. */
	methods: SecondFactorMethod[]
	/** Runs after the gateway accepts the proof. */
	onVerified: () => void
	/** Runs when the gateway ends the session after too many wrong tries. */
	onExpired: () => void
	/** Runs when the user does not give the second step. */
	onCancel: () => void
	/** The label of the cancel button. */
	cancelLabel: string
}

type CodeValues = { code: string }

const passkeyFailed = 'The passkey check did not complete. Please try again.'

/**
 * Form of the second step: a code from an authenticator app, a recovery code,
 * or a passkey. It sends the proof to `/auth/session/verify`, which marks the
 * current session as past the second step.
 *
 * @internal
 * @remarks
 * The form shows the authenticator app first when the user has one. A recovery
 * code is the fallback, and the user picks it with a link.
 */
function SecondStep({ methods, onVerified, onExpired, onCancel, cancelLabel }: SecondStepProps) {
	const hasTotp = methods.includes('totp')

	const hasRecovery = methods.includes('recovery_code')

	const [useRecovery, setUseRecovery] = useState(!hasTotp && !methods.includes('passkey'))

	const [error, setError] = useState('')

	const [leaving, leave] = useLeaving()

	const showCode = useRecovery || hasTotp

	async function submit(proof: SecondFactorProof) {
		try {
			const res = await fetch('/auth/session/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(proof),
			})

			// The form stays disabled until the next page or the closed dialog replaces it.
			if (res.ok) return leave(onVerified)

			if (res.status === 410) return leave(onExpired)

			const data = await res.json().catch(() => null)

			setError(data?.message || 'That code was not accepted. Please try again.')
		} catch {
			setError('An unexpected error occurred. Please try again later.')
		}
	}

	const handleSubmit: FormSubmitHandler<CodeValues> = async ({ code }) => {
		await submit(useRecovery ? { recovery_code: code.trim() } : { totp: code.replace(/\s/g, '') })
	}

	// The gateway names only the passkeys of this user. A cancel in the browser throws.
	async function usePasskey() {
		try {
			const options = await fetch('/auth/session/verify/options', { method: 'POST' })

			if (!options.ok) {
				const data = await options.json().catch(() => null)

				setError(data?.message || passkeyFailed)

				return
			}

			await submit({ passkey: await startAuthentication({ optionsJSON: await options.json() }) })
		} catch {
			setError(passkeyFailed)
		}
	}

	return (
		<Fieldset disabled={leaving} className="grid gap-6">
			{error && <Text tone="error">{error}</Text>}

			{showCode && (
				<Form<CodeValues>
					key={useRecovery ? 'recovery' : 'totp'}
					defaultValues={{ code: '' }}
					validate={{ code: chain(required()) }}
					onSubmit={handleSubmit}
					className="grid gap-6"
				>
					<Field>
						<Label>{useRecovery ? 'Recovery code' : 'Code from your authenticator app'}</Label>
						{useRecovery ? (
							<Input name="code" autoComplete="off" autoCapitalize="none" spellCheck={false} />
						) : (
							<Input name="code" inputMode="numeric" autoComplete="one-time-code" />
						)}
						<Message name="code" />
					</Field>

					<Button type="submit" className="w-full">
						Continue
					</Button>
				</Form>
			)}

			{methods.includes('passkey') && (
				<Button
					type="button"
					variant={showCode ? 'outline' : undefined}
					className="w-full"
					onClick={usePasskey}
				>
					Use a passkey
				</Button>
			)}

			{hasRecovery && !useRecovery && (
				<Button
					type="button"
					variant="plain"
					color="blue"
					className="justify-self-center"
					onClick={() => setUseRecovery(true)}
				>
					Use a recovery code
				</Button>
			)}

			{useRecovery && hasTotp && (
				<Button
					type="button"
					variant="plain"
					color="blue"
					className="justify-self-center"
					onClick={() => setUseRecovery(false)}
				>
					Use your authenticator app
				</Button>
			)}

			<Button type="button" variant="plain" className="justify-self-center" onClick={onCancel}>
				{cancelLabel}
			</Button>
		</Fieldset>
	)
}

type VerifyPageProps = {
	/** The methods that the user has, from `secondFactorMethods`. */
	methods: SecondFactorMethod[]
}

/**
 * Page of the second step, at `/verify`. It goes to `/` on success.
 *
 * @remarks
 * The page itself must call `requireSession` from `auth` on the server, and
 * send a session that passed the second step, or a user without a second
 * factor, somewhere else. After the fifth wrong try, the gateway ends the
 * session, and the page goes to `/login?expired=true`. "Sign out" ends the
 * session.
 */
export function VerifyPage({ methods }: VerifyPageProps) {
	const router = useRouter()

	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' }).catch(() => {})

		router.replace('/login')
	}

	return (
		<AuthLayout>
			<div className="grid gap-6 w-full sm:max-w-sm p-6">
				<Heading className="text-center">Confirm that it is you</Heading>

				<SecondStep
					methods={methods}
					onVerified={() => router.replace('/')}
					onExpired={() => router.replace('/login?expired=true')}
					onCancel={signOut}
					cancelLabel="Sign out"
				/>
			</div>
		</AuthLayout>
	)
}

type Pending = {
	methods: SecondFactorMethod[]
	resolve: (verified: boolean) => void
}

/**
 * Dialog of the second step, for `ensureSecondStep` and
 * `fetchWithSecondStep`. Mount it one time, in the providers of the app.
 *
 * @remarks
 * After the second step, the dialog refreshes the Server Components, so they
 * read the new session. After the fifth wrong try, the gateway ends the
 * session, and the page goes to `/login?expired=true`.
 */
export function SecondStepDialog() {
	const router = useRouter()

	const [pending, setPending] = useState<Pending>()

	useEffect(() => {
		setSecondStepDialog(
			(methods) =>
				new Promise<boolean>((resolve) => {
					setPending({
						methods,
						resolve: (verified) => {
							setPending(undefined)

							if (verified) router.refresh()

							resolve(verified)
						},
					})
				}),
		)

		return () => setSecondStepDialog(undefined)
	}, [router])

	return (
		<Dialog open={pending !== undefined} onOpenChange={(open) => open || pending?.resolve(false)}>
			<DialogHeader>
				<DialogTitle>Confirm that it is you</DialogTitle>
			</DialogHeader>

			<DialogBody>
				{pending && (
					<SecondStep
						methods={pending.methods}
						onVerified={() => pending.resolve(true)}
						onExpired={() => window.location.assign('/login?expired=true')}
						onCancel={() => pending.resolve(false)}
						cancelLabel="Cancel"
					/>
				)}
			</DialogBody>
		</Dialog>
	)
}
