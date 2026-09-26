'use client'

import { startAuthentication } from '@simplewebauthn/browser'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { Text } from 'ui/text'
import { chain, required } from './form-validators'

/**
 * A way to finish a sign-in, as the gateway names it in the `202` answer of
 * `/auth/login`.
 *
 * @internal
 */
export type SecondFactorMethod = 'passkey' | 'totp' | 'recovery_code'

/**
 * The proof that `/auth/login/mfa` accepts.
 *
 * @internal
 */
export type SecondFactorProof =
	| { totp: string }
	| { recovery_code: string }
	| { passkey: Awaited<ReturnType<typeof startAuthentication>> }

type SecondStepProps = {
	/** The methods that the gateway offers for this user. */
	methods: SecondFactorMethod[]
	/** The message of the last failure, or an empty string. */
	error: string
	/** Sends the proof to the gateway. */
	onSubmit: (proof: SecondFactorProof) => Promise<void>
	/** Shows the message of a failure that did not come from the gateway. */
	onError: (message: string) => void
	/** Goes back to the password step. */
	onCancel: () => void
}

type CodeValues = { code: string }

/**
 * Second step of a sign-in: a code from an authenticator app, a recovery code,
 * or a passkey.
 *
 * @internal
 * @remarks
 * The form shows the authenticator app first when the user has one. A recovery
 * code is the fallback, and the user picks it with a link. The gateway keeps
 * the sign-in for five minutes and five attempts, and the login page goes back
 * to the password step after that.
 */
export function SecondStep({ methods, error, onSubmit, onError, onCancel }: SecondStepProps) {
	const hasTotp = methods.includes('totp')

	const hasRecovery = methods.includes('recovery_code')

	const [useRecovery, setUseRecovery] = useState(!hasTotp && !methods.includes('passkey'))

	const showCode = useRecovery || hasTotp

	const handleSubmit: FormSubmitHandler<CodeValues> = async ({ code }) => {
		await onSubmit(useRecovery ? { recovery_code: code.trim() } : { totp: code.replace(/\s/g, '') })
	}

	// The gateway names only the passkeys of this user. A cancel in the browser throws.
	async function usePasskey() {
		try {
			const options = await fetch('/auth/login/mfa/options', { method: 'POST' })

			if (!options.ok) {
				const data = await options.json().catch(() => null)

				onError(data?.message || 'Passkey sign-in did not complete. Please try again.')

				return
			}

			const passkey = await startAuthentication({ optionsJSON: await options.json() })

			await onSubmit({ passkey })
		} catch {
			onError('Passkey sign-in did not complete. Please try again.')
		}
	}

	return (
		<div className="grid gap-6 w-full sm:max-w-sm p-6">
			<Heading className="text-center">Two-step sign-in</Heading>

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
				<Button type="button" variant="plain" onClick={() => setUseRecovery(true)}>
					Use a recovery code
				</Button>
			)}

			{useRecovery && hasTotp && (
				<Button type="button" variant="plain" onClick={() => setUseRecovery(false)}>
					Use your authenticator app
				</Button>
			)}

			<Button type="button" variant="plain" onClick={onCancel}>
				Back to sign in
			</Button>
		</div>
	)
}
