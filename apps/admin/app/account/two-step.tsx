'use client'

import { type ReactNode, useState } from 'react'
import { Button } from 'ui/button'
import { Code } from 'ui/code'
import { Confirm } from 'ui/confirm'
import { CopyButton } from 'ui/copy-button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import type { Factors, TotpSetup } from './account-api'
import {
	useConfirmTotp,
	useGenerateRecoveryCodes,
	useRemoveTotp,
	useStartTotpSetup,
} from './account-queries'
import { QrCode } from './qr-code'

type TwoStepProps = {
	factors: Factors
	/** Whether the user is an admin, who must keep a second factor. */
	admin: boolean
	/** The passkeys section, which shows under the status and before the app. */
	children: ReactNode
}

type CodeValues = { code: string }

/**
 * Authenticator app and recovery codes of the signed-in user.
 *
 * @remarks
 * The account page passes its passkeys table as `children`. An authenticator app
 * stays off until the user types a code from it, so a failed scan never turns
 * on a factor that the user cannot use. Recovery codes show only once, when the
 * gateway makes them.
 */
export function TwoStep({ factors, admin, children }: TwoStepProps) {
	const start = useStartTotpSetup()
	const confirm = useConfirmTotp()
	const removeApp = useRemoveTotp()
	const makeCodes = useGenerateRecoveryCodes()
	const [setup, setSetup] = useState<TotpSetup | null>(null)
	const [codes, setCodes] = useState<string[] | null>(null)
	const [removing, setRemoving] = useState(false)

	const error = start.error ?? confirm.error ?? removeApp.error ?? makeCodes.error

	const handleConfirm: FormSubmitHandler<CodeValues> = async ({ code }) => {
		await confirm.mutateAsync(code.replace(/\s/g, ''))

		setSetup(null)
	}

	return (
		<Stack gap="md">
			<div>
				<Heading level={2}>Two-step sign-in</Heading>
				<Text>
					{factors.enabled
						? 'On. After your password, you also use a passkey or your authenticator app.'
						: 'Off. Add a passkey or an authenticator app to turn it on.'}
					{admin && ' Admin accounts must keep it on.'}
				</Text>
			</div>

			{children}

			{error && <Text tone="error">{error.message}</Text>}

			<Heading level={3}>Authenticator app</Heading>

			{factors.totp ? (
				<Stack gap="sm">
					<Text>Your authenticator app is on.</Text>
					<Button
						variant="outline"
						disabled={removeApp.isPending}
						onClick={() => setRemoving(true)}
					>
						Remove the authenticator app
					</Button>
				</Stack>
			) : setup ? (
				<Stack gap="sm">
					<Text>
						Scan this code with your authenticator app, or type the key into it. Then type the code
						that the app shows.
					</Text>
					<QrCode
						value={setup.uri}
						label="QR code for your authenticator app"
						className="size-48 self-center"
					/>
					<div className="flex items-center gap-2">
						<Code className="break-all">{setup.secret}</Code>
						<CopyButton text={setup.secret} aria-label="Copy the key" />
					</div>
					<Form<CodeValues>
						defaultValues={{ code: '' }}
						validate={{
							code: (value) =>
								/^\d{6}$/.test(value.replace(/\s/g, ''))
									? undefined
									: 'Type the six digits that the app shows',
						}}
						onSubmit={handleConfirm}
						className="grid gap-4"
					>
						<Field>
							<Label>Code from the app</Label>
							<Input name="code" inputMode="numeric" autoComplete="one-time-code" />
							<Message name="code" />
						</Field>
						<Button type="submit" disabled={confirm.isPending}>
							Turn on
						</Button>
					</Form>
					<Button variant="plain" onClick={() => setSetup(null)}>
						Cancel
					</Button>
				</Stack>
			) : (
				<Button
					disabled={start.isPending}
					onClick={() => start.mutate(undefined, { onSuccess: setSetup })}
				>
					Add an authenticator app
				</Button>
			)}

			{factors.enabled && (
				<>
					<Heading level={3}>Recovery codes</Heading>

					{codes ? (
						<Stack gap="sm">
							<Text>
								Keep these codes in a safe place. Each code works once, in place of your passkey or
								app. They do not show again.
							</Text>
							<ul className="grid grid-cols-2 gap-2 font-mono">
								{codes.map((code) => (
									<li key={code}>{code}</li>
								))}
							</ul>
							<CopyButton text={codes.join('\n')} aria-label="Copy the recovery codes" />
							<Button variant="outline" onClick={() => setCodes(null)}>
								I saved them
							</Button>
						</Stack>
					) : (
						<Stack gap="sm">
							<Text>
								{factors.recovery_codes === 0
									? 'You have no recovery codes. Make some, so that you can sign in if you lose your passkey or app.'
									: `You have ${factors.recovery_codes} unused recovery codes.`}
							</Text>
							<Button
								variant={factors.recovery_codes === 0 ? undefined : 'outline'}
								disabled={makeCodes.isPending}
								onClick={() => makeCodes.mutate(undefined, { onSuccess: setCodes })}
							>
								{factors.recovery_codes === 0 ? 'Make recovery codes' : 'Make new recovery codes'}
							</Button>
						</Stack>
					)}
				</>
			)}

			<Confirm
				open={removing}
				onOpenChange={setRemoving}
				onConfirm={() => {
					removeApp.mutate()

					setRemoving(false)
				}}
				title="Remove the authenticator app?"
				description="Its codes stop working when you remove it."
				confirm={{ label: 'Remove', color: 'red' }}
			/>
		</Stack>
	)
}
