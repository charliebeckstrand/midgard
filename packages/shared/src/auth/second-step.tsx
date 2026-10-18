'use client'

import {
	type PublicKeyCredentialRequestOptionsJSON,
	startAuthentication,
} from '@simplewebauthn/browser'
import type { Schema } from 'auth'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Button } from 'ui/button'
import { Dialog, DialogBody, DialogHeader, DialogPanel, DialogTitle } from 'ui/dialog'
import { Field, Fieldset, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Input } from 'ui/input'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { bifrost } from './bifrost'
import { chain, required } from './form-validators'
import type { SecondFactorMethod } from './second-step-request'
import { useLeaving } from './use-leaving'
import { unexpectedError, useServerError } from './use-server-error'

/** The proof that `/auth/session/verify` accepts. */
type SecondFactorProof = Schema<'SecondFactorRequest'>

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
	/** Start the passkey check when the form mounts, if the user has a passkey. */
	startPasskey?: boolean
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
 *
 * With `startPasskey`, the browser asks for the passkey at once. A browser
 * that refuses a passkey check without a click shows an error. The user then
 * clicks "Use a passkey".
 */
export function SecondStep({
	methods,
	onVerified,
	onExpired,
	onCancel,
	cancelLabel,
	startPasskey = false,
}: SecondStepProps) {
	const hasTotp = methods.includes('totp')

	const hasRecovery = methods.includes('recovery_code')

	const intl = useIntl()

	const [usingRecovery, setUsingRecovery] = useState(!hasTotp && !methods.includes('passkey'))

	const [errorAlert, setServerError] = useServerError()

	const [leaving, leave] = useLeaving()

	const showCode = usingRecovery || hasTotp

	async function submit(proof: SecondFactorProof) {
		try {
			const { response, error } = await bifrost.POST('/auth/session/verify', { body: proof })

			// The form stays disabled until the next page or the closed dialog replaces it.
			if (response.ok) return leave(onVerified)

			if (response.status === 410) return leave(onExpired)

			setServerError(error?.message || 'That code was not accepted. Please try again.')
		} catch {
			setServerError(unexpectedError)
		}
	}

	const handleSubmit: FormSubmitHandler<CodeValues> = async ({ code }) => {
		await submit(usingRecovery ? { recovery_code: code.trim() } : { totp: code.replace(/\s/g, '') })
	}

	// The gateway names only the passkeys of this user. A cancel in the browser throws.
	async function checkPasskey() {
		try {
			const { data: options, error } = await bifrost.POST('/auth/session/verify/options')

			if (!options) {
				setServerError(error?.message || passkeyFailed)

				return
			}

			// The gateway passes the options of the browser API through, so its spec names no fields.
			const optionsJSON = options as PublicKeyCredentialRequestOptionsJSON

			await submit({ passkey: await startAuthentication({ optionsJSON }) })
		} catch {
			setServerError(passkeyFailed)
		}
	}

	// The ref keeps the check to one start, also when Strict Mode runs the effect two times.
	const started = useRef(false)

	const startOnMount = useEffectEvent(() => {
		if (!startPasskey || started.current || !methods.includes('passkey')) return

		started.current = true

		void checkPasskey()
	})

	useEffect(() => startOnMount(), [])

	return (
		<Fieldset disabled={leaving}>
			<Stack gap="xl">
				{errorAlert}

				{showCode && (
					<Form<CodeValues>
						key={usingRecovery ? 'recovery' : 'totp'}
						defaultValues={{ code: '' }}
						validate={{ code: chain(required(intl)) }}
						onSubmit={handleSubmit}
					>
						<Stack gap="xl">
							<Field>
								<Label>
									{usingRecovery ? 'Recovery code' : 'Code from your authenticator app'}
								</Label>
								{usingRecovery ? (
									<Input name="code" autoComplete="off" autoCapitalize="none" spellCheck={false} />
								) : (
									<Input name="code" inputMode="numeric" autoComplete="one-time-code" />
								)}
								<Message name="code" />
							</Field>

							<Button type="submit" className="w-full">
								Continue
							</Button>
						</Stack>
					</Form>
				)}

				{methods.includes('passkey') && (
					<Button
						type="button"
						variant={showCode ? 'outline' : undefined}
						className="w-full"
						onClick={checkPasskey}
					>
						Use a passkey
					</Button>
				)}

				{hasRecovery && !usingRecovery && (
					<Button
						type="button"
						variant="plain"
						color="blue"
						className="self-center"
						onClick={() => setUsingRecovery(true)}
					>
						Use a recovery code
					</Button>
				)}

				{usingRecovery && hasTotp && (
					<Button
						type="button"
						variant="plain"
						color="blue"
						className="self-center"
						onClick={() => setUsingRecovery(false)}
					>
						Use your authenticator app
					</Button>
				)}

				<Button type="button" variant="plain" className="self-center" onClick={onCancel}>
					{cancelLabel}
				</Button>
			</Stack>
		</Fieldset>
	)
}

/** A request for the second step, from `ensureSecondStep`. */
export type SecondStepPending = {
	methods: SecondFactorMethod[]
	resolve: (verified: boolean) => void
}

/**
 * Dialog of the second step. The `SecondStepDialog` host loads this module
 * when the gateway first asks for the second step, and then renders it.
 *
 * @internal
 * @remarks
 * The dialog is open while `pending` is set. After the fifth wrong try, the
 * gateway ends the session, and the page goes to `/login?expired=true`.
 */
export function SecondStepPanel({ pending }: { pending: SecondStepPending | undefined }) {
	return (
		<Dialog open={pending !== undefined} onOpenChange={(open) => open || pending?.resolve(false)}>
			<DialogPanel
				// The Cancel button of the form closes the dialog, so it has no Close row.
				footer={null}
			>
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
			</DialogPanel>
		</Dialog>
	)
}
